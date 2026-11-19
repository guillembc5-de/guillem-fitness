import { and, asc, desc, eq, isNotNull, isNull } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { exercise, routineExercise, workout, workoutExercise, workoutSet } from '@/data/db/schema';
import { normalizeSearch } from '@/domain/text';
import type { Exercise, ExerciseHistorySet, ExerciseInput } from '@/domain/workoutTypes';
import { newId, now } from '@/lib/ids';

import type { ExerciseRepository } from '../interfaces';
import { newMeta, toExercise } from './mappers';

export class SqliteExerciseRepository implements ExerciseRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<Exercise[]> {
    const rows = this.db.select().from(exercise).where(isNull(exercise.deletedAt)).orderBy(asc(exercise.searchName)).all();
    return rows.map(toExercise);
  }

  async get(id: string): Promise<Exercise | null> {
    // Incluye borrados: el historial y las gráficas siguen funcionando.
    const row = this.db.select().from(exercise).where(eq(exercise.id, id)).get();
    return row ? toExercise(row) : null;
  }

  async create(input: ExerciseInput): Promise<Exercise> {
    const timestamp = now();
    const row = {
      ...newMeta(newId(), timestamp),
      name: input.name.trim(),
      searchName: normalizeSearch(input.name),
      muscleGroup: input.muscleGroup,
      secondaryMuscles: '[]',
      equipment: input.equipment,
      trackingType: input.trackingType,
      defaultRestSeconds: input.defaultRestSeconds,
      isCustom: true,
      notes: input.notes,
      cardioKind: input.cardioKind ?? null,
    };
    this.db.insert(exercise).values(row).run();
    return toExercise(row);
  }

  async update(id: string, input: ExerciseInput): Promise<void> {
    this.db
      .update(exercise)
      .set({
        name: input.name.trim(),
        searchName: normalizeSearch(input.name),
        muscleGroup: input.muscleGroup,
        equipment: input.equipment,
        trackingType: input.trackingType,
        defaultRestSeconds: input.defaultRestSeconds,
        notes: input.notes,
        updatedAt: now(),
      })
      .where(eq(exercise.id, id))
      .run();
  }

  async setDefaultRest(id: string, seconds: number | null): Promise<void> {
    this.db.update(exercise).set({ defaultRestSeconds: seconds, updatedAt: now() }).where(eq(exercise.id, id)).run();
  }

  /**
   * Borrado suave: desaparece de la biblioteca y de las rutinas, pero los
   * entrenos pasados conservan su nombre y sus series.
   */
  async softDelete(id: string): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      tx.update(exercise).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(exercise.id, id)).run();
      tx.update(routineExercise)
        .set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(and(eq(routineExercise.exerciseId, id), isNull(routineExercise.deletedAt)))
        .run();
    });
  }

  async history(exerciseId: string): Promise<ExerciseHistorySet[]> {
    return this.db
      .select({
        workoutId: workout.id,
        workoutName: workout.name,
        startedAt: workout.startedAt,
        setType: workoutSet.setType,
        weightKg: workoutSet.weightKg,
        reps: workoutSet.reps,
        durationS: workoutSet.durationS,
        distanceM: workoutSet.distanceM,
        completedAt: workoutSet.completedAt,
        position: workoutSet.position,
      })
      .from(workoutSet)
      .innerJoin(workoutExercise, eq(workoutSet.workoutExerciseId, workoutExercise.id))
      .innerJoin(workout, eq(workoutExercise.workoutId, workout.id))
      .where(
        and(
          eq(workoutExercise.exerciseId, exerciseId),
          isNull(workoutSet.deletedAt),
          isNull(workoutExercise.deletedAt),
          isNull(workout.deletedAt),
          isNotNull(workout.endedAt),
          isNotNull(workoutSet.completedAt),
        ),
      )
      .orderBy(desc(workout.startedAt), asc(workoutExercise.position), asc(workoutSet.position))
      .all();
  }
}
