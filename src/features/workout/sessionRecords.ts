import { EMPTY_BESTS, RECORD_LABELS, recordsInSession, type ExerciseBests, type RecordKind } from '@/domain/workout';
import type { WorkoutDetail, WorkoutSet } from '@/domain/workoutTypes';

export type SessionRecord = { exerciseName: string; set: WorkoutSet; kinds: RecordKind[] };

/** Récords batidos en un entreno, comparando con el historial anterior. */
export function sessionRecords(workout: WorkoutDetail, bests: Record<string, ExerciseBests>): SessionRecord[] {
  const result: SessionRecord[] = [];
  for (const we of workout.exercises) {
    const perSet = recordsInSession(we.sets, bests[we.exerciseId] ?? EMPTY_BESTS);
    we.sets.forEach((set, i) => {
      const kinds = perSet[i] ?? [];
      if (kinds.length > 0) result.push({ exerciseName: we.exerciseNameSnapshot, set, kinds });
    });
  }
  return result;
}

export function recordKindsText(kinds: readonly RecordKind[]): string {
  return kinds.map((k) => RECORD_LABELS[k]).join(' · ');
}
