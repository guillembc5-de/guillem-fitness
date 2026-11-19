import type { Equipment, MuscleGroup, SetType, TrackingType } from '@/domain/enums';

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazo',
  quads: 'Cuádriceps',
  hamstrings: 'Isquiotibiales',
  glutes: 'Glúteos',
  adductors: 'Aductores',
  abductors: 'Abductores',
  calves: 'Gemelos',
  abs: 'Abdomen',
  lower_back: 'Zona lumbar',
  traps: 'Trapecio',
  full_body: 'Cuerpo completo',
  cardio: 'Cardio',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  plate_machine: 'Máquina de discos',
  cable: 'Polea',
  smith: 'Multipower',
  kettlebell: 'Kettlebell',
  band: 'Banda',
  bodyweight: 'Peso corporal',
  other: 'Otro',
};

export const TRACKING_LABELS: Record<TrackingType, string> = {
  weight_reps: 'Peso y reps',
  added_weight_reps: 'Lastre y reps',
  reps_only: 'Solo reps',
  duration: 'Tiempo',
  distance_duration: 'Distancia y tiempo',
};

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Calentamiento',
  dropset: 'Drop set',
  failure: 'Al fallo',
};

/** Letra que sustituye al número de serie (las normales llevan número). */
export const SET_TYPE_LETTERS: Record<SetType, string | null> = {
  normal: null,
  warmup: 'W',
  dropset: 'D',
  failure: 'F',
};

/** Texto de la serie: «1», «2»… o su letra. */
export function setLabel(setType: SetType, number: number): string {
  return SET_TYPE_LETTERS[setType] ?? String(number);
}

/** Etiqueta corta de la columna de peso según el tipo de ejercicio. */
export function weightColumnLabel(tracking: TrackingType): string | null {
  if (tracking === 'weight_reps') return 'KG';
  if (tracking === 'added_weight_reps') return '+KG';
  return null;
}
