import { exercise, routine, workout, workoutSet } from '@/data/db/schema';
import { MUSCLE_GROUPS, type MuscleGroup } from '@/domain/enums';
import type { Exercise, Routine, Workout, WorkoutSet } from '@/domain/workoutTypes';

function parseMuscles(json: string): MuscleGroup[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((m): m is MuscleGroup => typeof m === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(m));
}

export function toExercise(row: typeof exercise.$inferSelect): Exercise {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    name: row.name,
    searchName: row.searchName,
    muscleGroup: row.muscleGroup,
    secondaryMuscles: parseMuscles(row.secondaryMuscles),
    equipment: row.equipment,
    trackingType: row.trackingType,
    defaultRestSeconds: row.defaultRestSeconds,
    isCustom: row.isCustom,
    notes: row.notes,
    cardioKind: row.cardioKind,
  };
}

export function toRoutine(row: typeof routine.$inferSelect): Routine {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    name: row.name,
    position: row.position,
    notes: row.notes,
    folderId: row.folderId,
  };
}

export function toWorkout(row: typeof workout.$inferSelect): Workout {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    routineId: row.routineId,
    name: row.name,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    localDate: row.localDate,
    restEndsAt: row.restEndsAt,
    restNotificationId: row.restNotificationId,
    notes: row.notes,
    isDemo: row.isDemo,
    externalId: row.externalId,
  };
}

export function toWorkoutSet(row: typeof workoutSet.$inferSelect): WorkoutSet {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    workoutExerciseId: row.workoutExerciseId,
    position: row.position,
    setType: row.setType,
    weightKg: row.weightKg,
    reps: row.reps,
    durationS: row.durationS,
    distanceM: row.distanceM,
    rpe: row.rpe,
    completedAt: row.completedAt,
  };
}

/** Columnas de alta para una fila nueva. */
export function newMeta(id: string, timestamp: number) {
  return { id, createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
}
