import { and, asc, eq, inArray, isNull, max } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { exercise, routine, routineExercise, routineFolder, routineSet, workout, workoutExercise, workoutSet } from '@/data/db/schema';
import type { RoutineDetail, RoutineDraft, RoutineFolder, RoutineSummary } from '@/domain/workoutTypes';
import { newId, now } from '@/lib/ids';

import type { RoutineRepository } from '../interfaces';
import { newMeta, toExercise, toRoutine } from './mappers';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/** Cambia los ids de superserie por otros nuevos (al copiar), manteniendo los grupos. */
function remapSupersets<T extends { supersetId: string | null }>(list: readonly T[]): T[] {
  const map = new Map<string, string>();
  return list.map((e) => {
    if (!e.supersetId) return e;
    const id = map.get(e.supersetId) ?? newId();
    map.set(e.supersetId, id);
    return { ...e, supersetId: id };
  });
}

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
        supersetId: re.supersetId,
        sets: sets
          .filter((s) => s.routineExerciseId === re.id)
          .map((s) => ({
            id: s.id,
            position: s.position,
            setType: s.setType,
            targetWeightKg: s.targetWeightKg,
            targetReps: s.targetReps,
            targetDurationS: s.targetDurationS,
            targetDistanceM: s.targetDistanceM,
          })),
      })),
    };
  }

  async save(id: string | null, draft: RoutineDraft, folderId: string | null = null): Promise<string> {
    const timestamp = now();
    const routineId = id ?? newId();
    this.db.transaction((tx) => {
      if (id === null) {
        const position = (tx.select({ p: max(routine.position) }).from(routine).get()?.p ?? -1) + 1;
        tx.insert(routine)
          .values({ ...newMeta(routineId, timestamp), name: draft.name.trim(), notes: draft.notes, position, folderId })
          .run();
      } else {
        tx.update(routine).set({ name: draft.name.trim(), notes: draft.notes, updatedAt: timestamp }).where(eq(routine.id, id)).run();
        this.softDeleteChildren(tx, id, timestamp);
      }
      this.insertExercises(tx, routineId, draft, timestamp);
    });
    return routineId;
  }

  async duplicate(id: string): Promise<string> {
    const source = await this.get(id);
    if (!source) throw new Error('Rutina no encontrada');
    return this.save(
      null,
      {
        name: `${source.name} (copia)`,
        notes: source.notes,
        exercises: remapSupersets(
          source.exercises.map((e) => ({
            exerciseId: e.exercise.id,
            restSeconds: e.restSeconds,
            notes: e.notes,
            supersetId: e.supersetId,
            sets: e.sets.map(({ setType, targetWeightKg, targetReps, targetDurationS, targetDistanceM }) => ({
              setType,
              targetWeightKg,
              targetReps,
              targetDurationS,
              targetDistanceM,
            })),
          })),
        ),
      },
      source.folderId,
    );
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

  // ---------- Carpetas ----------

  async listFolders(): Promise<RoutineFolder[]> {
    return this.db
      .select()
      .from(routineFolder)
      .where(isNull(routineFolder.deletedAt))
      .orderBy(asc(routineFolder.position))
      .all()
      .map((f) => ({ id: f.id, createdAt: f.createdAt, updatedAt: f.updatedAt, deletedAt: f.deletedAt, name: f.name, position: f.position }));
  }

  async createFolder(name: string): Promise<string> {
    const timestamp = now();
    const id = newId();
    const position = (this.db.select({ p: max(routineFolder.position) }).from(routineFolder).get()?.p ?? -1) + 1;
    this.db.insert(routineFolder).values({ ...newMeta(id, timestamp), name: name.trim(), position }).run();
    return id;
  }

  async renameFolder(id: string, name: string): Promise<void> {
    this.db.update(routineFolder).set({ name: name.trim(), updatedAt: now() }).where(eq(routineFolder.id, id)).run();
  }

  /** Borra la carpeta; sus rutinas pasan a «sin carpeta» (no se borran). */
  async deleteFolder(id: string): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      tx.update(routine).set({ folderId: null, updatedAt: timestamp }).where(eq(routine.folderId, id)).run();
      tx.update(routineFolder).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(routineFolder.id, id)).run();
    });
  }

  async moveToFolder(routineId: string, folderId: string | null): Promise<void> {
    this.db.update(routine).set({ folderId, updatedAt: now() }).where(eq(routine.id, routineId)).run();
  }

  // ---------- Desde un entreno ----------

  /**
   * Guarda un entreno como rutina: sus ejercicios, superseries, notas y series
   * (lo que hiciste pasa a ser el objetivo). Con `routineId` actualiza esa
   * rutina; si no, crea una nueva con `name`. Devuelve el id de la rutina.
   */
  async saveFromWorkout(workoutId: string, routineId: string | null, name: string): Promise<string> {
    const w = this.db.select().from(workout).where(eq(workout.id, workoutId)).get();
    if (!w) throw new Error('Entreno no encontrado');
    const wes = this.db
      .select()
      .from(workoutExercise)
      .where(and(eq(workoutExercise.workoutId, workoutId), isNull(workoutExercise.deletedAt)))
      .orderBy(asc(workoutExercise.position))
      .all();
    const sets =
      wes.length === 0
        ? []
        : this.db
            .select()
            .from(workoutSet)
            .where(and(inArray(workoutSet.workoutExerciseId, wes.map((e) => e.id)), isNull(workoutSet.deletedAt)))
            .orderBy(asc(workoutSet.position))
            .all();
    const current = routineId ? await this.get(routineId) : null;
    const draft: RoutineDraft = {
      name: current?.name ?? name,
      notes: current?.notes ?? null,
      exercises: remapSupersets(
        wes.map((e) => ({
          exerciseId: e.exerciseId,
          restSeconds: e.restSeconds,
          notes: e.notes,
          supersetId: e.supersetId,
          sets: sets
            .filter((s) => s.workoutExerciseId === e.id)
            .map((s) => ({
              setType: s.setType,
              targetWeightKg: s.weightKg,
              targetReps: s.reps,
              targetDurationS: s.durationS,
              targetDistanceM: s.distanceM,
            })),
        })),
      ),
    };
    return this.save(current ? current.id : null, draft);
  }

  private insertExercises(tx: Tx, routineId: string, draft: RoutineDraft, timestamp: number): void {
    draft.exercises.forEach((e, ei) => {
      const reId = newId();
      tx.insert(routineExercise)
        .values({
          ...newMeta(reId, timestamp),
          routineId,
          exerciseId: e.exerciseId,
          position: ei,
          restSeconds: e.restSeconds,
          notes: e.notes,
          supersetId: e.supersetId,
        })
        .run();
      e.sets.forEach((s, si) => {
        tx.insert(routineSet)
          .values({ ...newMeta(newId(), timestamp), routineExerciseId: reId, position: si, ...s })
          .run();
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
