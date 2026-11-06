import type { Equipment, MuscleGroup, SetType, TrackingType } from './enums';
import type { SyncMeta } from './types';

export type Exercise = SyncMeta & {
  name: string;
  searchName: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  trackingType: TrackingType;
  defaultRestSeconds: number | null;
  isCustom: boolean;
  notes: string | null;
};

export type ExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  trackingType: TrackingType;
  defaultRestSeconds: number | null;
  notes: string | null;
};

export type Routine = SyncMeta & {
  name: string;
  position: number;
  notes: string | null;
  /** Carpeta (null = sin carpeta). */
  folderId: string | null;
};

export type RoutineFolder = SyncMeta & { name: string; position: number };

export type RoutineSummary = Routine & {
  exerciseNames: string[];
};

export type RoutineSetTemplate = {
  id: string;
  position: number;
  setType: SetType;
  targetWeightKg: number | null;
  targetReps: number | null;
  targetDurationS: number | null;
};

export type RoutineExerciseDetail = {
  id: string;
  exercise: Exercise;
  position: number;
  restSeconds: number | null;
  notes: string | null;
  supersetId: string | null;
  sets: RoutineSetTemplate[];
};

export type RoutineDetail = Routine & { exercises: RoutineExerciseDetail[] };

/** Contenido completo de una rutina tal y como lo edita el editor. */
export type RoutineDraft = {
  name: string;
  notes: string | null;
  exercises: {
    exerciseId: string;
    restSeconds: number | null;
    notes: string | null;
    supersetId: string | null;
    sets: Omit<RoutineSetTemplate, 'id' | 'position'>[];
  }[];
};

export type WorkoutSet = SyncMeta & {
  workoutExerciseId: string;
  position: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  /** Esfuerzo percibido (6–10). */
  rpe: number | null;
  completedAt: number | null;
};

export type WorkoutExercise = SyncMeta & {
  workoutId: string;
  exerciseId: string;
  exerciseNameSnapshot: string;
  trackingType: TrackingType;
  equipment: Equipment;
  /** Nota fija del ejercicio (se ve cada vez que lo haces). */
  exerciseNote: string | null;
  position: number;
  restSeconds: number;
  /** Nota de este ejercicio en este entreno. */
  notes: string | null;
  supersetId: string | null;
  sets: WorkoutSet[];
};

export type Workout = SyncMeta & {
  routineId: string | null;
  name: string;
  startedAt: number;
  endedAt: number | null;
  localDate: string;
  restEndsAt: number | null;
  restNotificationId: string | null;
  notes: string | null;
  isDemo: boolean;
};

export type WorkoutDetail = Workout & { exercises: WorkoutExercise[] };

export type WorkoutSummary = Workout & {
  exerciseCount: number;
  setCount: number;
  volume: number;
};

/** Una serie completada del historial de un ejercicio. */
export type ExerciseHistorySet = {
  workoutId: string;
  workoutName: string;
  startedAt: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  durationS: number | null;
  completedAt: number | null;
  position: number;
};

export type SetPatch = Partial<Pick<WorkoutSet, 'setType' | 'weightKg' | 'reps' | 'durationS' | 'rpe'>>;

/** Datos editables de un entreno ya terminado. */
export type WorkoutDetailsPatch = { name: string; notes: string | null; startedAt: number; endedAt: number };

/** Cifras de un periodo para las estadísticas. */
export type MuscleSetCount = { muscleGroup: MuscleGroup; sets: number };
