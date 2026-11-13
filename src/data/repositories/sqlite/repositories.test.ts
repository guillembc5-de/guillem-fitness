/**
 * @jest-environment node
 */
import { notInArray } from 'drizzle-orm';

import { routine } from '@/data/db/schema';
import { recordsInSession } from '@/domain/workout';
import { seedDatabase } from '@/data/seed/seed';
import { SEED_EXERCISES, seedExerciseId } from '@/data/seed/exercises';
import { createTestDb } from '@/test/testDb';
import type { Db } from '@/data/db/client';

import { SqliteExerciseRepository } from './exerciseRepository';
import { SqliteMealRepository, SqlitePendingPhotoRepository } from './mealRepository';
import { SqliteRoutineRepository } from './routineRepository';
import { SqliteStepDayRepository } from './stepDayRepository';
import { SqliteWorkoutRepository } from './workoutRepository';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
// El módulo nativo no existe en Node; la base de datos la pone createTestDb().
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove: () => undefined }) }));

let db: Db;
let exercises: SqliteExerciseRepository;
let routines: SqliteRoutineRepository;
let workouts: SqliteWorkoutRepository;

beforeEach(async () => {
  db = await createTestDb();
  seedDatabase(db);
  exercises = new SqliteExerciseRepository(db);
  routines = new SqliteRoutineRepository(db);
  workouts = new SqliteWorkoutRepository(db);
});

async function lowerRoutineId(): Promise<string> {
  const list = await routines.list();
  const lower = list.find((r) => r.name === 'lower 1');
  if (!lower) throw new Error('falta lower 1');
  return lower.id;
}

/** Completa todas las series con sus valores actuales y termina el entreno. */
async function completeAllAndFinish(workoutId: string) {
  const w = await workouts.get(workoutId);
  for (const e of w?.exercises ?? []) {
    for (const s of e.sets) await workouts.completeSet(s.id, { weightKg: s.weightKg, reps: s.reps, durationS: s.durationS });
  }
  await workouts.finish(workoutId);
}

describe('carga inicial', () => {
  it('biblioteca completa y tus rutinas', async () => {
    expect(await exercises.list()).toHaveLength(SEED_EXERCISES.length);
    const list = await routines.list();
    expect(list.map((r) => r.name)).toEqual(['lower 1', 'upper 1', 'lower 2', 'upper 2', 'RECUPERACIÓ CREUATS']);
    expect(list[1]?.exerciseNames[0]).toBe('Press de pecho inclinado (máquina)');
  });

  it('es idempotente y no resucita rutinas borradas', async () => {
    const id = await lowerRoutineId();
    await routines.softDelete(id);
    seedDatabase(db);
    expect(await exercises.list()).toHaveLength(SEED_EXERCISES.length);
    expect((await routines.list()).map((r) => r.name)).toEqual(['upper 1', 'lower 2', 'upper 2', 'RECUPERACIÓ CREUATS']);
  });

  it('a quien ya tenía rutinas le añade las nuevas al final, sin tocar las suyas', async () => {
    const fresh = await createTestDb();
    // Como una instalación anterior: solo lower 1 y upper 1, más una rutina propia.
    seedDatabase(fresh);
    const repo = new SqliteRoutineRepository(fresh);
    fresh.delete(routine).where(notInArray(routine.name, ['lower 1', 'upper 1'])).run();
    const mine = await repo.save(null, { name: 'Mi rutina', notes: null, exercises: [] });
    seedDatabase(fresh);
    const list = await repo.list();
    expect(list.map((r) => r.name)).toEqual(['lower 1', 'upper 1', 'Mi rutina', 'lower 2', 'upper 2', 'RECUPERACIÓ CREUATS']);
    expect(list.find((r) => r.id === mine)?.name).toBe('Mi rutina');
  });

  it('la rutina del fisio lleva sus notas y deja vacío lo que la pizarra no dice', async () => {
    const rec = (await routines.list()).find((r) => r.name === 'RECUPERACIÓ CREUATS');
    const detail = rec ? await routines.get(rec.id) : null;
    expect(detail?.notes).toContain('fisio');
    expect(detail?.exercises).toHaveLength(9);
    expect(detail?.exercises[0]?.sets[0]?.targetReps).toBe(30);
    const pogo = detail?.exercises.find((e) => e.exercise.name.startsWith('Pogo'));
    expect(pogo?.sets).toHaveLength(4);
    expect(pogo?.notes).toContain('una pierna, lateral');
    expect(pogo?.sets[0]?.targetReps).toBeNull();
  });
});

describe('entreno desde rutina', () => {
  it('la primera vez parte de los objetivos de la rutina', async () => {
    const id = await workouts.start({ routineId: await lowerRoutineId(), name: 'lower 1', defaultRestSeconds: 150 });
    const w = await workouts.getActive();
    expect(w?.id).toBe(id);
    expect(w?.exercises).toHaveLength(8);
    const rdl = w?.exercises.find((e) => e.exerciseNameSnapshot === 'Peso muerto rumano (barra)');
    expect(rdl?.restSeconds).toBe(180);
    expect(rdl?.sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [90, 10],
      [90, 8],
      [90, 6],
    ]);
    // La hiperextensión no tiene descanso en la rutina: usa el del perfil.
    expect(w?.exercises[0]?.restSeconds).toBe(150);
    expect(w?.exercises[0]?.sets.every((s) => s.setType === 'warmup')).toBe(true);
  });

  it('cada serie marcada queda guardada al instante (sobrevive a cerrar la app)', async () => {
    await workouts.start({ routineId: await lowerRoutineId(), name: 'lower 1', defaultRestSeconds: 150 });
    const w = await workouts.getActive();
    const first = w?.exercises[1]?.sets[0];
    if (!first) throw new Error('sin series');
    await workouts.completeSet(first.id, { weightKg: 32.5, reps: 10, durationS: null });
    await workouts.setRest(w?.id ?? '', 123_456, 'notif-1');

    // «Reabrir la app»: repositorio nuevo sobre la misma base de datos.
    const reopened = await new SqliteWorkoutRepository(db).getActive();
    const saved = reopened?.exercises[1]?.sets[0];
    expect(saved?.completedAt).not.toBeNull();
    expect(saved?.weightKg).toBe(32.5);
    expect(reopened?.restEndsAt).toBe(123_456);
  });

  it('al terminar se descartan series y ejercicios sin completar', async () => {
    const id = await workouts.start({ routineId: await lowerRoutineId(), name: 'lower 1', defaultRestSeconds: 150 });
    const w = await workouts.get(id);
    const rdl = w?.exercises.find((e) => e.exerciseNameSnapshot === 'Peso muerto rumano (barra)');
    for (const s of rdl?.sets.slice(0, 2) ?? []) await workouts.completeSet(s.id, { weightKg: s.weightKg, reps: s.reps, durationS: null });
    await workouts.finish(id);

    expect(await workouts.getActive()).toBeNull();
    const done = await workouts.get(id);
    expect(done?.exercises).toHaveLength(1);
    expect(done?.exercises[0]?.sets).toHaveLength(2);
    const [summary] = await workouts.list();
    expect(summary?.volume).toBe(90 * 10 + 90 * 8);
    expect(summary?.setCount).toBe(2);
  });

  it('la siguiente vez parte de lo que hiciste («anterior»)', async () => {
    const routineId = await lowerRoutineId();
    const first = await workouts.start({ routineId, name: 'lower 1', defaultRestSeconds: 150 });
    const w1 = await workouts.get(first);
    const rdl1 = w1?.exercises.find((e) => e.exerciseNameSnapshot === 'Peso muerto rumano (barra)');
    const firstSet = rdl1?.sets[0];
    if (!firstSet) throw new Error('sin series');
    await workouts.updateSet(firstSet.id, { weightKg: 95 });
    await completeAllAndFinish(first);

    await workouts.start({ routineId, name: 'lower 1', defaultRestSeconds: 150 });
    const w2 = await workouts.getActive();
    const rdl2 = w2?.exercises.find((e) => e.exerciseNameSnapshot === 'Peso muerto rumano (barra)');
    expect(rdl2?.sets[0]?.weightKg).toBe(95);
    const previous = await workouts.lastSessionSets(seedExerciseId('peso-muerto-rumano-barra'), w2?.id ?? null);
    expect(previous.map((s) => s.weightKg)).toEqual([95, 90, 90]);
  });

  it('detecta récords frente al historial', async () => {
    const routineId = await lowerRoutineId();
    const exId = seedExerciseId('peso-muerto-rumano-barra');
    await completeAllAndFinish(await workouts.start({ routineId, name: 'lower 1', defaultRestSeconds: 150 }));

    const second = await workouts.start({ routineId, name: 'lower 1', defaultRestSeconds: 150 });
    const w = await workouts.get(second);
    const rdl = w?.exercises.find((e) => e.exerciseId === exId);
    const s0 = rdl?.sets[0];
    if (!rdl || !s0) throw new Error('sin series');
    await workouts.completeSet(s0.id, { weightKg: 100, reps: 8, durationS: null });

    const bests = await workouts.historyBests([exId], second);
    expect(bests[exId]?.maxWeight).toBe(90);
    const after = await workouts.get(second);
    const sets = after?.exercises.find((e) => e.exerciseId === exId)?.sets ?? [];
    const records = recordsInSession(sets, bests[exId] ?? { maxWeight: null, best1RM: null, bestSetVolume: null, maxReps: null });
    expect(records[0]).toEqual(expect.arrayContaining(['weight', 'e1rm']));
  });

  it('descartar un entreno no deja rastro en el historial', async () => {
    const id = await workouts.start({ routineId: null, name: 'Entreno libre', defaultRestSeconds: 150 });
    await workouts.softDelete(id);
    expect(await workouts.getActive()).toBeNull();
    expect(await workouts.list()).toHaveLength(0);
  });
});

describe('borrar un ejercicio con historial', () => {
  it('no rompe el historial, las gráficas ni los entrenos pasados', async () => {
    const exId = seedExerciseId('peso-muerto-rumano-barra');
    const workoutId = await workouts.start({ routineId: await lowerRoutineId(), name: 'lower 1', defaultRestSeconds: 150 });
    await completeAllAndFinish(workoutId);

    await exercises.softDelete(exId);

    expect((await exercises.list()).some((e) => e.id === exId)).toBe(false);
    expect((await exercises.get(exId))?.deletedAt).not.toBeNull();
    expect(await exercises.history(exId)).toHaveLength(3);
    const past = await workouts.get(workoutId);
    expect(past?.exercises.some((e) => e.exerciseNameSnapshot === 'Peso muerto rumano (barra)')).toBe(true);
    const routine = await routines.get(await lowerRoutineId());
    expect(routine?.exercises.some((e) => e.exercise.id === exId)).toBe(false);
  });
});

describe('rutinas', () => {
  it('crear, editar, duplicar y reordenar', async () => {
    const id = await routines.save(null, {
      name: 'push',
      notes: null,
      exercises: [
        {
          exerciseId: seedExerciseId('press-banca-barra'),
          restSeconds: 120,
          notes: null,
          supersetId: null,
          sets: [{ setType: 'normal', targetWeightKg: 80, targetReps: 8, targetDurationS: null }],
        },
      ],
    });
    expect((await routines.get(id))?.exercises[0]?.sets[0]?.targetWeightKg).toBe(80);

    await routines.save(id, { name: 'push A', notes: null, exercises: [] });
    expect((await routines.get(id))?.name).toBe('push A');
    expect((await routines.get(id))?.exercises).toHaveLength(0);

    const copyId = await routines.duplicate(await lowerRoutineId());
    expect((await routines.get(copyId))?.exercises).toHaveLength(8);
    expect((await routines.get(copyId))?.name).toBe('lower 1 (copia)');

    const ids = (await routines.list()).map((r) => r.id).reverse();
    await routines.reorder(ids);
    expect((await routines.list()).map((r) => r.id)).toEqual(ids);
  });
});

describe('pasos por día', () => {
  const ctx = { sex: 'male' as const, heightCm: 180, weightKg: 80, stepGoal: 10000, today: '2026-11-04' };

  it('guarda días con distancia, kcal y objetivo', async () => {
    const repo = new SqliteStepDayRepository(db);
    await repo.saveDays(
      [
        { localDate: '2026-11-03', steps: 10000, source: 'healthkit' },
        { localDate: '2026-11-04', steps: 4000, source: 'healthkit' },
      ],
      ctx,
    );
    const days = await repo.range('2026-11-01', '2026-11-30');
    expect(days.map((d) => d.steps)).toEqual([10000, 4000]);
    expect(days[0]?.distanceM).toBeCloseTo(7470);
    expect(days[0]?.kcal).toBeCloseTo(298.8, 1);
    expect(await repo.lastDateFrom('healthkit')).toBe('2026-11-04');
  });

  it('no suma fuentes: un día de Salud no se pisa con menos pasos del sensor', async () => {
    const repo = new SqliteStepDayRepository(db);
    await repo.saveDays([{ localDate: '2026-11-03', steps: 9000, source: 'healthkit' }], ctx);
    await repo.saveDays([{ localDate: '2026-11-03', steps: 8800, source: 'pedometer' }], ctx);
    const day = await repo.get('2026-11-03');
    expect(day?.steps).toBe(9000);
    expect(day?.source).toBe('healthkit');
  });

  it('cambiar el objetivo no recolorea el pasado', async () => {
    const repo = new SqliteStepDayRepository(db);
    await repo.saveDays([{ localDate: '2026-11-03', steps: 9000, source: 'healthkit' }], { ...ctx, today: '2026-11-03' });
    await repo.saveDays([{ localDate: '2026-11-03', steps: 9500, source: 'healthkit' }], { ...ctx, stepGoal: 8000 });
    expect((await repo.get('2026-11-03'))?.goalSnapshot).toBe(10000);
    await repo.saveDays([{ localDate: '2026-11-04', steps: 100, source: 'healthkit' }], { ...ctx, stepGoal: 8000 });
    expect((await repo.get('2026-11-04'))?.goalSnapshot).toBe(8000);
  });
});

describe('comidas', () => {
  const arroz = { name: 'Arroz blanco', grams: 180, kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, aiEstimated: true };
  const pollo = { name: 'Pechuga de pollo', grams: 150, kcalPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, aiEstimated: true };
  const draft = (localDate: string, eatenAt: number) => ({
    localDate,
    mealType: 'lunch' as const,
    eatenAt,
    source: 'photo' as const,
    photoUri: 'file:///foto.jpg',
    aiProvider: 'gemini' as const,
    items: [arroz, pollo],
  });

  it('se guardan con sus alimentos y suman al día', async () => {
    const meals = new SqliteMealRepository(db);
    await meals.create(draft('2026-11-04', new Date(2026, 10, 4, 14, 0).getTime()));
    const today = await meals.byDate('2026-11-04');
    expect(today).toHaveLength(1);
    expect(today[0]?.items.map((i) => i.name)).toEqual(['Arroz blanco', 'Pechuga de pollo']);
    const [summary] = await meals.daySummaries('2026-11-01', '2026-11-30');
    expect(summary?.kcal).toBeCloseTo(234 + 247.5);
    expect(summary?.protein).toBeCloseTo(4.86 + 46.5);
  });

  it('corregir gramos recalcula los totales', async () => {
    const meals = new SqliteMealRepository(db);
    const id = await meals.create(draft('2026-11-04', Date.now()));
    await meals.update(id, { ...draft('2026-11-04', Date.now()), items: [{ ...arroz, grams: 90 }] });
    const [summary] = await meals.daySummaries('2026-11-04', '2026-11-04');
    expect(summary?.kcal).toBeCloseTo(117);
    expect((await meals.get(id))?.items).toHaveLength(1);
  });

  it('23:59 y 00:01 caen en días distintos', async () => {
    const meals = new SqliteMealRepository(db);
    await meals.create(draft('2026-11-04', new Date(2026, 10, 4, 23, 59).getTime()));
    await meals.create(draft('2026-11-05', new Date(2026, 10, 5, 0, 1).getTime()));
    const summaries = await meals.daySummaries('2026-11-01', '2026-11-30');
    expect(summaries.map((s) => s.localDate)).toEqual(['2026-11-05', '2026-11-04']);
  });

  it('borrar una comida la quita del día', async () => {
    const meals = new SqliteMealRepository(db);
    const id = await meals.create(draft('2026-11-04', Date.now()));
    await meals.softDelete(id);
    expect(await meals.byDate('2026-11-04')).toHaveLength(0);
    expect(await meals.daySummaries('2026-11-04', '2026-11-04')).toHaveLength(0);
  });

  it('la galería trae solo las comidas con foto, la más reciente primero', async () => {
    const meals = new SqliteMealRepository(db);
    const base = draft('2026-11-04', 1000);
    await meals.create({ ...base, source: 'manual', photoUri: null });
    await meals.create({ ...base, eatenAt: 2000, source: 'photo', photoUri: 'file:///a/meal-photos/uno.jpg' });
    await meals.create({ ...base, eatenAt: 3000, source: 'photo', photoUri: 'file:///b/meal-photos/dos.jpg' });
    const deleted = await meals.create({ ...base, eatenAt: 4000, source: 'photo', photoUri: 'file:///b/meal-photos/tres.jpg' });
    await meals.softDelete(deleted);
    const gallery = await meals.withPhotos();
    expect(gallery.map((m) => m.photoUri)).toEqual(['file:///b/meal-photos/dos.jpg', 'file:///a/meal-photos/uno.jpg']);
    expect(gallery[0]?.items).toHaveLength(2);
  });

  it('alimentos recientes sin repetir', async () => {
    const meals = new SqliteMealRepository(db);
    await meals.create(draft('2026-11-03', Date.now()));
    await meals.create(draft('2026-11-04', Date.now()));
    expect((await meals.recentFoods(10)).map((f) => f.name).sort()).toEqual(['Arroz blanco', 'Pechuga de pollo']);
  });

  it('fotos pendientes: crear, fallar y resolver', async () => {
    const pending = new SqlitePendingPhotoRepository(db);
    const id = await pending.create({ photoUri: 'file:///p.jpg', mealType: 'dinner', localDate: '2026-11-04', capturedAt: 1, lastError: 'Sin conexión' });
    await pending.markFailed(id, 'Sin conexión');
    expect((await pending.get(id))?.attempts).toBe(1);
    expect((await pending.get(id))?.status).toBe('failed');
    await pending.resolve(id);
    expect(await pending.list()).toHaveLength(0);
  });
});

describe('ejercicios propios', () => {
  it('se crean, se buscan sin tildes y se editan', async () => {
    const created = await exercises.create({
      name: 'Remo Gironda (polea)',
      muscleGroup: 'back',
      equipment: 'cable',
      trackingType: 'weight_reps',
      defaultRestSeconds: 90,
      notes: null,
    });
    expect(created.isCustom).toBe(true);
    expect(created.searchName).toBe('remo gironda (polea)');
    await exercises.update(created.id, { ...created, name: 'Remo Gironda' });
    expect((await exercises.get(created.id))?.name).toBe('Remo Gironda');
  });
});
