/**
 * kcal de un entreno de fuerza. Se usa el MET (gasto respecto al reposo) del
 * Compendio de Actividades Físicas para el entrenamiento con pesas, unos 4 de
 * media contando los descansos entre series.
 *
 * Igual que con los pasos, se cuentan solo las kcal EXTRA (MET − 1): la de
 * estar en reposo ya está en tu metabolismo basal, así no se cuentan dos veces.
 */
export const STRENGTH_MET = 4;

/** Un entreno olvidado abierto toda la noche no puede sumar miles de kcal. */
export const MAX_COUNTED_HOURS = 3;

/** kcal netas de un entreno: (MET − 1) × kg × horas. */
export function strengthWorkoutKcal(durationMs: number, weightKg: number): number {
  if (!(durationMs > 0) || !(weightKg > 0)) return 0;
  const hours = Math.min(durationMs / 3_600_000, MAX_COUNTED_HOURS);
  return Math.round((STRENGTH_MET - 1) * weightKg * hours);
}

/** Suma de las kcal de los entrenos terminados de un día. */
export function workoutsKcal(workouts: readonly { startedAt: number; endedAt: number | null }[], weightKg: number): number {
  return workouts.reduce((sum, w) => sum + (w.endedAt ? strengthWorkoutKcal(w.endedAt - w.startedAt, weightKg) : 0), 0);
}
