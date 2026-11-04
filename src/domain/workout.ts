import type { SetType } from './enums';

/** Lo mínimo de una serie que necesita la lógica de entreno. */
export type SetLike = {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  completedAt: number | null;
};

/**
 * 1RM estimado con la fórmula de Epley: peso × (1 + reps / 30).
 * Con 1 repetición, el 1RM es el propio peso. Sin reps o sin peso → 0.
 */
export function epley1RM(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps >= 1)) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/**
 * Serie que cuenta para volumen y récords: completada, normal (no
 * calentamiento) y con al menos 1 repetición.
 */
export function isWorkingSet(set: SetLike): boolean {
  return set.completedAt !== null && set.setType === 'normal' && (set.reps ?? 0) >= 1;
}

/** Volumen de una serie: peso × reps (0 si no hay peso). */
export function setVolume(set: SetLike): number {
  if (!isWorkingSet(set)) return 0;
  return (set.weightKg ?? 0) * (set.reps ?? 0);
}

/** Volumen total: suma de peso × reps de las series de trabajo. */
export function totalVolume(sets: readonly SetLike[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0);
}

export type ExerciseBests = {
  /** Peso máximo levantado en una serie de trabajo. */
  maxWeight: number | null;
  /** Mejor 1RM estimado. */
  best1RM: number | null;
  /** Mejor volumen en una sola serie. */
  bestSetVolume: number | null;
  /** Más repeticiones en una serie. */
  maxReps: number | null;
};

export const EMPTY_BESTS: ExerciseBests = { maxWeight: null, best1RM: null, bestSetVolume: null, maxReps: null };

function maxOrNull(current: number | null, value: number): number | null {
  if (!(value > 0)) return current;
  return current === null || value > current ? value : current;
}

/** Mejores marcas de un conjunto de series. */
export function computeBests(sets: readonly SetLike[]): ExerciseBests {
  let bests = EMPTY_BESTS;
  for (const set of sets) {
    if (!isWorkingSet(set)) continue;
    const weight = set.weightKg ?? 0;
    const reps = set.reps ?? 0;
    bests = {
      maxWeight: maxOrNull(bests.maxWeight, weight),
      best1RM: maxOrNull(bests.best1RM, epley1RM(weight, reps)),
      bestSetVolume: maxOrNull(bests.bestSetVolume, weight * reps),
      maxReps: maxOrNull(bests.maxReps, reps),
    };
  }
  return bests;
}

export type RecordKind = 'weight' | 'e1rm' | 'volume';

export const RECORD_LABELS: Record<RecordKind, string> = {
  weight: 'Peso máximo',
  e1rm: '1RM estimado',
  volume: 'Volumen en una serie',
};

/** Margen para no marcar récords por errores de redondeo. */
const EPSILON = 1e-6;

/**
 * Récords que bate una serie respecto a las marcas anteriores.
 * La primera vez que se hace un ejercicio no hay récords: sin historial
 * todo sería récord y dejaría de significar algo.
 */
export function recordsForSet(set: SetLike, before: ExerciseBests): RecordKind[] {
  if (!isWorkingSet(set)) return [];
  const weight = set.weightKg ?? 0;
  const reps = set.reps ?? 0;
  const kinds: RecordKind[] = [];
  if (before.maxWeight !== null && weight > before.maxWeight + EPSILON) kinds.push('weight');
  const e1rm = epley1RM(weight, reps);
  if (before.best1RM !== null && e1rm > before.best1RM + EPSILON) kinds.push('e1rm');
  const volume = weight * reps;
  if (before.bestSetVolume !== null && volume > before.bestSetVolume + EPSILON) kinds.push('volume');
  return kinds;
}

/**
 * Récords de un entreno, serie a serie y en orden: cada serie se compara con
 * el historial anterior más las series previas del mismo entreno.
 * Devuelve, por índice de serie, los récords que bate.
 */
export function recordsInSession(sets: readonly SetLike[], historyBests: ExerciseBests): RecordKind[][] {
  let running = historyBests;
  return sets.map((set) => {
    const kinds = recordsForSet(set, running);
    if (isWorkingSet(set)) {
      const merged = computeBests([set]);
      running = {
        maxWeight: running.maxWeight === null ? null : Math.max(running.maxWeight, merged.maxWeight ?? 0),
        best1RM: running.best1RM === null ? null : Math.max(running.best1RM, merged.best1RM ?? 0),
        bestSetVolume: running.bestSetVolume === null ? null : Math.max(running.bestSetVolume, merged.bestSetVolume ?? 0),
        maxReps: running.maxReps === null ? null : Math.max(running.maxReps, merged.maxReps ?? 0),
      };
    }
    return kinds;
  });
}

export type SessionPoint = {
  workoutId: string;
  startedAt: number;
  maxWeight: number;
  best1RM: number;
  volume: number;
};

export type SessionSet = SetLike & { workoutId: string; startedAt: number };

/** Un punto por entreno para las gráficas de un ejercicio (orden cronológico). */
export function sessionPoints(sets: readonly SessionSet[]): SessionPoint[] {
  const byWorkout = new Map<string, { startedAt: number; sets: SetLike[] }>();
  for (const s of sets) {
    const entry = byWorkout.get(s.workoutId) ?? { startedAt: s.startedAt, sets: [] };
    entry.sets.push(s);
    byWorkout.set(s.workoutId, entry);
  }
  const points: SessionPoint[] = [];
  for (const [workoutId, { startedAt, sets: ws }] of byWorkout) {
    const bests = computeBests(ws);
    if (bests.maxReps === null) continue;
    points.push({
      workoutId,
      startedAt,
      maxWeight: bests.maxWeight ?? 0,
      best1RM: bests.best1RM ?? 0,
      volume: totalVolume(ws),
    });
  }
  return points.sort((a, b) => a.startedAt - b.startedAt);
}

/** Número visible de cada serie: 1, 2, 3… para las normales y 0 (se muestra «W») para calentamientos. */
export function setNumbers(sets: readonly { setType: SetType }[]): number[] {
  let normal = 0;
  return sets.map((s) => (s.setType === 'normal' ? ++normal : 0));
}

/**
 * «Anterior»: lo que se hizo la última vez, serie a serie. Empareja por
 * posición dentro de cada tipo (el 1.er calentamiento con el 1.er calentamiento,
 * la 1.ª serie normal con la 1.ª normal).
 */
export function matchPreviousSets<T extends { setType: SetType }, P extends { setType: SetType }>(
  current: readonly T[],
  previous: readonly P[],
): (P | null)[] {
  const prevByType: Record<SetType, P[]> = { normal: [], warmup: [] };
  for (const p of previous) prevByType[p.setType].push(p);
  const seen: Record<SetType, number> = { normal: 0, warmup: 0 };
  return current.map((s) => {
    const index = seen[s.setType]++;
    return prevByType[s.setType][index] ?? null;
  });
}
