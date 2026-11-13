/**
 * @jest-environment node
 */
import { seedExerciseId } from '@/data/seed/exercises';
import { seedDatabase } from '@/data/seed/seed';
import type { Db } from '@/data/db/client';
import { createTestDb } from '@/test/testDb';

import { SqliteFoodMemoryRepository } from './foodMemoryRepository';
import { SqliteRoutineRepository } from './routineRepository';
import { SqliteWorkoutRepository } from './workoutRepository';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove: () => undefined }) }));

let db: Db;
let routines: SqliteRoutineRepository;
let workouts: SqliteWorkoutRepository;

const BENCH = seedExerciseId('press-banca-barra');
const ROW = seedExerciseId('remo-barra');

beforeEach(async () => {
  db = await createTestDb();
  seedDatabase(db);
  routines = new SqliteRoutineRepository(db);
  workouts = new SqliteWorkoutRepository(db);
});

async function emptyWorkoutWith(...exerciseIds: string[]) {
  const id = await workouts.start({ routineId: null, name: 'Libre', defaultRestSeconds: 120 });
  for (const e of exerciseIds) await workouts.addExercise(id, e, 120);
  const w = await workouts.get(id);
  if (!w) throw new Error('sin entreno');
  return w;
}

async function completeAll(workoutId: string, values: { weightKg: number; reps: number }) {
  const w = await workouts.get(workoutId);
  for (const e of w?.exercises ?? []) for (const s of e.sets) await workouts.completeSet(s.id, values);
}

describe('entreno en vivo (funciones tipo Hevy)', () => {
  it('superseries: se agrupan, quedan seguidas y se deshacen', async () => {
    const squat = seedExerciseId('sentadilla-barra');
    const w = await emptyWorkoutWith(BENCH, squat, ROW);
    const [bench, , row] = w.exercises;
    if (!bench || !row) throw new Error('faltan ejercicios');
    await workouts.joinSuperset(row.id, bench.id);
    let after = await workouts.get(w.id);
    expect(after?.exercises.map((e) => e.exerciseId)).toEqual([BENCH, ROW, squat]);
    expect(after?.exercises[0]?.supersetId).toBeTruthy();
    expect(after?.exercises[1]?.supersetId).toBe(after?.exercises[0]?.supersetId);
    await workouts.leaveSuperset(row.id);
    after = await workouts.get(w.id);
    // Con uno solo ya no es superserie.
    expect(after?.exercises.every((e) => e.supersetId === null)).toBe(true);
  });

  it('reordenar, sustituir, notas, RPE y calentamiento', async () => {
    const w = await emptyWorkoutWith(BENCH, ROW);
    const [bench, row] = w.exercises;
    if (!bench || !row) throw new Error('faltan ejercicios');
    await workouts.moveExercise(row.id, -1);
    await workouts.setExerciseNotes(row.id, '  agarre ancho ');
    await workouts.replaceExercise(bench.id, seedExerciseId('press-militar-barra'));
    await workouts.addWarmupSets(bench.id, [
      { weightKg: 20, reps: 10 },
      { weightKg: 30, reps: 5 },
    ]);
    const firstSet = (await workouts.get(w.id))?.exercises[1]?.sets[2];
    if (firstSet) await workouts.updateSet(firstSet.id, { rpe: 8.5 });
    const after = await workouts.get(w.id);
    expect(after?.exercises.map((e) => e.exerciseNameSnapshot)).toEqual(['Remo con barra', 'Press militar (barra)']);
    expect(after?.exercises[0]?.notes).toBe('agarre ancho');
    expect(after?.exercises[1]?.sets.map((s) => s.setType)).toEqual(['warmup', 'warmup', 'normal']);
    expect(after?.exercises[1]?.sets[2]?.rpe).toBe(8.5);
    expect(after?.exercises[1]?.equipment).toBe('barbell');
  });

  it('editar un entreno terminado: fecha, duración, nombre y series nuevas', async () => {
    const w = await emptyWorkoutWith(BENCH);
    await completeAll(w.id, { weightKg: 80, reps: 8 });
    await workouts.finish(w.id);
    const start = new Date(2026, 9, 20, 18, 0).getTime();
    await workouts.updateDetails(w.id, { name: 'Pecho', notes: 'buen día', startedAt: start, endedAt: start + 70 * 60_000 });
    const bench = (await workouts.get(w.id))?.exercises[0];
    if (!bench) throw new Error('sin ejercicio');
    await workouts.addSet(bench.id);
    await workouts.addSet(bench.id);
    const sets = (await workouts.get(w.id))?.exercises[0]?.sets ?? [];
    const last = sets[sets.length - 1];
    if (last) await workouts.completeSet(last.id, { weightKg: 82.5, reps: 6 });
    await workouts.saveEdits(w.id);
    const after = await workouts.get(w.id);
    expect(after).toMatchObject({ name: 'Pecho', notes: 'buen día', localDate: '2026-10-20', startedAt: start, endedAt: start + 70 * 60_000 });
    // La serie añadida y no marcada se descarta al guardar.
    expect(after?.exercises[0]?.sets).toHaveLength(2);
  });

  it('repetir un entreno copia ejercicios, superseries y valores', async () => {
    const w = await emptyWorkoutWith(BENCH, ROW);
    const [bench, row] = w.exercises;
    if (!bench || !row) throw new Error('faltan ejercicios');
    await workouts.joinSuperset(row.id, bench.id);
    await completeAll(w.id, { weightKg: 70, reps: 10 });
    await workouts.finish(w.id);
    const again = await workouts.get(await workouts.repeat(w.id));
    expect(again?.endedAt).toBeNull();
    expect(again?.exercises.map((e) => e.exerciseId)).toEqual([BENCH, ROW]);
    expect(again?.exercises[0]?.supersetId).toBeTruthy();
    expect(again?.exercises[0]?.supersetId).not.toBe((await workouts.get(w.id))?.exercises[0]?.supersetId);
    expect(again?.exercises[0]?.sets[0]).toMatchObject({ weightKg: 70, reps: 10, completedAt: null });
  });

  it('«anterior» puede salir solo de la misma rutina', async () => {
    const lower = (await routines.list()).find((r) => r.name === 'lower 1');
    if (!lower) throw new Error('falta lower 1');
    const detail = await routines.get(lower.id);
    const exerciseId = detail?.exercises[0]?.exercise.id ?? '';
    // Un entreno libre posterior con otro peso.
    const free = await emptyWorkoutWith(exerciseId);
    await completeAll(free.id, { weightKg: 11, reps: 11 });
    await workouts.finish(free.id);
    const fromRoutine = await workouts.lastSessionSets(exerciseId, null, lower.id);
    const fromAny = await workouts.lastSessionSets(exerciseId, null, null);
    expect(fromAny[0]?.weightKg).toBe(11);
    // Sin entrenos de la rutina todavía, cae en el último de cualquier tipo.
    expect(fromRoutine[0]?.weightKg).toBe(11);
  });

  it('series por músculo (sin calentamientos)', async () => {
    const w = await emptyWorkoutWith(BENCH, ROW);
    const bench = w.exercises[0];
    if (!bench) throw new Error('sin ejercicio');
    await workouts.addSet(bench.id);
    await workouts.addWarmupSets(bench.id, [{ weightKg: 40, reps: 10 }]);
    await completeAll(w.id, { weightKg: 60, reps: 10 });
    await workouts.finish(w.id);
    const counts = await workouts.muscleSets(0);
    expect(counts.find((c) => c.muscleGroup === 'chest')?.sets).toBe(2);
    expect(counts.find((c) => c.muscleGroup === 'back')?.sets).toBe(1);
  });
});

describe('rutinas: carpetas y guardar desde entreno', () => {
  it('carpetas: crear, mover, renombrar y borrar sin perder rutinas', async () => {
    const folder = await routines.createFolder('Fuerza');
    const [first] = await routines.list();
    if (!first) throw new Error('sin rutinas');
    await routines.moveToFolder(first.id, folder);
    await routines.renameFolder(folder, 'Fuerza 2026');
    expect((await routines.listFolders()).map((f) => f.name)).toEqual(['Fuerza 2026']);
    expect((await routines.list()).find((r) => r.id === first.id)?.folderId).toBe(folder);
    await routines.deleteFolder(folder);
    expect(await routines.listFolders()).toEqual([]);
    expect((await routines.list()).find((r) => r.id === first.id)?.folderId).toBeNull();
  });

  it('actualizar una rutina con lo que hiciste o crear una nueva', async () => {
    const w = await emptyWorkoutWith(BENCH, ROW);
    const [bench, row] = w.exercises;
    if (!bench || !row) throw new Error('faltan ejercicios');
    await workouts.joinSuperset(row.id, bench.id);
    await completeAll(w.id, { weightKg: 75, reps: 9 });
    await workouts.finish(w.id);
    const created = await routines.get(await routines.saveFromWorkout(w.id, null, 'Torso A'));
    expect(created?.name).toBe('Torso A');
    expect(created?.exercises.map((e) => e.exercise.id)).toEqual([BENCH, ROW]);
    expect(created?.exercises[0]?.sets[0]).toMatchObject({ targetWeightKg: 75, targetReps: 9 });
    expect(created?.exercises[0]?.supersetId).toBeTruthy();
    expect(created?.exercises[1]?.supersetId).toBe(created?.exercises[0]?.supersetId);
    // Actualizar conserva el nombre de la rutina.
    const updated = await routines.get(await routines.saveFromWorkout(w.id, created?.id ?? null, 'otro'));
    expect(updated?.id).toBe(created?.id);
    expect(updated?.name).toBe('Torso A');
  });
});

describe('memoria de alimentos', () => {
  it('aprende, actualiza por nombre y olvida', async () => {
    const memory = new SqliteFoodMemoryRepository(db);
    const per100 = { kcalPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 };
    await memory.learn([{ name: 'Pollo a la plancha', grams: 180, ...per100, aiName: 'Pechuga de pollo', aiGrams: 150 }]);
    await memory.learn([{ name: 'pollo a la plancha', grams: 200, ...per100, aiName: 'Pollo', aiGrams: 160 }]);
    const list = await memory.list();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ timesConfirmed: 2, aiSamples: 2, aiGramsTotal: 310, finalGramsTotal: 380, grams: 200 });
    expect(list[0]?.aliases).toEqual(['pechuga de pollo', 'pollo']);
    expect(await memory.clear()).toBe(1);
    expect(await memory.list()).toEqual([]);
    // Tras olvidar, se vuelve a aprender desde cero.
    await memory.learn([{ name: 'Pollo a la plancha', grams: 100, ...per100, aiName: null, aiGrams: null }]);
    expect((await memory.list())[0]).toMatchObject({ timesConfirmed: 1, aiSamples: 0 });
  });
});

describe('reordenar ejercicios (menú «⋯» → Reordenar ejercicios)', () => {
  it('aplica el orden nuevo y deja al final los que no vengan en la lista', async () => {
    const lower = (await routines.list()).find((r) => r.name === 'lower 1');
    const id = await workouts.start({ routineId: lower?.id ?? null, name: 'lower 1', defaultRestSeconds: 150 });
    const before = (await workouts.get(id))?.exercises.map((e) => e.id) ?? [];
    const [a, b, c, ...rest] = before;
    if (!a || !b || !c) throw new Error('faltan ejercicios');
    await workouts.reorderExercises(id, [c, a, 'no-existe', b]);
    const after = (await workouts.get(id))?.exercises.map((e) => e.id);
    expect(after).toEqual([c, a, b, ...rest]);
  });
});
