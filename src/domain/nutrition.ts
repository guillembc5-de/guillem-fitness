import type { MealType } from './enums';

/** Valores nutricionales por 100 g: la base para recalcular al cambiar los gramos. */
export type Per100 = {
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };

export const ZERO_TOTALS: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Totales de una ración: gramos × valor por 100 g / 100. */
export function itemTotals(item: Per100 & { grams: number }): Totals {
  const f = Math.max(0, item.grams) / 100;
  return {
    kcal: item.kcalPer100g * f,
    protein: item.proteinPer100g * f,
    carbs: item.carbsPer100g * f,
    fat: item.fatPer100g * f,
  };
}

export function sumTotals(list: readonly Totals[]): Totals {
  return list.reduce(
    (acc, t) => ({ kcal: acc.kcal + t.kcal, protein: acc.protein + t.protein, carbs: acc.carbs + t.carbs, fat: acc.fat + t.fat }),
    ZERO_TOTALS,
  );
}

/**
 * La IA da kcal y macros de la ración entera; se guardan por 100 g para que
 * al corregir los gramos todo se recalcule en proporción exacta.
 */
export function per100FromPortion(grams: number, portion: Totals): Per100 {
  if (!(grams > 0)) return { kcalPer100g: 0, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0 };
  const f = 100 / grams;
  return {
    kcalPer100g: portion.kcal * f,
    proteinPer100g: portion.protein * f,
    carbsPer100g: portion.carbs * f,
    fatPer100g: portion.fat * f,
  };
}

/** Límites razonables para valores que vienen de la IA (por 100 g). */
const LIMITS = { grams: [1, 3000], kcal: [0, 900], macro: [0, 100] } as const;

function clamp(v: number, [min, max]: readonly [number, number]): number {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

/**
 * Normaliza un alimento estimado por la IA: gramos y valores por 100 g dentro
 * de límites físicos (nada tiene más de 900 kcal ni más de 100 g de un macro
 * por cada 100 g). Evita que un dato inventado descuadre el día.
 */
export function sanitizeEstimate(grams: number, portion: Totals): { grams: number } & Per100 {
  const g = Math.round(clamp(grams, LIMITS.grams));
  const p = per100FromPortion(grams > 0 ? grams : g, portion);
  return {
    grams: g,
    kcalPer100g: clamp(p.kcalPer100g, LIMITS.kcal),
    proteinPer100g: clamp(p.proteinPer100g, LIMITS.macro),
    carbsPer100g: clamp(p.carbsPer100g, LIMITS.macro),
    fatPer100g: clamp(p.fatPer100g, LIMITS.macro),
  };
}

/**
 * Comida del día según la hora local (horarios españoles):
 * desayuno hasta las 11:30, comida hasta las 16:30, merienda hasta las 20:00 y cena después.
 */
export function mealTypeForTime(ms: number): MealType {
  const d = new Date(ms);
  const minutes = d.getHours() * 60 + d.getMinutes();
  if (minutes < 11 * 60 + 30) return 'breakfast';
  if (minutes < 16 * 60 + 30) return 'lunch';
  if (minutes < 20 * 60) return 'snack';
  return 'dinner';
}

export type DailyBalance = {
  target: number;
  eaten: number;
  /** kcal quemadas caminando. */
  steps: number;
  /** kcal quemadas en los entrenos. */
  workouts: number;
  /** Energía activa de Fitness (Apple Watch), si llegó. */
  fitness: number | null;
  /** true si el quemado es el de Fitness (mayor que la estimación de pasos + entrenos). */
  usesFitness: boolean;
  /** Total quemado: pasos + entrenos, o Fitness si es mayor (nunca se suman). */
  burned: number;
  /** Lo que queda: objetivo − comido + quemado. Negativo = te has pasado. */
  remaining: number;
  /** Neto del día: comido − quemado. */
  net: number;
};

/**
 * Balance del día: lo comido suma (verde); lo quemado resta (rojo).
 * Quemado = pasos + entrenos (estimación de la app). Si llega la energía
 * activa de Fitness, que ya incluye caminar y entrenar, se usa la mayor de
 * las dos cifras: así no se cuenta dos veces y un día sin reloj no resta de menos.
 */
export function dailyBalance(target: number, eaten: number, steps: number, workouts = 0, fitness: number | null = null): DailyBalance {
  const estimate = steps + workouts;
  const usesFitness = fitness !== null && fitness > estimate;
  const burned = usesFitness ? fitness : estimate;
  const net = eaten - burned;
  return { target, eaten, steps, workouts, fitness, usesFitness, burned, net, remaining: target - net };
}
