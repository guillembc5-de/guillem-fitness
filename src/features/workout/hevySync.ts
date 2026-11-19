import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import Storage from 'expo-sqlite/kv-store';

import { getRepositories } from '@/data/repositories';
import { parseHevyApiPage } from '@/domain/hevy/hevyApi';
import { parseHevyCsv } from '@/domain/hevy/hevyCsv';
import type { HevyParseResult, HevyWorkout } from '@/domain/hevy/hevyTypes';
import { getHevyKey } from '@/lib/secrets';

import { previewHevyImport, runHevyImport, type HevyImportResult, type HevyPreview } from './hevyImport';

/**
 * Las dos formas de traer tus entrenos de Hevy:
 * - Archivo (gratis): Hevy → Ajustes → Exportar entrenos, y aquí «Elegir archivo».
 * - API (solo con Hevy Pro, de pago): con tu clave, se sincroniza sola.
 */

const PREFS = {
  updateRoutines: 'hevy.updateRoutines',
  lastSync: 'hevy.lastSync',
} as const;

export function getUpdateRoutines(): boolean {
  return Storage.getItemSync(PREFS.updateRoutines) !== '0';
}

export function setUpdateRoutines(value: boolean): void {
  Storage.setItemSync(PREFS.updateRoutines, value ? '1' : '0');
}

export type LastSync = { at: number; source: 'file' | 'api'; inserted: number; updated: number };

export function getLastSync(): LastSync | null {
  try {
    const raw = Storage.getItemSync(PREFS.lastSync);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<LastSync>;
    if (typeof v.at !== 'number' || (v.source !== 'file' && v.source !== 'api')) return null;
    return { at: v.at, source: v.source, inserted: Number(v.inserted) || 0, updated: Number(v.updated) || 0 };
  } catch {
    return null;
  }
}

function saveLastSync(source: LastSync['source'], result: HevyImportResult): void {
  Storage.setItemSync(PREFS.lastSync, JSON.stringify({ at: Date.now(), source, inserted: result.inserted, updated: result.updated }));
}

/** Elige el archivo exportado de Hevy y lo prepara (sin guardar nada). null si se cancela. */
export async function pickHevyFile(): Promise<HevyPreview | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'public.comma-separated-values-text', 'public.plain-text', '*/*'],
    copyToCacheDirectory: true,
  });
  const asset = picked.canceled ? undefined : picked.assets[0];
  if (!asset) return null;
  if (/\.zip$/i.test(asset.name)) {
    throw new Error('Es un .zip. Ábrelo en la app Archivos (tócalo y se descomprime) y elige el .csv que hay dentro.');
  }
  const parsed = parseHevyCsv(await new File(asset.uri).text());
  if (parsed.workouts.length === 0) throw new Error('El archivo no tiene entrenos.');
  return previewHevyImport(parsed, getRepositories());
}

export async function importHevyPreview(preview: HevyPreview, source: LastSync['source'] = 'file'): Promise<HevyImportResult> {
  const result = await runHevyImport(preview, { updateRoutines: getUpdateRoutines() }, getRepositories());
  saveLastSync(source, result);
  return result;
}

const API = 'https://api.hevyapp.com/v1/workouts';

/** Lee tus entrenos de la API de Hevy (10 por página, de más nuevo a más antiguo). */
async function fetchHevyWorkouts(apiKey: string, maxPages: number): Promise<HevyParseResult> {
  const workouts: HevyWorkout[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch(`${API}?page=${page}&pageSize=10`, { headers: { 'api-key': apiKey, accept: 'application/json' }, signal: controller.signal });
    } catch {
      throw new Error('Sin conexión con Hevy. Inténtalo más tarde.');
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Hevy no acepta la clave. La API solo funciona con Hevy Pro y una clave de hevy.com → Ajustes → Desarrollador.');
    }
    if (response.status === 404 && page > 1) break;
    if (!response.ok) throw new Error(`Hevy respondió con un error (${response.status}).`);
    const parsed = parseHevyApiPage(await response.json());
    workouts.push(...parsed.workouts);
    if (page >= parsed.pageCount) break;
  }
  return { workouts, skippedRows: 0 };
}

/**
 * Sincroniza por la API (Hevy Pro). `full` lee todo el historial; si no, los
 * 20 entrenos más recientes (basta para el día a día).
 */
export async function syncHevyApi(full: boolean): Promise<HevyImportResult | null> {
  const key = await getHevyKey();
  if (!key) return null;
  const parsed = await fetchHevyWorkouts(key, full ? 60 : 2);
  const preview = await previewHevyImport(parsed, getRepositories());
  return importHevyPreview(preview, 'api');
}

/** Sincronización automática al abrir Entreno: como mucho una vez cada 15 minutos. */
export async function autoSyncHevy(): Promise<HevyImportResult | null> {
  const last = getLastSync();
  if (last?.source === 'api' && Date.now() - last.at < 15 * 60_000) return null;
  try {
    return await syncHevyApi(false);
  } catch {
    return null;
  }
}
