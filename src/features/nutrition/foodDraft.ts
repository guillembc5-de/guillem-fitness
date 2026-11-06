import { itemTotals, type Totals } from '@/domain/nutrition';
import type { FoodDraft, FoodItem, RecentFood } from '@/domain/nutritionTypes';
import { parseDecimal, toInputText } from '@/domain/parseNumber';

/** Alimento en edición: los números van como texto mientras se escriben. */
export type FoodRow = {
  key: string;
  name: string;
  grams: string;
  kcal100: string;
  protein100: string;
  carbs100: string;
  fat100: string;
  aiEstimated: boolean;
  /** Lo que propuso la IA antes de tus correcciones (para aprender al guardar). */
  aiName: string | null;
  aiGrams: number | null;
  /** Qué se ajustó con lo aprendido de comidas anteriores. */
  learned: ('values' | 'portion')[];
};

let counter = 0;
const nextKey = () => `f${++counter}`;

export function rowFromDraft(
  d: FoodDraft | FoodItem | RecentFood,
  aiEstimated = false,
  ai: { aiName: string; aiGrams: number; learned: FoodRow['learned'] } | null = null,
): FoodRow {
  return {
    key: nextKey(),
    name: d.name,
    grams: toInputText(d.grams, 0),
    kcal100: toInputText(d.kcalPer100g, 0),
    protein100: toInputText(d.proteinPer100g, 1),
    carbs100: toInputText(d.carbsPer100g, 1),
    fat100: toInputText(d.fatPer100g, 1),
    aiEstimated: 'aiEstimated' in d ? d.aiEstimated : aiEstimated,
    aiName: ai?.aiName ?? null,
    aiGrams: ai?.aiGrams ?? null,
    learned: ai?.learned ?? [],
  };
}

export function emptyRow(): FoodRow {
  return { key: nextKey(), name: '', grams: '', kcal100: '', protein100: '', carbs100: '', fat100: '', aiEstimated: false, aiName: null, aiGrams: null, learned: [] };
}

/** Convierte la fila en alimento guardable, o null si falta el nombre o los gramos. */
export function rowToDraft(row: FoodRow): FoodDraft | null {
  const grams = parseDecimal(row.grams);
  if (row.name.trim() === '' || grams === null || grams <= 0) return null;
  return {
    name: row.name.trim(),
    grams,
    kcalPer100g: parseDecimal(row.kcal100) ?? 0,
    proteinPer100g: parseDecimal(row.protein100) ?? 0,
    carbsPer100g: parseDecimal(row.carbs100) ?? 0,
    fatPer100g: parseDecimal(row.fat100) ?? 0,
    aiEstimated: row.aiEstimated,
  };
}

/** Totales en vivo de la fila (0 si aún no hay gramos). */
export function rowTotals(row: FoodRow): Totals {
  return itemTotals({
    grams: parseDecimal(row.grams) ?? 0,
    kcalPer100g: parseDecimal(row.kcal100) ?? 0,
    proteinPer100g: parseDecimal(row.protein100) ?? 0,
    carbsPer100g: parseDecimal(row.carbs100) ?? 0,
    fatPer100g: parseDecimal(row.fat100) ?? 0,
  });
}
