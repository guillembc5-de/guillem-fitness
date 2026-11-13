import type { LocalDate } from './localDay';
import type { SyncMeta } from './types';

/** De dónde llegan los datos de Fitness. */
export type FitnessSource = 'healthkit' | 'shortcut';

/** Anillos de un día según la app Fitness (Apple Watch o iPhone). */
export type ActivityDay = SyncMeta & {
  localDate: LocalDate;
  /** Energía activa en kcal (anillo Moverse). null = no llegó. */
  activeKcal: number | null;
  /** Minutos de ejercicio (anillo Ejercicio). null = no llegó. */
  exerciseMin: number | null;
  source: FitnessSource;
};

/** Datos de un día tal y como llegan (lo que falte no se toca). */
export type IncomingActivityDay = {
  localDate: LocalDate;
  activeKcal?: number | null;
  exerciseMin?: number | null;
  source: FitnessSource;
};

/** Entreno registrado en Salud por el Watch u otra app. */
export type ExternalWorkout = SyncMeta & {
  externalId: string;
  localDate: LocalDate;
  startedAt: number;
  endedAt: number;
  /** HKWorkoutActivityType. */
  activityType: number;
  durationS: number;
  kcal: number | null;
  distanceM: number | null;
  sourceName: string | null;
};

export type IncomingExternalWorkout = Omit<ExternalWorkout, keyof SyncMeta>;
