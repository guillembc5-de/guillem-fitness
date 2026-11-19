/** Enumeraciones compartidas por el esquema y la lógica de cada módulo. */

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'adductors',
  'abductors',
  'calves',
  'abs',
  'lower_back',
  'traps',
  'full_body',
  'cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'plate_machine',
  'cable',
  'smith',
  'kettlebell',
  'band',
  'bodyweight',
  'other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/**
 * Cómo se registra un ejercicio:
 * - weight_reps: kg × reps
 * - added_weight_reps: lastre (+kg) × reps, como la hiperextensión con peso
 * - reps_only: solo repeticiones
 * - duration: segundos (plancha)
 * - distance_duration: km y tiempo (cinta, bici, correr), como el cardio de Hevy
 */
export const TRACKING_TYPES = ['weight_reps', 'added_weight_reps', 'reps_only', 'duration', 'distance_duration'] as const;
export type TrackingType = (typeof TRACKING_TYPES)[number];

export const SET_TYPES = ['normal', 'warmup', 'dropset', 'failure'] as const;
export type SetType = (typeof SET_TYPES)[number];

export const STEP_SOURCES = ['healthkit', 'health_connect', 'pedometer', 'demo'] as const;
export type StepSource = (typeof STEP_SOURCES)[number];

export const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_SOURCES = ['photo', 'manual'] as const;
export type MealSource = (typeof MEAL_SOURCES)[number];

export const PENDING_STATUSES = ['pending', 'failed'] as const;
export type PendingStatus = (typeof PENDING_STATUSES)[number];

/**
 * Cardio que ya cuentan los pasos (cinta, correr, caminar: el móvil o el reloj
 * cuentan esos pasos) o que no (bici, elíptica, remo). Sirve para no sumar dos
 * veces las kcal de un mismo esfuerzo.
 */
export const CARDIO_KINDS = ['steps', 'machine'] as const;
export type CardioKind = (typeof CARDIO_KINDS)[number];
