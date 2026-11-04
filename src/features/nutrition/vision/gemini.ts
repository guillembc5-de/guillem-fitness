import { z } from 'zod';

import {
  FOOD_ANALYSIS_JSON_SCHEMA,
  FOOD_PROMPT,
  FoodAnalysisSchema,
  VisionError,
  type FoodAnalysis,
  type NutritionVisionProvider,
} from './types';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const TIMEOUT_MS = 45_000;

const ResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional() })).optional() }).optional(),
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});

const ErrorSchema = z.object({ error: z.object({ message: z.string().optional(), status: z.string().optional() }) });

async function request(url: string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey, ...init.headers },
    });
  } catch {
    // Red caída, modo avión o tiempo agotado.
    throw new VisionError('offline', 'Sin conexión');
  } finally {
    clearTimeout(timer);
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (response.ok) return body;

  const parsed = ErrorSchema.safeParse(body);
  const message = parsed.success ? (parsed.data.error.message ?? `HTTP ${response.status}`) : `HTTP ${response.status}`;
  const status = parsed.success ? parsed.data.error.status : undefined;
  if (response.status === 401 || response.status === 403 || /API key/i.test(message) || status === 'UNAUTHENTICATED') {
    throw new VisionError('auth', message);
  }
  if (response.status === 429) throw new VisionError('rate_limit', message);
  if (response.status >= 500) throw new VisionError('server', message);
  throw new VisionError('bad_request', message);
}

/** Gemini (Google). Por defecto: capa gratuita con el modelo Flash. */
export function createGeminiProvider(apiKey: string, model: string): NutritionVisionProvider {
  const modelPath = `${BASE_URL}/models/${encodeURIComponent(model)}`;
  return {
    name: 'Gemini',

    async analyze(jpegBase64: string): Promise<FoodAnalysis> {
      const body = await request(`${modelPath}:generateContent`, apiKey, {
        method: 'POST',
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: jpegBase64 } }, { text: FOOD_PROMPT }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: FOOD_ANALYSIS_JSON_SCHEMA,
            temperature: 0.2,
          },
        }),
      });
      const parsed = ResponseSchema.safeParse(body);
      if (!parsed.success) throw new VisionError('invalid_response', 'Respuesta inesperada');
      if (parsed.data.promptFeedback?.blockReason) throw new VisionError('refused', parsed.data.promptFeedback.blockReason);
      const text = parsed.data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new VisionError('invalid_response', 'JSON roto');
      }
      const analysis = FoodAnalysisSchema.safeParse(json);
      if (!analysis.success) throw new VisionError('invalid_response', 'El JSON no cumple el esquema');
      return analysis.data;
    },

    async testConnection(): Promise<void> {
      await request(modelPath, apiKey, { method: 'GET' });
    },
  };
}
