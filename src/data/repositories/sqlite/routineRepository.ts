import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { exercise, routine, routineExercise, routineSet } from '@/data/db/schema';
import type { RoutineDetail, RoutineDraft, RoutineSummary } from '@/domain/workoutTypes';
import { newId, now } from '@/lib/ids';

import type { RoutineRepository } from '../interfaces';
import { newMeta, toExercise, toRoutine } from './mappers';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export class SqliteRoutineRepository implements RoutineRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<RoutineSummary[]> {
    const routines = this.db.select().from(routine).where(isNull(routine.deletedAt)).orderBy(asc(routine.position)).all();
    if (routines.length === 0) return [];
    const names = this.db
      .select({ routineId: routineExercise.routineId, name: exercise.name })
      .from(routineExercise)
      .innerJoin(exercise, eq(routineExercise.exerciseId, exercise.id))
      .where(and(inArray(routineExercise.routineId, routines.map((r) => r.id)), isNull(routineExercise.deletedAt)))
      .orderBy(asc(routineExercise.position))
      .all();
    return routines.map((r) => ({
      ...toRoutine(r),
      exerciseNames: names.filter((n) => n.routineId === r.id).map((n) => n.name),
    }));
  }

  async get(id: string): Promise<RoutineDetail | null> {
    const row = this.db.select().from(routine).where(and(eq(routine.id, id), isNull(routine.deletedAt))).get();
    if (!row) return null;
    const res = this.db
      .select({ re: routineExercise, ex: exercise })
      .from(routineExercise)
      .innerJoin(exercise, eq(routineExercise.exerciseId, exercise.id))
      .where(and(eq(routineExercise.routineId, id), isNull(routineExercise.deletedAt)))
      .orderBy(asc(routineExercise.position))
      .all();
    const sets =
      res.length === 0
        ? []
        : this.db
            .select()
            .from(routineSet)
            .where(and(inArray(routineSet.routineExerciseId, res.map((r) => r.re.id)), isNull(routineSet.deletedAt)))
            .orderBy(asc(routineSet.position))
            .all();
    return {
      ...toRoutine(row),
      exercises: res.map(({ re, ex }) => ({
        id: re.id,
        exercise: toExercise(ex),
        position: re.position,
        restSeconds: re.restSeconds,
        notes: re.notes,
        sets: sets
          .filter((s) => s.routineExerciseId === re.id)
          .map((s) => ({
            id: s.id,
            position: s.position,
            setType: s.setType,
            targetWeightKg: s.targetWeightKg,
            targetReps: s.targetReps,
            targetDurationS: s.targetDurationS,
          })),
      })),
    };
  }

  async save(id: string | null, draft: RoutineDraft): Promise<string> {
    const timestamp = now();
    const routineId = id ?? newId();
    this.db.transaction((tx) => {
      if (id === null) {
        const position = (tx.select({ p: max(routine.position) }).from(routine).get()?.p ?? -1) + 1;
        tx.insert(routine)
          .values({ ...newMeta(routineId, timestamp), name: draft.name.trim(), notes: draft.notes, position })
          .run();
      } else {
        tx.update(routine).set({ name: draft.name.trim(), notes: draft.notes, updatedAt: timestamp }).where(eq(routine.id, id)).run();
        this.softDeleteChildren(tx, id, timestamp);
      }
      draft.exercises.forEach((e, ei) => {
        const reId = newId();
        tx.insert(routineExercise)
          .values({ ...newMeta(reId, timestamp), routineId, exerciseId: e.exerciseId, position: ei, restSeconds: e.restSeconds, notes: e.notes })
          .run();
        e.sets.forEach((s, si) => {
          tx.insert(routineSet)
            .values({ ...newMeta(newId(), timestamp), routineExerciseId: reId, position: si, ...s })
            .run();
        });
      });
    });
    return routineId;
  }

  async duplicate(id: string): Promise<string> {
    const source = await this.get(id);
    if (!source) throw new Error('Rutina no encontrada');
    return this.save(null, {
      name: `${source.name} (copia)`,
      notes: source.notes,
      exercises: source.exercises.map((e) => ({
        exerciseId: e.exercise.id,
        restSeconds: e.restSeconds,
        notes: e.notes,
        sets: e.sets.map(({ setType, targetWeightKg, targetReps, targetDurationS }) => ({ setType, targetWeightKg, targetReps, targetDurationS })),
      })),
    });
  }

  async softDelete(id: string): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      tx.update(routine).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(routine.id, id)).run();
      this.softDeleteChildren(tx, id, timestamp);
    });
  }

  async reorder(orderedIds: readonly string[]): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      orderedIds.forEach((id, position) => {
        tx.update(routine).set({ position, updatedAt: timestamp }).where(eq(routine.id, id)).run();
      });
    });
  }

  private softDeleteChildren(tx: Tx, routineId: string, timestamp: number): void {
    const reIds = tx
      .select({ id: routineExercise.id })
      .from(routineExercise)
      .where(and(eq(routineExercise.routineId, routineId), isNull(routineExercise.deletedAt)))
      .all()
      .map((r) => r.id);
    if (reIds.length === 0) return;
    tx.update(routineSet)
      .set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(and(inArray(routineSet.routineExerciseId, reIds), isNull(routineSet.deletedAt)))
      .run();
    tx.update(routineExercise).set({ deletedAt: timestamp, updatedAt: timestamp }).where(inArray(routineExercise.id, reIds)).run();
  }
}
