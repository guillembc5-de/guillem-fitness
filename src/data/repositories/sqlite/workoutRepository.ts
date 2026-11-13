import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, max, ne, sql } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { exercise, workout, workoutExercise, workoutSet } from '@/data/db/schema';
import type { MuscleGroup, SetType } from '@/domain/enums';
import { toLocalDate } from '@/domain/localDay';
import { computeBests, matchPreviousSets, type ExerciseBests } from '@/domain/workout';
import type { MuscleSetCount, SetPatch, WorkoutDetail, WorkoutDetailsPatch, WorkoutSet, WorkoutSummary } from '@/domain/workoutTypes';
import { newId, now } from '@/lib/ids';

import type { StartWorkoutParams, WorkoutRepository } from '../interfaces';
import { newMeta, toWorkout, toWorkoutSet } from './mappers';
import { SqliteRoutineRepository } from './routineRepository';

/** Condición «la fila del entreno es válida para el historial». */
const finishedWorkout = and(isNull(workout.deletedAt), isNotNull(workout.endedAt));

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Un ejercicio a crear al empezar un entreno. */
type PlannedExercise = {
  exerciseId: string;
  name: string;
  rest: number;
  notes: string | null;
  supersetId: string | null;
  sets: { setType: SetType; weightKg: number | null; reps: number | null; durationS: number | null }[];
};

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
        volume: sql<number>`coalesce(sum(case when ${workoutSet.setType} != 'warmup' and ${workoutSet.reps} >= 1 then coalesce(${workoutSet.weightKg}, 0) * ${workoutSet.reps} else 0 end), 0)`,
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

  async start({ routineId, name, defaultRestSeconds, previousFrom = 'any' }: StartWorkoutParams): Promise<string> {
    const routineDetail = routineId ? await this.routines.get(routineId) : null;
    // Valores de partida: lo que hiciste la última vez y, si no hay, el objetivo de la rutina.
    const plan: PlannedExercise[] = (routineDetail?.exercises ?? []).map((re) => {
      const previous = this.lastSessionSetsSync(re.exercise.id, null, previousFrom === 'routine' ? routineId : null);
      const matched = matchPreviousSets(re.sets, previous);
      return {
        exerciseId: re.exercise.id,
        name: re.exercise.name,
        rest: re.restSeconds ?? re.exercise.defaultRestSeconds ?? defaultRestSeconds,
        notes: re.notes,
        supersetId: re.supersetId,
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
    return this.createWorkout(routineId, name, plan);
  }

  async repeat(workoutId: string): Promise<string> {
    const source = this.detail(workoutId);
    if (!source) throw new Error('Entreno no encontrado');
    const supersets = new Map<string, string>();
    const plan: PlannedExercise[] = source.exercises.map((e) => {
      let supersetId: string | null = null;
      if (e.supersetId) {
        supersetId = supersets.get(e.supersetId) ?? newId();
        supersets.set(e.supersetId, supersetId);
      }
      return {
        exerciseId: e.exerciseId,
        name: e.exerciseNameSnapshot,
        rest: e.restSeconds,
        notes: e.notes,
        supersetId,
        sets: e.sets.map((s) => ({ setType: s.setType, weightKg: s.weightKg, reps: s.reps, durationS: s.durationS })),
      };
    });
    return this.createWorkout(source.routineId, source.name, plan);
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
    const previous = this.lastSessionSetsSync(exerciseId, workoutId, null).find((s) => s.setType === 'normal');
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
          supersetId: null,
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
          rpe: null,
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

  async setExerciseNotes(workoutExerciseId: string, notes: string | null): Promise<void> {
    const clean = notes?.trim() ? notes.trim() : null;
    this.db.update(workoutExercise).set({ notes: clean, updatedAt: now() }).where(eq(workoutExercise.id, workoutExerciseId)).run();
  }

  async moveExercise(workoutExerciseId: string, delta: -1 | 1): Promise<void> {
    const ids = this.orderedExerciseIds(workoutExerciseId);
    const i = ids.indexOf(workoutExerciseId);
    const j = i + delta;
    const a = ids[i];
    const b = ids[j];
    if (a === undefined || b === undefined) return;
    ids[i] = b;
    ids[j] = a;
    this.writePositions(ids);
  }

  async reorderExercises(workoutId: string, orderedIds: readonly string[]): Promise<void> {
    const current = this.db
      .select({ id: workoutExercise.id })
      .from(workoutExercise)
      .where(and(eq(workoutExercise.workoutId, workoutId), isNull(workoutExercise.deletedAt)))
      .orderBy(asc(workoutExercise.position))
      .all()
      .map((r) => r.id);
    const known = new Set(current);
    const first = [...new Set(orderedIds)].filter((id) => known.has(id));
    const picked = new Set(first);
    this.writePositions([...first, ...current.filter((id) => !picked.has(id))]);
  }

  async replaceExercise(workoutExerciseId: string, exerciseId: string): Promise<void> {
    const ex = this.db.select().from(exercise).where(eq(exercise.id, exerciseId)).get();
    const we = this.db.select().from(workoutExercise).where(eq(workoutExercise.id, workoutExerciseId)).get();
    if (!ex || !we) throw new Error('Ejercicio no encontrado');
    const timestamp = now();
    const sets = this.db
      .select()
      .from(workoutSet)
      .where(and(eq(workoutSet.workoutExerciseId, workoutExerciseId), isNull(workoutSet.deletedAt)))
      .orderBy(asc(workoutSet.position))
      .all();
    // Las series sin hacer se rellenan con lo que hiciste la última vez en el ejercicio nuevo.
    const matched = matchPreviousSets(sets, this.lastSessionSetsSync(exerciseId, we.workoutId, null));
    this.db.transaction((tx) => {
      tx.update(workoutExercise)
        .set({ exerciseId, exerciseNameSnapshot: ex.name, restSeconds: ex.defaultRestSeconds ?? we.restSeconds, updatedAt: timestamp })
        .where(eq(workoutExercise.id, workoutExerciseId))
        .run();
      sets.forEach((s, i) => {
        if (s.completedAt !== null) return;
        const prev = matched[i];
        tx.update(workoutSet)
          .set({ weightKg: prev?.weightKg ?? null, reps: prev?.reps ?? null, durationS: prev?.durationS ?? null, rpe: null, updatedAt: timestamp })
          .where(eq(workoutSet.id, s.id))
          .run();
      });
    });
  }

  async joinSuperset(workoutExerciseId: string, withWorkoutExerciseId: string): Promise<void> {
    const target = this.db.select().from(workoutExercise).where(eq(workoutExercise.id, withWorkoutExerciseId)).get();
    if (!target) return;
    const supersetId = target.supersetId ?? newId();
    const timestamp = now();
    this.db.transaction((tx) => {
      tx.update(workoutExercise)
        .set({ supersetId, updatedAt: timestamp })
        .where(inArray(workoutExercise.id, [workoutExerciseId, withWorkoutExerciseId]))
        .run();
    });
    // Los ejercicios de una superserie van seguidos: se coloca justo después del grupo.
    const ids = this.orderedExerciseIds(workoutExerciseId).filter((id) => id !== workoutExerciseId);
    const group = this.db
      .select({ id: workoutExercise.id })
      .from(workoutExercise)
      .where(and(eq(workoutExercise.supersetId, supersetId), isNull(workoutExercise.deletedAt)))
      .all()
      .map((r) => r.id);
    const lastIndex = Math.max(...ids.map((id, i) => (group.includes(id) ? i : -1)));
    ids.splice(lastIndex + 1, 0, workoutExerciseId);
    this.writePositions(ids);
  }

  async leaveSuperset(workoutExerciseId: string): Promise<void> {
    const we = this.db.select().from(workoutExercise).where(eq(workoutExercise.id, workoutExerciseId)).get();
    if (!we?.supersetId) return;
    const timestamp = now();
    this.db.update(workoutExercise).set({ supersetId: null, updatedAt: timestamp }).where(eq(workoutExercise.id, workoutExerciseId)).run();
    // Si solo queda uno, deja de ser superserie.
    const rest = this.db
      .select({ id: workoutExercise.id })
      .from(workoutExercise)
      .where(and(eq(workoutExercise.supersetId, we.supersetId), isNull(workoutExercise.deletedAt)))
      .all();
    if (rest.length === 1 && rest[0]) {
      this.db.update(workoutExercise).set({ supersetId: null, updatedAt: timestamp }).where(eq(workoutExercise.id, rest[0].id)).run();
    }
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
        rpe: null,
        completedAt: null,
      })
      .run();
  }

  async addWarmupSets(workoutExerciseId: string, sets: readonly { weightKg: number; reps: number }[]): Promise<void> {
    if (sets.length === 0) return;
    const existing = this.db
      .select({ id: workoutSet.id })
      .from(workoutSet)
      .where(and(eq(workoutSet.workoutExerciseId, workoutExerciseId), isNull(workoutSet.deletedAt)))
      .orderBy(asc(workoutSet.position))
      .all();
    const timestamp = now();
    this.db.transaction((tx) => {
      // Los calentamientos van delante: se desplazan las series que ya había.
      existing.forEach((s, i) => {
        tx.update(workoutSet).set({ position: sets.length + i, updatedAt: timestamp }).where(eq(workoutSet.id, s.id)).run();
      });
      sets.forEach((s, i) => {
        tx.insert(workoutSet)
          .values({
            ...newMeta(newId(), timestamp),
            workoutExerciseId,
            position: i,
            setType: 'warmup',
            weightKg: s.weightKg,
            reps: s.reps,
            durationS: null,
            rpe: null,
            completedAt: null,
          })
          .run();
      });
    });
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
      this.dropUnfinished(tx, workoutId, timestamp);
      tx.update(workout)
        .set({ endedAt: timestamp, restEndsAt: null, restNotificationId: null, updatedAt: timestamp })
        .where(eq(workout.id, workoutId))
        .run();
    });
  }

  async saveEdits(workoutId: string): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      this.dropUnfinished(tx, workoutId, timestamp);
      tx.update(workout).set({ updatedAt: timestamp }).where(eq(workout.id, workoutId)).run();
    });
  }

  async updateDetails(workoutId: string, patch: WorkoutDetailsPatch): Promise<void> {
    const endedAt = Math.max(patch.endedAt, patch.startedAt + 60_000);
    this.db
      .update(workout)
      .set({
        name: patch.name.trim() || 'Entreno',
        notes: patch.notes?.trim() ? patch.notes.trim() : null,
        startedAt: patch.startedAt,
        endedAt,
        localDate: toLocalDate(patch.startedAt),
        updatedAt: now(),
      })
      .where(eq(workout.id, workoutId))
      .run();
  }

  async softDelete(workoutId: string): Promise<void> {
    const timestamp = now();
    this.db
      .update(workout)
      .set({ deletedAt: timestamp, updatedAt: timestamp, restEndsAt: null, restNotificationId: null })
      .where(eq(workout.id, workoutId))
      .run();
  }

  async lastSessionSets(exerciseId: string, excludeWorkoutId: string | null, routineId: string | null = null): Promise<WorkoutSet[]> {
    return this.lastSessionSetsSync(exerciseId, excludeWorkoutId, routineId);
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

  async muscleSets(fromMs: number): Promise<MuscleSetCount[]> {
    const rows = this.db
      .select({ muscleGroup: exercise.muscleGroup, sets: sql<number>`count(${workoutSet.id})` })
      .from(workoutSet)
      .innerJoin(workoutExercise, eq(workoutSet.workoutExerciseId, workoutExercise.id))
      .innerJoin(workout, eq(workoutExercise.workoutId, workout.id))
      .innerJoin(exercise, eq(workoutExercise.exerciseId, exercise.id))
      .where(
        and(
          finishedWorkout,
          gte(workout.startedAt, fromMs),
          isNull(workoutExercise.deletedAt),
          isNull(workoutSet.deletedAt),
          isNotNull(workoutSet.completedAt),
          ne(workoutSet.setType, 'warmup'),
        ),
      )
      .groupBy(exercise.muscleGroup)
      .all();
    return rows.map((r) => ({ muscleGroup: r.muscleGroup as MuscleGroup, sets: r.sets })).sort((a, b) => b.sets - a.sets);
  }

  private createWorkout(routineId: string | null, name: string, plan: readonly PlannedExercise[]): string {
    const timestamp = now();
    const workoutId = newId();
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
            notes: p.notes,
            supersetId: p.supersetId,
          })
          .run();
        p.sets.forEach((s, si) => {
          tx.insert(workoutSet)
            .values({ ...newMeta(newId(), timestamp), workoutExerciseId: weId, position: si, rpe: null, completedAt: null, ...s })
            .run();
        });
      });
    });
    return workoutId;
  }

  /** Quita las series sin completar y los ejercicios que se quedan vacíos. */
  private dropUnfinished(tx: Tx, workoutId: string, timestamp: number): void {
    const exercises = tx
      .select({ id: workoutExercise.id })
      .from(workoutExercise)
      .where(and(eq(workoutExercise.workoutId, workoutId), isNull(workoutExercise.deletedAt)))
      .all()
      .map((r) => r.id);
    if (exercises.length === 0) return;
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

  /** Ids de los ejercicios del mismo entreno, en orden. */
  private orderedExerciseIds(workoutExerciseId: string): string[] {
    const we = this.db.select({ workoutId: workoutExercise.workoutId }).from(workoutExercise).where(eq(workoutExercise.id, workoutExerciseId)).get();
    if (!we) return [];
    return this.db
      .select({ id: workoutExercise.id })
      .from(workoutExercise)
      .where(and(eq(workoutExercise.workoutId, we.workoutId), isNull(workoutExercise.deletedAt)))
      .orderBy(asc(workoutExercise.position))
      .all()
      .map((r) => r.id);
  }

  private writePositions(orderedIds: readonly string[]): void {
    const timestamp = now();
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(workoutExercise).set({ position, updatedAt: timestamp }).where(eq(workoutExercise.id, id)).run();
      });
    });
  }

  /** Series del último entreno terminado que incluye el ejercicio (opcionalmente, de una rutina). */
  private lastSessionSetsSync(exerciseId: string, excludeWorkoutId: string | null, routineId: string | null): WorkoutSet[] {
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
          routineId ? eq(workout.routineId, routineId) : undefined,
        ),
      )
      .orderBy(desc(workout.startedAt), desc(workoutExercise.position))
      .get();
    if (!last) return routineId ? this.lastSessionSetsSync(exerciseId, excludeWorkoutId, null) : [];
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
      .select({ we: workoutExercise, trackingType: exercise.trackingType, equipment: exercise.equipment, exerciseNote: exercise.notes })
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
      exercises: exercises.map(({ we, trackingType, equipment, exerciseNote }) => ({
        id: we.id,
        createdAt: we.createdAt,
        updatedAt: we.updatedAt,
        deletedAt: we.deletedAt,
        workoutId: we.workoutId,
        exerciseId: we.exerciseId,
        exerciseNameSnapshot: we.exerciseNameSnapshot,
        trackingType,
        equipment,
        exerciseNote,
        position: we.position,
        restSeconds: we.restSeconds,
        notes: we.notes,
        supersetId: we.supersetId,
        sets: sets.filter((s) => s.workoutExerciseId === we.id),
      })),
    };
  }
}
