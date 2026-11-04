import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, max, ne, sql } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { exercise, workout, workoutExercise, workoutSet } from '@/data/db/schema';
import { toLocalDate } from '@/domain/localDay';
import { computeBests, matchPreviousSets, type ExerciseBests } from '@/domain/workout';
import type { SetPatch, WorkoutDetail, WorkoutSet, WorkoutSummary } from '@/domain/workoutTypes';
import { newId, now } from '@/lib/ids';

import type { StartWorkoutParams, WorkoutRepository } from '../interfaces';
import { newMeta, toWorkout, toWorkoutSet } from './mappers';
import { SqliteRoutineRepository } from './routineRepository';

/** Condición «la fila del entreno es válida para el historial». */
const finishedWorkout = and(isNull(workout.deletedAt), isNotNull(workout.endedAt));

export class SqliteWorkoutRepository implements WorkoutRepository {
  private readonly routines: SqliteRoutineRepository;

  constructor(private readonly db: Db) {
    this.routines = new SqliteRoutineRepository(db);
  }

  async getActive(): Promise<WorkoutDetail | null> {
    const row = this.db
      .select()
      .from(workout)
      .where(and(isNull(workout.endedAt), isNull(workout.deletedAt)))
      .orderBy(desc(workout.startedAt))
      .get();
    return row ? this.detail(row.id) : null;
  }

  async get(id: string): Promise<WorkoutDetail | null> {
    return this.detail(id);
  }

  async list(): Promise<WorkoutSummary[]> {
    const rows = this.db
      .select({
        w: workout,
        exerciseCount: sql<number>`count(distinct ${workoutExercise.id})`,
        setCount: sql<number>`count(${workoutSet.id})`,
        volume: sql<number>`coalesce(sum(case when ${workoutSet.setType} = 'normal' and ${workoutSet.reps} >= 1 then coalesce(${workoutSet.weightKg}, 0) * ${workoutSet.reps} else 0 end), 0)`,
      })
      .from(workout)
      .leftJoin(workoutExercise, and(eq(workoutExercise.workoutId, workout.id), isNull(workoutExercise.deletedAt)))
      .leftJoin(
        workoutSet,
        and(eq(workoutSet.workoutExerciseId, workoutExercise.id), isNull(workoutSet.deletedAt), isNotNull(workoutSet.completedAt)),
      )
      .where(finishedWorkout)
      .groupBy(workout.id)
      .orderBy(desc(workout.startedAt))
      .all();
    return rows.map((r) => ({ ...toWorkout(r.w), exerciseCount: r.exerciseCount, setCount: r.setCount, volume: r.volume }));
  }

  async start({ routineId, name, defaultRestSeconds }: StartWorkoutParams): Promise<string> {
    const routineDetail = routineId ? await this.routines.get(routineId) : null;
    const timestamp = now();
    const workoutId = newId();

    // Valores de partida: lo que hiciste la última vez y, si no hay, el objetivo de la rutina.
    const plan = (routineDetail?.exercises ?? []).map((re) => {
      const previous = this.lastSessionSetsSync(re.exercise.id, null);
      const matched = matchPreviousSets(re.sets, previous);
      return {
        exerciseId: re.exercise.id,
        name: re.exercise.name,
        rest: re.restSeconds ?? re.exercise.defaultRestSeconds ?? defaultRestSeconds,
        sets: re.sets.map((s, i) => {
          const prev = matched[i];
          return {
            setType: s.setType,
            weightKg: prev?.weightKg ?? s.targetWeightKg,
            reps: prev?.reps ?? s.targetReps,
            durationS: prev?.durationS ?? s.targetDurationS,
          };
        }),
      };
    });

    this.db.transaction((tx) => {
      tx.insert(workout)
        .values({
          ...newMeta(workoutId, timestamp),
          isDemo: false,
          routineId,
          name,
          startedAt: timestamp,
          endedAt: null,
          localDate: toLocalDate(timestamp),
          restEndsAt: null,
          restNotificationId: null,
          notes: null,
        })
        .run();
      plan.forEach((p, pi) => {
        const weId = newId();
        tx.insert(workoutExercise)
          .values({
            ...newMeta(weId, timestamp),
            workoutId,
            exerciseId: p.exerciseId,
            exerciseNameSnapshot: p.name,
            position: pi,
            restSeconds: p.rest,
            notes: null,
          })
          .run();
        p.sets.forEach((s, si) => {
          tx.insert(workoutSet)
            .values({ ...newMeta(newId(), timestamp), workoutExerciseId: weId, position: si, completedAt: null, ...s })
            .run();
        });
      });
    });
    return workoutId;
  }

  async addExercise(workoutId: string, exerciseId: string, restSeconds: number): Promise<void> {
    const ex = this.db.select().from(exercise).where(eq(exercise.id, exerciseId)).get();
    if (!ex) throw new Error('Ejercicio no encontrado');
    const timestamp = now();
    const position =
      (this.db
        .select({ p: max(workoutExercise.position) })
        .from(workoutExercise)
        .where(and(eq(workoutExercise.workoutId, workoutId), isNull(workoutExercise.deletedAt)))
        .get()?.p ?? -1) + 1;
    const previous = this.lastSessionSetsSync(exerciseId, workoutId).find((s) => s.setType === 'normal');
    const weId = newId();
    this.db.transaction((tx) => {
      tx.insert(workoutExercise)
        .values({
          ...newMeta(weId, timestamp),
          workoutId,
          exerciseId,
          exerciseNameSnapshot: ex.name,
          position,
          restSeconds: ex.defaultRestSeconds ?? restSeconds,
          notes: null,
        })
        .run();
      tx.insert(workoutSet)
        .values({
          ...newMeta(newId(), timestamp),
          workoutExerciseId: weId,
          position: 0,
          setType: 'normal',
          weightKg: previous?.weightKg ?? null,
          reps: previous?.reps ?? null,
          durationS: previous?.durationS ?? null,
          completedAt: null,
        })
        .run();
    });
  }

  async removeExercise(workoutExerciseId: string): Promise<void> {
    const timestamp = now();
    this.db.update(workoutExercise).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(workoutExercise.id, workoutExerciseId)).run();
  }

  async setExerciseRest(workoutExerciseId: string, seconds: number): Promise<void> {
    this.db.update(workoutExercise).set({ restSeconds: seconds, updatedAt: now() }).where(eq(workoutExercise.id, workoutExerciseId)).run();
  }

  async addSet(workoutExerciseId: string): Promise<void> {
    const last = this.db
      .select()
      .from(workoutSet)
      .where(and(eq(workoutSet.workoutExerciseId, workoutExerciseId), isNull(workoutSet.deletedAt)))
      .orderBy(desc(workoutSet.position))
      .get();
    const timestamp = now();
    this.db
      .insert(workoutSet)
      .values({
        ...newMeta(newId(), timestamp),
        workoutExerciseId,
        position: (last?.position ?? -1) + 1,
        setType: 'normal',
        weightKg: last?.weightKg ?? null,
        reps: last?.reps ?? null,
        durationS: last?.durationS ?? null,
        completedAt: null,
      })
      .run();
  }

  async removeSet(setId: string): Promise<void> {
    const timestamp = now();
    this.db.update(workoutSet).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(workoutSet.id, setId)).run();
  }

  async updateSet(setId: string, patch: SetPatch): Promise<void> {
    this.db.update(workoutSet).set({ ...patch, updatedAt: now() }).where(eq(workoutSet.id, setId)).run();
  }

  async completeSet(setId: string, values: SetPatch): Promise<void> {
    const timestamp = now();
    this.db.update(workoutSet).set({ ...values, completedAt: timestamp, updatedAt: timestamp }).where(eq(workoutSet.id, setId)).run();
  }

  async uncompleteSet(setId: string): Promise<void> {
    this.db.update(workoutSet).set({ completedAt: null, updatedAt: now() }).where(eq(workoutSet.id, setId)).run();
  }

  async setRest(workoutId: string, restEndsAt: number | null, notificationId: string | null): Promise<void> {
    this.db
      .update(workout)
      .set({ restEndsAt, restNotificationId: notificationId, updatedAt: now() })
      .where(eq(workout.id, workoutId))
      .run();
  }

  async finish(workoutId: string): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      const exercises = tx
        .select({ id: workoutExercise.id })
        .from(workoutExercise)
        .where(and(eq(workoutExercise.workoutId, workoutId), isNull(workoutExercise.deletedAt)))
        .all()
        .map((r) => r.id);
      if (exercises.length > 0) {
        // Las series sin completar no se guardan en el historial.
        tx.update(workoutSet)
          .set({ deletedAt: timestamp, updatedAt: timestamp })
          .where(and(inArray(workoutSet.workoutExerciseId, exercises), isNull(workoutSet.completedAt), isNull(workoutSet.deletedAt)))
          .run();
        const withSets = new Set(
          tx
            .select({ id: workoutSet.workoutExerciseId })
            .from(workoutSet)
            .where(and(inArray(workoutSet.workoutExerciseId, exercises), isNull(workoutSet.deletedAt)))
            .all()
            .map((r) => r.id),
        );
        const empty = exercises.filter((id) => !withSets.has(id));
        if (empty.length > 0) {
          tx.update(workoutExercise).set({ deletedAt: timestamp, updatedAt: timestamp }).where(inArray(workoutExercise.id, empty)).run();
        }
      }
      tx.update(workout)
        .set({ endedAt: timestamp, restEndsAt: null, restNotificationId: null, updatedAt: timestamp })
        .where(eq(workout.id, workoutId))
        .run();
    });
  }

  async softDelete(workoutId: string): Promise<void> {
    const timestamp = now();
    this.db
      .update(workout)
      .set({ deletedAt: timestamp, updatedAt: timestamp, restEndsAt: null, restNotificationId: null })
      .where(eq(workout.id, workoutId))
      .run();
  }

  async lastSessionSets(exerciseId: string, excludeWorkoutId: string | null): Promise<WorkoutSet[]> {
    return this.lastSessionSetsSync(exerciseId, excludeWorkoutId);
  }

  async historyBests(
    exerciseIds: readonly string[],
    excludeWorkoutId: string | null,
    beforeStartedAt?: number,
  ): Promise<Record<string, ExerciseBests>> {
    if (exerciseIds.length === 0) return {};
    const rows = this.db
      .select({
        exerciseId: workoutExercise.exerciseId,
        setType: workoutSet.setType,
        weightKg: workoutSet.weightKg,
        reps: workoutSet.reps,
        completedAt: workoutSet.completedAt,
      })
      .from(workoutSet)
      .innerJoin(workoutExercise, eq(workoutSet.workoutExerciseId, workoutExercise.id))
      .innerJoin(workout, eq(workoutExercise.workoutId, workout.id))
      .where(
        and(
          inArray(workoutExercise.exerciseId, [...exerciseIds]),
          isNull(workoutSet.deletedAt),
          isNull(workoutExercise.deletedAt),
          finishedWorkout,
          isNotNull(workoutSet.completedAt),
          excludeWorkoutId ? ne(workout.id, excludeWorkoutId) : undefined,
          beforeStartedAt !== undefined ? lt(workout.startedAt, beforeStartedAt) : undefined,
        ),
      )
      .all();
    const result: Record<string, ExerciseBests> = {};
    for (const id of exerciseIds) result[id] = computeBests(rows.filter((r) => r.exerciseId === id));
    return result;
  }

  /** Series del último entreno terminado que incluye el ejercicio. */
  private lastSessionSetsSync(exerciseId: string, excludeWorkoutId: string | null): WorkoutSet[] {
    const last = this.db
      .select({ weId: workoutExercise.id })
      .from(workoutExercise)
      .innerJoin(workout, eq(workoutExercise.workoutId, workout.id))
      .where(
        and(
          eq(workoutExercise.exerciseId, exerciseId),
          isNull(workoutExercise.deletedAt),
          finishedWorkout,
          excludeWorkoutId ? ne(workout.id, excludeWorkoutId) : undefined,
        ),
      )
      .orderBy(desc(workout.startedAt), desc(workoutExercise.position))
      .get();
    if (!last) return [];
    return this.db
      .select()
      .from(workoutSet)
      .where(and(eq(workoutSet.workoutExerciseId, last.weId), isNull(workoutSet.deletedAt), isNotNull(workoutSet.completedAt)))
      .orderBy(asc(workoutSet.position))
      .all()
      .map(toWorkoutSet);
  }

  private detail(id: string): WorkoutDetail | null {
    const row = this.db.select().from(workout).where(and(eq(workout.id, id), isNull(workout.deletedAt))).get();
    if (!row) return null;
    const exercises = this.db
      .select({ we: workoutExercise, trackingType: exercise.trackingType })
      .from(workoutExercise)
      .innerJoin(exercise, eq(workoutExercise.exerciseId, exercise.id))
      .where(and(eq(workoutExercise.workoutId, id), isNull(workoutExercise.deletedAt)))
      .orderBy(asc(workoutExercise.position))
      .all();
    const sets =
      exercises.length === 0
        ? []
        : this.db
            .select()
            .from(workoutSet)
            .where(and(inArray(workoutSet.workoutExerciseId, exercises.map((e) => e.we.id)), isNull(workoutSet.deletedAt)))
            .orderBy(asc(workoutSet.position))
            .all()
            .map(toWorkoutSet);
    return {
      ...toWorkout(row),
      exercises: exercises.map(({ we, trackingType }) => ({
        id: we.id,
        createdAt: we.createdAt,
        updatedAt: we.updatedAt,
        deletedAt: we.deletedAt,
        workoutId: we.workoutId,
        exerciseId: we.exerciseId,
        exerciseNameSnapshot: we.exerciseNameSnapshot,
        trackingType,
        position: we.position,
        restSeconds: we.restSeconds,
        notes: we.notes,
        sets: sets.filter((s) => s.workoutExerciseId === we.id),
      })),
    };
  }
}
