import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

import { FOOD_PROMPT, FoodAnalysisSchema, VisionError, type FoodAnalysis, type NutritionVisionProvider } from './types';

function toVisionError(error: unknown): VisionError {
  if (error instanceof VisionError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new VisionError('auth', error.message);
  }
  if (error instanceof Anthropic.RateLimitError) return new VisionError('rate_limit', error.message);
  if (error instanceof Anthropic.APIConnectionError) return new VisionError('offline', error.message);
  if (error instanceof Anthropic.BadRequestError || error instanceof Anthropic.NotFoundError) {
    return new VisionError('bad_request', error.message);
  }
  if (error instanceof Anthropic.APIError) return new VisionError('server', error.message);
  // La salida estructurada no se pudo interpretar.
  return new VisionError('invalid_response', error instanceof Error ? error.message : String(error));
}

/** Claude (Anthropic), con el SDK oficial y salida estructurada validada con zod. */
export function createClaudeProvider(apiKey: string, model: string): NutritionVisionProvider {
  const client = new Anthropic({
    apiKey,
    // La clave vive en el móvil (llavero) por diseño: es una app personal.
    // Si se publicara, la llamada debería pasar por un servidor propio (ver README).
    dangerouslyAllowBrowser: true,
    timeout: 45_000,
    maxRetries: 1,
  });

  return {
    name: 'Claude',

    async analyze(jpegBase64: string, hints?: string): Promise<FoodAnalysis> {
      try {
        const response = await client.messages.parse({
          model,
          max_tokens: 4096,
          output_config: { format: zodOutputFormat(FoodAnalysisSchema), effort: 'low' },
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegBase64 } },
                { type: 'text', text: hints ? `${FOOD_PROMPT}\n\n${hints}` : FOOD_PROMPT },
              ],
            },
          ],
        });
        if (response.stop_reason === 'refusal') throw new VisionError('refused', 'Claude no ha analizado la foto');
        if (response.stop_reason === 'max_tokens' || !response.parsed_output) {
          throw new VisionError('invalid_response', 'Respuesta incompleta');
        }
        return response.parsed_output;
      } catch (error) {
        throw toVisionError(error);
      }
    },

    async testConnection(): Promise<void> {
      try {
        await client.models.retrieve(model);
      } catch (error) {
        throw toVisionError(error);
      }
    },
  };
}
