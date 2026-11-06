import { sanitizeEstimate } from '@/domain/nutrition';
import type { FoodDraft } from '@/domain/nutritionTypes';

import { VisionError, type FoodAnalysis, type NutritionVisionProvider } from './types';

export type AnalysisResult =
  | { status: 'ok'; items: FoodDraft[] }
  | { status: 'no_food' }
  | { status: 'error'; error: VisionError };

/**
 * Analiza una foto con UN reintento si la IA devuelve JSON roto o inválido.
 * Si vuelve a fallar, el resultado es un error y la pantalla ofrece entrada manual.
 * Los fallos de red no se reintentan aquí: la foto se puede guardar como pendiente.
 */
export async function analyzeFood(provider: NutritionVisionProvider, jpegBase64: string, hints?: string): Promise<AnalysisResult> {
  let lastError: VisionError | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return toResult(await provider.analyze(jpegBase64, hints));
    } catch (e) {
      lastError = e instanceof VisionError ? e : new VisionError('invalid_response', e instanceof Error ? e.message : String(e));
      if (lastError.kind !== 'invalid_response') break;
    }
  }
  return { status: 'error', error: lastError ?? new VisionError('invalid_response', 'Sin respuesta') };
}

function toResult(analysis: FoodAnalysis): AnalysisResult {
  const items = analysis.items
    .filter((i) => i.name.trim() !== '' && i.grams > 0)
    .map(
      (i): FoodDraft => ({
        name: i.name.trim(),
        aiEstimated: true,
        ...sanitizeEstimate(i.grams, { kcal: i.kcal, protein: i.protein_g, carbs: i.carbs_g, fat: i.fat_g }),
      }),
    );
  if (!analysis.food_detected || items.length === 0) return { status: 'no_food' };
  return { status: 'ok', items };
}
