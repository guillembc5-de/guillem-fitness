import type { SetType } from '../enums';

/**
 * Un entreno de Hevy, venga del archivo exportado (CSV) o de su API.
 * Pesos en kg, distancias en metros y tiempos en segundos.
 */
export type HevySet = {
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  distanceM: number | null;
  durationS: number | null;
  rpe: number | null;
};

export type HevyExercise = {
  /** Nombre tal y como sale en Hevy (en el idioma de la app). */
  title: string;
  /** Id de la plantilla de Hevy (solo por la API; el CSV no lo trae). */
  templateId: string | null;
  notes: string | null;
  /** Ejercicios con la misma clave forman una superserie. */
  supersetKey: string | null;
  sets: HevySet[];
};

export type HevyWorkout = {
  title: string;
  startedAt: number;
  endedAt: number;
  description: string | null;
  exercises: HevyExercise[];
};

export type HevyParseResult = {
  workouts: HevyWorkout[];
  /** Filas que no se pudieron leer (fecha rara, serie vacía…). */
  skippedRows: number;
};
