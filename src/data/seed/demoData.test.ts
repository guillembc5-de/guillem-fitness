/**
 * @jest-environment node
 */
import { SqliteExerciseRepository } from '@/data/repositories/sqlite/exerciseRepository';
import { SqliteMealRepository } from '@/data/repositories/sqlite/mealRepository';
import { SqliteStepDayRepository } from '@/data/repositories/sqlite/stepDayRepository';
import { SqliteWorkoutRepository } from '@/data/repositories/sqlite/workoutRepository';
import { addDays, todayLocalDate } from '@/domain/localDay';
import { streak } from '@/domain/steps';
import { sessionPoints as exercisePoints } from '@/domain/workout';
import { createTestDb } from '@/test/testDb';

import { clearDemoData, countDemoData, DEMO_DAYS, generateDemoData } from './demoData';
import { seedExerciseId } from './exercises';
import { seedDatabase } from './seed';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove: () => undefined }) }));

describe('datos de prueba (2 años)', () => {
  it('genera, se consultan rápido y se borran sin tocar los datos reales', async () => {
    const db = await createTestDb();
    seedDatabase(db);
    const today = todayLocalDate();
    // Un día real de pasos y una comida real.
    await new SqliteStepDayRepository(db).saveDays([{ localDate: addDays(today, -1), steps: 1234, source: 'healthkit' }], {
      sex: 'male',
      heightCm: 180,
      weightKg: 80,
      stepGoal: 10000,
      today,
    });
    const meals = new SqliteMealRepository(db);
    await meals.create({
      localDate: today,
      mealType: 'lunch',
      eatenAt: Date.now(),
      source: 'manual',
      photoUri: null,
      aiProvider: null,
      items: [{ name: 'Real', grams: 100, kcalPer100g: 100, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, aiEstimated: false }],
    });

    const counts = await generateDemoData(db);
    expect(counts.stepDays).toBe(DEMO_DAYS - 1); // el día real no se pisa
    expect(counts.workouts).toBeGreaterThan(300);
    expect(counts.meals).toBeGreaterThan(DEMO_DAYS * 3);

    // Consultas de las pantallas con 2 años de datos.
    const t0 = Date.now();
    const list = await new SqliteWorkoutRepository(db).list();
    const history = await new SqliteExerciseRepository(db).history(seedExerciseId('peso-muerto-rumano-barra'));
    const days = await new SqliteStepDayRepository(db).range(addDays(today, -400), today);
    const summaries = await meals.daySummaries(addDays(today, -730), today);
    const elapsed = Date.now() - t0;
    expect(list.length).toBe(counts.workouts);
    expect(exercisePoints(history.map((h) => ({ ...h }))).length).toBeGreaterThan(100);
    expect(streak(days.map((d) => ({ localDate: d.localDate, steps: d.steps, goal: d.goalSnapshot })), today)).toBeGreaterThanOrEqual(0);
    expect(summaries.length).toBeGreaterThan(700);
    // Margen amplio: en el PC tarda decenas de ms; lo importante es que no son segundos.
    expect(elapsed).toBeLessThan(3000);

    const cleared = clearDemoData(db);
    expect(cleared).toEqual(counts);
    expect(countDemoData(db)).toEqual({ workouts: 0, stepDays: 0, meals: 0 });
    expect((await new SqliteStepDayRepository(db).get(addDays(today, -1)))?.steps).toBe(1234);
    expect(await meals.byDate(today)).toHaveLength(1);
    expect(await new SqliteWorkoutRepository(db).list()).toHaveLength(0);
  });
});
