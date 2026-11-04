import type { AiProvider, Profile } from '@/domain/types';
import { getApiKey } from '@/lib/secrets';

import { createGeminiProvider } from './gemini';
import { VisionError, VISION_ERROR_TEXT, type NutritionVisionProvider } from './types';

/**
 * Crea el proveedor elegido en Perfil con su clave del llavero.
 * El SDK de Claude se carga bajo demanda: no penaliza el arranque de la app.
 */
export async function getVisionProvider(profile: Profile, which: AiProvider = profile.aiProvider): Promise<NutritionVisionProvider> {
  const key = await getApiKey(which);
  if (!key) throw new VisionError('no_key', VISION_ERROR_TEXT.no_key);
  if (which === 'gemini') return createGeminiProvider(key, profile.geminiModel);
  const { createClaudeProvider } = await import('./claude');
  return createClaudeProvider(key, profile.claudeModel);
}
