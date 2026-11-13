import { count, eq, inArray } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { foodItem, meal, profile, routine, stepDay, workout, workoutExercise, workoutSet } from '@/data/db/schema';
import { addDays, fromLocalDate, todayLocalDate, type LocalDate } from '@/domain/localDay';
import { stepsDistanceMeters, stepsKcal } from '@/domain/steps';
import type { MealType } from '@/domain/enums';
import { newId } from '@/lib/ids';

import { SEED_EXERCISES, seedExerciseId } from './exercises';
import { SEED_ROUTINES } from './routines';

/**
 * Datos de prueba: 2 años de entrenos, pasos y comidas para comprobar que
 * listas y gráficas van fluidas. Todo lleva is_demo = 1 y se borra de golpe
 * sin tocar tus datos reales. Es determinista (misma semilla, mismos datos).
 */

export const DEMO_DAYS = 730;

export type DemoCounts = { workouts: number; stepDays: number; meals: number };

/** Generador pseudoaleatorio con semilla (mulberry32). */
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Food = { name: string; kcal: number; p: number; c: number; f: number; grams: [number, number] };

const MENU: Record<MealType, Food[][]> = {
  breakfast: [
    [
      { name: 'Copos de avena', kcal: 372, p: 13, c: 60, f: 7, grams: [50, 80] },
      { name: 'Leche semidesnatada', kcal: 46, p: 3.2, c: 4.7, f: 1.6, grams: [200, 300] },
      { name: 'Plátano', kcal: 89, p: 1.1, c: 23, f: 0.3, grams: [100, 130] },
    ],
    [
      { name: 'Pan integral', kcal: 247, p: 13, c: 41, f: 3.4, grams: [60, 100] },
      { name: 'Huevos revueltos', kcal: 148, p: 10, c: 1.6, f: 11, grams: [100, 150] },
      { name: 'Aceite de oliva', kcal: 884, p: 0, c: 0, f: 100, grams: [5, 10] },
    ],
  ],
  lunch: [
    [
      { name: 'Arroz blanco', kcal: 130, p: 2.7, c: 28, f: 0.3, grams: [150, 250] },
      { name: 'Pechuga de pollo', kcal: 165, p: 31, c: 0, f: 3.6, grams: [130, 200] },
      { name: 'Ensalada verde', kcal: 20, p: 1.3, c: 3, f: 0.2, grams: [80, 150] },
    ],
    [
      { name: 'Macarrones con tomate', kcal: 160, p: 5.5, c: 30, f: 2, grams: [250, 350] },
      { name: 'Atún en conserva', kcal: 198, p: 26, c: 0, f: 10, grams: [50, 80] },
    ],
    [{ name: 'Lentejas estofadas', kcal: 116, p: 9, c: 20, f: 0.4, grams: [300, 400] }],
  ],
  snack: [
    [
      { name: 'Yogur natural', kcal: 61, p: 3.5, c: 4.7, f: 3.3, grams: [125, 250] },
      { name: 'Manzana', kcal: 52, p: 0.3, c: 14, f: 0.2, grams: [150, 200] },
    ],
    [{ name: 'Batido de proteína', kcal: 380, p: 75, c: 8, f: 5, grams: [30, 40] }],
  ],
  dinner: [
    [
      { name: 'Salmón a la plancha', kcal: 208, p: 20, c: 0, f: 13, grams: [130, 180] },
      { name: 'Patata cocida', kcal: 87, p: 1.9, c: 20, f: 0.1, grams: [150, 250] },
    ],
    [
      { name: 'Tortilla francesa', kcal: 154, p: 11, c: 0.6, f: 12, grams: [100, 150] },
      { name: 'Ensalada de tomate', kcal: 25, p: 1, c: 4, f: 0.5, grams: [150, 200] },
    ],
  ],
};

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Genera los datos de prueba. `onProgress` recibe de 0 a 1. */
export async function generateDemoData(db: Db, onProgress?: (p: number) => void): Promise<DemoCounts> {
  const random = rng(20261104);
  const between = (min: number, max: number) => min + random() * (max - min);
  const p = db.select().from(profile).get();
  const ctx = { sex: p?.sex ?? 'male', heightCm: p?.heightCm ?? 180, weightKg: p?.weightKg ?? 80, stepGoal: p?.stepGoal ?? 10000 };

  const today = todayLocalDate();
  const first = addDays(today, -DEMO_DAYS);
  const realStepDates = new Set(db.select({ d: stepDay.localDate }).from(stepDay).all().map((r) => r.d));
  const existingRoutines = new Set(db.select({ id: routine.id }).from(routine).all().map((r) => r.id));
  const names = new Map(SEED_EXERCISES.map((e) => [e.slug, e.name] as const));

  const counts: DemoCounts = { workouts: 0, stepDays: 0, meals: 0 };
  const CHUNK = 30;

  for (let start = 0; start < DEMO_DAYS; start += CHUNK) {
    db.transaction((tx) => {
      for (let i = start; i < Math.min(start + CHUNK, DEMO_DAYS); i++) {
        const date: LocalDate = addDays(first, i);
        const midnight = fromLocalDate(date).getTime();
        const progress = i / DEMO_DAYS;
        const meta = () => ({ id: newId(), createdAt: midnight, updatedAt: midnight, deletedAt: null, isDemo: true });

        // Pasos: más los fines de semana, algún día flojo.
        if (!realStepDates.has(date)) {
          const weekend = [0, 6].includes(fromLocalDate(date).getDay());
          const steps = Math.round(between(weekend ? 6000 : 4000, weekend ? 18000 : 14000));
          tx.insert(stepDay)
            .values({
              ...meta(),
              localDate: date,
              steps,
              distanceM: stepsDistanceMeters(steps, ctx.heightCm, ctx.sex),
              kcal: stepsKcal(steps, ctx.weightKg, ctx.heightCm, ctx.sex),
              source: 'demo',
              goalSnapshot: ctx.stepGoal,
            })
            .run();
          counts.stepDays += 1;
        }

        // Entrenos: lunes y jueves lower, martes y viernes upper (85 % de asistencia).
        const weekday = fromLocalDate(date).getDay();
        const routineIndex = weekday === 1 || weekday === 4 ? 0 : weekday === 2 || weekday === 5 ? 1 : -1;
        const r = SEED_ROUTINES[routineIndex];
        if (r && random() < 0.85) {
          const startedAt = midnight + (18 * 60 + Math.round(between(0, 90))) * 60_000;
          const workoutId = newId();
          tx.insert(workout)
            .values({
              ...meta(),
              id: workoutId,
              routineId: existingRoutines.has(r.id) ? r.id : null,
              name: r.name,
              startedAt,
              endedAt: startedAt + Math.round(between(55, 80)) * 60_000,
              localDate: date,
              restEndsAt: null,
              restNotificationId: null,
              notes: null,
            })
            .run();
          // Progresión: del 80 % al 105 % del peso actual a lo largo de 2 años.
          const factor = 0.8 + 0.25 * progress;
          r.exercises.forEach((re, ei) => {
            const weId = newId();
            tx.insert(workoutExercise)
              .values({
                id: weId,
                createdAt: startedAt,
                updatedAt: startedAt,
                deletedAt: null,
                workoutId,
                exerciseId: seedExerciseId(re.exerciseSlug),
                exerciseNameSnapshot: names.get(re.exerciseSlug) ?? re.exerciseSlug,
                position: ei,
                restSeconds: re.restSeconds ?? 150,
                notes: null,
              })
              .run();
            re.sets.forEach((s, si) => {
              const target = s.targetWeightKg ?? 0;
              const weight = s.setType === 'warmup' ? target : Math.max(0, Math.round((target * factor * between(0.97, 1.03)) / 2.5) * 2.5);
              tx.insert(workoutSet)
                .values({
                  id: newId(),
                  createdAt: startedAt,
                  updatedAt: startedAt,
                  deletedAt: null,
                  workoutExerciseId: weId,
                  position: si,
                  setType: s.setType,
                  weightKg: weight,
                  reps: Math.max(1, (s.targetReps ?? 10) + Math.round(between(-2, 2))),
                  durationS: null,
                  completedAt: startedAt + (ei * 10 + si * 3) * 60_000,
                })
                .run();
            });
          });
          counts.workouts += 1;
        }

        // Comidas: desayuno, comida y cena; merienda la mitad de los días.
        const plan: [MealType, number][] = [
          ['breakfast', 8.5],
          ['lunch', 14.5],
          ['dinner', 21.5],
        ];
        if (random() < 0.5) plan.push(['snack', 17.5]);
        for (const [type, hour] of plan) {
          const options = MENU[type];
          const foods = options[Math.floor(random() * options.length)] ?? [];
          const mealId = newId();
          tx.insert(meal)
            .values({
              ...meta(),
              id: mealId,
              localDate: date,
              mealType: type,
              eatenAt: midnight + Math.round(hour * 60 + between(-30, 30)) * 60_000,
              source: 'manual',
              photoUri: null,
              aiProvider: null,
            })
            .run();
          foods.forEach((f, position) => {
            tx.insert(foodItem)
              .values({
                id: newId(),
                createdAt: midnight,
                updatedAt: midnight,
                deletedAt: null,
                mealId,
                name: f.name,
                grams: Math.round(between(f.grams[0], f.grams[1])),
                kcalPer100g: f.kcal,
                proteinPer100g: f.p,
                carbsPer100g: f.c,
                fatPer100g: f.f,
                aiEstimated: false,
                position,
              })
              .run();
          });
          counts.meals += 1;
        }
      }
    });
    onProgress?.(Math.min(1, (start + CHUNK) / DEMO_DAYS));
    await yieldToUi();
  }
  return counts;
}

export function countDemoData(db: Db): DemoCounts {
  return {
    workouts: db.select({ n: count() }).from(workout).where(eq(workout.isDemo, true)).get()?.n ?? 0,
    stepDays: db.select({ n: count() }).from(stepDay).where(eq(stepDay.isDemo, true)).get()?.n ?? 0,
    meals: db.select({ n: count() }).from(meal).where(eq(meal.isDemo, true)).get()?.n ?? 0,
  };
}

/** Borra todos los datos de prueba (sus series y alimentos caen en cascada). Tus datos reales no se tocan. */
export function clearDemoData(db: Db): DemoCounts {
  const counts = countDemoData(db);
  db.transaction((tx) => {
    const workoutIds = tx.select({ id: workout.id }).from(workout).where(eq(workout.isDemo, true)).all().map((r) => r.id);
    if (workoutIds.length > 0) {
      const weIds = tx
        .select({ id: workoutExercise.id })
        .from(workoutExercise)
        .where(inArray(workoutExercise.workoutId, workoutIds))
        .all()
        .map((r) => r.id);
      if (weIds.length > 0) tx.delete(workoutSet).where(inArray(workoutSet.workoutExerciseId, weIds)).run();
      tx.delete(workoutExercise).where(inArray(workoutExercise.workoutId, workoutIds)).run();
      tx.delete(workout).where(eq(workout.isDemo, true)).run();
    }
    const mealIds = tx.select({ id: meal.id }).from(meal).where(eq(meal.isDemo, true)).all().map((r) => r.id);
    if (mealIds.length > 0) {
      tx.delete(foodItem).where(inArray(foodItem.mealId, mealIds)).run();
      tx.delete(meal).where(eq(meal.isDemo, true)).run();
    }
    tx.delete(stepDay).where(eq(stepDay.isDemo, true)).run();
  });
  return counts;
}
