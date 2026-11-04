import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { BackupError, type ImportResult } from '@/data/backup/backup';
import { getRepositories } from '@/data/repositories';
import { todayLocalDate } from '@/domain/localDay';

/** Guarda la copia en un archivo JSON y abre la hoja de compartir (AirDrop, Archivos, correo…). */
export async function exportToFile(): Promise<void> {
  const backup = await getRepositories().data.exportAll();
  const file = new File(Paths.cache, `guillem-fitness-${todayLocalDate()}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(backup));
  if (!(await Sharing.isAvailableAsync())) throw new Error('Este dispositivo no permite compartir archivos.');
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Copia de Guillem Fitness' });
}

/** Elige un archivo JSON y lo importa. null si se cancela. */
export async function importFromFile(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  const text = await new File(asset.uri).text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('El archivo no es un JSON válido.');
  }
  return getRepositories().data.importAll(data);
}
