import { addDays, startOfWeek, todayLocalDate, type LocalDate } from './localDay';
import type { SetType } from './enums';

type WorkoutLike = { localDate: LocalDate; startedAt: number; endedAt: number | null; volume: number; setCount: number };

/**
 * Racha semanal (como en Hevy): cuántas semanas seguidas, de lunes a domingo,
 * tienen al menos un entreno. La semana en curso cuenta si ya entrenaste;
 * si aún no, no rompe la racha.
 */
export function weeklyStreak(workoutDates: readonly LocalDate[], now: number = Date.now()): number {
  const weeks = new Set(workoutDates.map((d) => startOfWeek(d)));
  let week = startOfWeek(todayLocalDate(now));
  if (!weeks.has(week)) week = addDays(week, -7);
  let streak = 0;
  while (weeks.has(week)) {
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

export type WeekTotals = { weekStart: LocalDate; workouts: number; volume: number; sets: number; minutes: number };

/** Totales de las últimas `count` semanas (de la más antigua a la actual). */
export function weeklyTotals(workouts: readonly WorkoutLike[], count: number, now: number = Date.now()): WeekTotals[] {
  const current = startOfWeek(todayLocalDate(now));
  const weeks: WeekTotals[] = [];
  for (let i = count - 1; i >= 0; i--) weeks.push({ weekStart: addDays(current, -7 * i), workouts: 0, volume: 0, sets: 0, minutes: 0 });
  const byStart = new Map(weeks.map((w) => [w.weekStart, w]));
  for (const w of workouts) {
    const bucket = byStart.get(startOfWeek(w.localDate));
    if (!bucket) continue;
    bucket.workouts += 1;
    bucket.volume += w.volume;
    bucket.sets += w.setCount;
    if (w.endedAt) bucket.minutes += Math.round((w.endedAt - w.startedAt) / 60_000);
  }
  return weeks;
}

type PlanExercise = { exerciseId: string; supersetId: string | null; sets: readonly { setType: SetType }[] };

/**
 * ¿Ha cambiado la estructura respecto a la rutina? (ejercicios, orden,
 * superseries, número y tipo de series). Si cambió, se ofrece actualizarla.
 * Los pesos y repeticiones no cuentan: cambian en cada entreno.
 */
export function structureChanged(routine: readonly PlanExercise[], workout: readonly PlanExercise[]): boolean {
  if (routine.length !== workout.length) return true;
  const groups = (list: readonly PlanExercise[]) => {
    const ids = new Map<string, number>();
    return list.map((e) => (e.supersetId ? (ids.get(e.supersetId) ?? ids.set(e.supersetId, ids.size).size - 1) : -1));
  };
  const ga = groups(routine);
  const gb = groups(workout);
  return routine.some((r, i) => {
    const w = workout[i];
    if (!w || r.exerciseId !== w.exerciseId || ga[i] !== gb[i] || r.sets.length !== w.sets.length) return true;
    return r.sets.some((s, j) => s.setType !== w.sets[j]?.setType);
  });
}
