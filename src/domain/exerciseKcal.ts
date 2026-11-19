/**
 * kcal de un entreno. Se usa el MET (gasto respecto al reposo) del Compendio
 * de Actividades Físicas: unos 4 de media para las pesas contando los
 * descansos entre series y unos 7 para el cardio en máquina (bici, elíptica,
 * remo) a ritmo moderado.
 *
 * Igual que con los pasos, se cuentan solo las kcal EXTRA (MET − 1): las de
 * estar en reposo ya están en tu metabolismo basal.
 *
 * El cardio que da pasos (cinta, correr, caminar) no suma aquí: esos pasos ya
 * los cuenta el móvil o el reloj, y sus kcal salen en la línea de Pasos.
 */
export const STRENGTH_MET = 4;
export const CARDIO_MACHINE_MET = 7;

/** Un entreno olvidado abierto toda la noche no puede sumar miles de kcal. */
export const MAX_COUNTED_HOURS = 3;

/** kcal netas de pesas: (MET − 1) × kg × horas. */
export function strengthWorkoutKcal(durationMs: number, weightKg: number): number {
  if (!(durationMs > 0) || !(weightKg > 0)) return 0;
  const hours = Math.min(durationMs / 3_600_000, MAX_COUNTED_HOURS);
  return Math.round((STRENGTH_MET - 1) * weightKg * hours);
}

type KcalWorkout = {
  startedAt: number;
  endedAt: number | null;
  /** Segundos de cardio que ya cuentan los pasos. */
  cardioStepsS?: number;
  /** Segundos de cardio en máquina (sin pasos). */
  cardioMachineS?: number;
};

/** kcal netas de un entreno: pesas por el tiempo restante y cardio en máquina por el suyo. */
export function workoutKcal(w: KcalWorkout, weightKg: number): number {
  if (!w.endedAt || !(weightKg > 0)) return 0;
  const total = Math.max(0, w.endedAt - w.startedAt);
  const stepsMs = Math.max(0, w.cardioStepsS ?? 0) * 1000;
  const machineMs = Math.max(0, w.cardioMachineS ?? 0) * 1000;
  // El cardio no puede durar más que el entreno (a veces se apunta mal en Hevy).
  const cardioMs = Math.min(total, stepsMs + machineMs);
  const machineShare = stepsMs + machineMs > 0 ? (cardioMs * machineMs) / (stepsMs + machineMs) : 0;
  const machineHours = Math.min(machineShare / 3_600_000, MAX_COUNTED_HOURS);
  const machine = Math.round((CARDIO_MACHINE_MET - 1) * weightKg * machineHours);
  return strengthWorkoutKcal(total - cardioMs, weightKg) + machine;
}

/** Suma de las kcal de los entrenos terminados de un día. */
export function workoutsKcal(workouts: readonly KcalWorkout[], weightKg: number): number {
  return workouts.reduce((sum, w) => sum + workoutKcal(w, weightKg), 0);
}
