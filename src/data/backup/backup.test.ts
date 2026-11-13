/**
 * @jest-environment node
 */
import { SqliteMealRepository } from '@/data/repositories/sqlite/mealRepository';
import { SqliteProfileRepository } from '@/data/repositories/sqlite/profileRepository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite/workoutRepository';
import { SqliteRoutineRepository } from '@/data/repositories/sqlite/routineRepository';
import { SqliteStepDayRepository } from '@/data/repositories/sqlite/stepDayRepository';
import { seedDatabase } from '@/data/seed/seed';
import { SEED_ROUTINES } from '@/data/seed/routines';
import { createTestDb } from '@/test/testDb';
import type { Db } from '@/data/db/client';

import { BackupError, exportBackup, importBackup } from './backup';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove: () => undefined }) }));

const profileInput = {
  sex: 'male' as const,
  birthYear: 2001,
  heightCm: 180,
  weightKg: 80,
  activityLevel: 'light' as const,
  goal: 'maintain' as const,
  goalRateKgWeek: 0.5,
  stepGoal: 10000,
  weightUnit: 'kg' as const,
  defaultRestSeconds: 150,
  aiProvider: 'gemini' as const,
  geminiModel: 'gemini-flash-latest',
  claudeModel: 'claude-haiku-5-5',
  onboardingCompletedAt: 1,
};

async function populated(): Promise<Db> {
  const db = await createTestDb();
  seedDatabase(db);
  await new SqliteProfileRepository(db).save(profileInput);
  const routines = await new SqliteRoutineRepository(db).list();
  const workouts = new SqliteWorkoutRepository(db);
  const id = await workouts.start({ routineId: routines[0]?.id ?? null, name: 'lower 1', defaultRestSeconds: 150 });
  const w = await workouts.get(id);
  for (const s of w?.exercises[1]?.sets ?? []) await workouts.completeSet(s.id, { weightKg: s.weightKg, reps: s.reps, durationS: null });
  await workouts.finish(id);
  await new SqliteStepDayRepository(db).saveDays([{ localDate: '2026-11-03', steps: 9000, source: 'healthkit' }], {
    sex: 'male',
    heightCm: 180,
    weightKg: 80,
    stepGoal: 10000,
    today: '2026-11-04',
  });
  await new SqliteMealRepository(db).create({
    localDate: '2026-11-04',
    mealType: 'lunch',
    eatenAt: 1,
    source: 'manual',
    photoUri: null,
    aiProvider: null,
    items: [{ name: 'Arroz', grams: 180, kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, aiEstimated: false }],
  });
  return db;
}

describe('exportar e importar en JSON', () => {
  it('ida y vuelta a un móvil nuevo: no se pierde nada', async () => {
    const source = await populated();
    const file = JSON.parse(JSON.stringify(exportBackup(source))) as unknown;

    const target = await createTestDb();
    const result = importBackup(target, file);
    expect(result.inserted).toBeGreaterThan(150);

    expect((await new SqliteProfileRepository(target).get())?.weightKg).toBe(80);
    expect(await new SqliteRoutineRepository(target).list()).toHaveLength(SEED_ROUTINES.length);
    const [workout] = await new SqliteWorkoutRepository(target).list();
    expect(workout?.setCount).toBe(3);
    expect((await new SqliteStepDayRepository(target).get('2026-11-03'))?.steps).toBe(9000);
    expect(await new SqliteMealRepository(target).byDate('2026-11-04')).toHaveLength(1);
  });

  it('importar dos veces no duplica nada', async () => {
    const source = await populated();
    const file = exportBackup(source);
    const target = await createTestDb();
    importBackup(target, file);
    const again = importBackup(target, file);
    expect(again.inserted).toBe(0);
    expect(again.updated).toBe(0);
    expect(await new SqliteMealRepository(target).byDate('2026-11-04')).toHaveLength(1);
  });

  it('gana el cambio más reciente', async () => {
    const source = await populated();
    const file = exportBackup(source);
    const target = await createTestDb();
    importBackup(target, file);
    // En el móvil nuevo cambias el peso después de exportar.
    await new SqliteProfileRepository(target).save({ ...profileInput, weightKg: 78 });
    importBackup(target, file);
    expect((await new SqliteProfileRepository(target).get())?.weightKg).toBe(78);
  });

  it('un perfil distinto ya creado se sustituye si la copia es más reciente', async () => {
    const target = await createTestDb();
    await new SqliteProfileRepository(target).save({ ...profileInput, weightKg: 60 });
    await new Promise((r) => setTimeout(r, 5));
    const source = await populated();
    importBackup(target, exportBackup(source));
    expect((await new SqliteProfileRepository(target).get())?.weightKg).toBe(80);
  });

  it('rechaza archivos que no son una copia válida, sin tocar nada', async () => {
    const target = await createTestDb();
    expect(() => importBackup(target, { hola: 1 })).toThrow(BackupError);
    const bad = exportBackup(await populated());
    bad.tables.meal = [{ id: 'x', createdAt: 1, updatedAt: 1, columnaInventada: 'a' }];
    expect(() => importBackup(target, bad)).toThrow(/columna desconocida/);
    expect(await new SqliteProfileRepository(target).get()).toBeNull();
  });

  it('si una fila falla a mitad, no se importa nada (transacción)', async () => {
    const target = await createTestDb();
    const file = exportBackup(await populated());
    // Un alimento que apunta a una comida que no existe rompe la clave foránea.
    file.tables.foodItem = [...(file.tables.foodItem ?? []), { ...(file.tables.foodItem?.[0] ?? {}), id: 'roto', mealId: 'no-existe' }];
    expect(() => importBackup(target, file)).toThrow();
    expect(await new SqliteProfileRepository(target).get()).toBeNull();
  });
});
