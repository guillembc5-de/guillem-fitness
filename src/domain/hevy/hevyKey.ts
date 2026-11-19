import { normalizeSearch } from '../text';
import type { HevyWorkout } from './hevyTypes';

/**
 * Identificador estable de un entreno de Hevy: minuto de inicio + nombre.
 * Es el mismo venga del archivo (que no trae id) o de la API, así importar
 * dos veces, o por las dos vías, no duplica nada. Si dos entrenos coinciden
 * en minuto y nombre, el segundo lleva «#2».
 */
export function hevyExternalIds(workouts: readonly HevyWorkout[]): string[] {
  const order = workouts.map((w, i) => ({ w, i })).sort((a, b) => a.w.startedAt - b.w.startedAt || a.i - b.i);
  const seen = new Map<string, number>();
  const ids: string[] = new Array<string>(workouts.length);
  for (const { w, i } of order) {
    const base = `hevy:${Math.floor(w.startedAt / 60_000)}|${normalizeSearch(w.title)}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    ids[i] = count === 1 ? base : `${base}#${count}`;
  }
  return ids;
}

/** FNV-1a de 32 bits: huella corta para saber si un entreno cambió. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Huella del contenido. Redondea como el archivo de Hevy (minutos, 2 decimales
 * de kg, 10 m de distancia) para que el CSV y la API den la misma.
 */
export function hevySignature(w: HevyWorkout): string {
  const minute = (ms: number) => Math.floor(ms / 60_000);
  const r = (v: number | null, step: number) => (v === null ? '' : String(Math.round(v / step) * step));
  const body = [
    normalizeSearch(w.title),
    minute(w.startedAt),
    minute(w.endedAt),
    w.description ?? '',
    ...w.exercises.map((e) =>
      [
        normalizeSearch(e.title),
        e.notes ?? '',
        e.supersetKey ? 'ss' : '',
        ...e.sets.map((s) => [s.type, r(s.weightKg, 0.01), r(s.reps, 1), r(s.distanceM, 10), r(s.durationS, 1), r(s.rpe, 0.5)].join(',')),
      ].join(';'),
    ),
  ].join('|');
  return fnv1a(body);
}
