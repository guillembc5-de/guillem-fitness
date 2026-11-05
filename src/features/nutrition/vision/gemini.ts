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
/** Los modelos Gemini 3 «piensan» antes de responder: con una foto pueden tardar. */
const TIMEOUT_MS = 90_000;

/**
 * Modelos con capa gratuita y fotos, en orden de preferencia. Si el elegido no
 * está disponible para tu clave, se prueba el siguiente.
 */
export const GEMINI_FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'] as const;

/** Nombres antiguos que ya no sirven a claves nuevas (el primero era el valor por defecto de la app). */
const RETIRED_MODELS = new Set(['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash']);

/** El modelo elegido (si no está retirado) y después las alternativas, sin repetir. */
export function geminiModelCandidates(chosen: string): string[] {
  const first = chosen.trim();
  const list = first && !RETIRED_MODELS.has(first) ? [first, ...GEMINI_FALLBACK_MODELS] : [...GEMINI_FALLBACK_MODELS];
  return [...new Set(list)];
}

/** Error HTTP de Gemini, antes de traducirlo a un VisionError. */
export class GeminiHttpError extends Error {
  constructor(
    readonly httpStatus: number,
    message: string,
    readonly apiStatus?: string,
  ) {
    super(message);
    this.name = 'GeminiHttpError';
  }
}

function isAuthError(e: GeminiHttpError): boolean {
  return e.httpStatus === 401 || /API key/i.test(e.message) || e.apiStatus === 'UNAUTHENTICATED';
}

/**
 * El modelo no existe, está retirado, está saturado o tu clave no tiene cupo
 * gratis para él: hay que probar otro.
 */
export function isModelUnavailable(e: GeminiHttpError): boolean {
  if (isAuthError(e)) return false;
  if (e.httpStatus === 404) return true;
  // «This model is currently experiencing high demand» (saturado: suele ser temporal).
  if (e.httpStatus === 503 || e.apiStatus === 'UNAVAILABLE') return true;
  if (e.httpStatus === 429) return /limit:\s*0\b/i.test(e.message);
  if (e.httpStatus === 400 || e.httpStatus === 403) {
    return /\bmodels?\b.*(not found|not supported|no longer|deprecated|not available|unavailable)/i.test(e.message);
  }
  return false;
}

/** Google no acepta el esquema JSON enviado: se reintenta pidiendo el JSON solo con el texto. */
export function isSchemaRejected(e: GeminiHttpError): boolean {
  return e.httpStatus === 400 && /schema|Unknown name|Invalid JSON payload/i.test(e.message);
}

function toVisionError(e: unknown): VisionError {
  if (e instanceof VisionError) return e;
  if (!(e instanceof GeminiHttpError)) return new VisionError('invalid_response', e instanceof Error ? e.message : String(e));
  const detail = `${e.message} (HTTP ${e.httpStatus})`;
  if (isAuthError(e) || e.httpStatus === 403) return new VisionError('auth', detail);
  if (e.httpStatus === 429) return new VisionError('rate_limit', detail);
  if (e.httpStatus >= 500) return new VisionError('server', detail);
  return new VisionError('bad_request', detail);
}

const ResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ text: z.string().optional(), thought: z.boolean().optional() })).optional() }).optional(),
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
    throw new VisionError('offline', 'Sin conexión o la IA ha tardado demasiado');
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
  throw new GeminiHttpError(
    response.status,
    parsed.success ? (parsed.data.error.message ?? `HTTP ${response.status}`) : `HTTP ${response.status}`,
    parsed.success ? parsed.data.error.status : undefined,
  );
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Gemini (Google). Por defecto: capa gratuita con el modelo Flash. */
export function createGeminiProvider(apiKey: string, model: string): NutritionVisionProvider {
  const candidates = geminiModelCandidates(model);
  // Recuerda el modelo que funcionó para no repetir intentos fallidos en cada foto.
  let working: string | null = null;

  async function generate(parts: Part[], withSchema: boolean): Promise<unknown> {
    const order = working ? [working, ...candidates.filter((m) => m !== working)] : candidates;
    let lastError: unknown = null;
    for (const name of order) {
      let schema = withSchema;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const body = await request(`${BASE_URL}/models/${encodeURIComponent(name)}:generateContent`, apiKey, {
            method: 'POST',
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              generationConfig: {
                temperature: 0.2,
                ...(withSchema ? { responseMimeType: 'application/json' } : {}),
                ...(schema ? { responseJsonSchema: FOOD_ANALYSIS_JSON_SCHEMA } : {}),
              },
            }),
          });
          working = name;
          return body;
        } catch (e) {
          lastError = e;
          if (!(e instanceof GeminiHttpError)) throw toVisionError(e);
          if (schema && isSchemaRejected(e)) {
            schema = false; // mismo modelo, sin esquema: el texto ya pide el JSON
            continue;
          }
          if (isModelUnavailable(e)) break; // siguiente modelo
          throw toVisionError(e);
        }
      }
    }
    throw toVisionError(lastError);
  }

  return {
    name: 'Gemini',

    async analyze(jpegBase64: string): Promise<FoodAnalysis> {
      const body = await generate(
        [
          { inlineData: { mimeType: 'image/jpeg', data: jpegBase64 } },
          { text: `${FOOD_PROMPT}\nResponde SOLO con un JSON con las claves food_detected e items (name, grams, kcal, protein_g, carbs_g, fat_g).` },
        ],
        true,
      );
      return parseFoodAnalysis(body);
    },

    async testConnection(): Promise<void> {
      // Una petición real y mínima: comprueba la clave, el modelo y el cupo gratis.
      await generate([{ text: 'Responde solo: ok' }], false);
    },
  };
}

/** Saca el JSON de la respuesta de Gemini y lo valida. */
export function parseFoodAnalysis(body: unknown): FoodAnalysis {
  const parsed = ResponseSchema.safeParse(body);
  if (!parsed.success) throw new VisionError('invalid_response', 'Respuesta inesperada');
  if (parsed.data.promptFeedback?.blockReason) throw new VisionError('refused', parsed.data.promptFeedback.blockReason);
  const text =
    parsed.data.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? '')
      .join('') ?? '';
  // Sin esquema, a veces llega envuelto en ```json … ```.
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  let json: unknown;
  try {
    json = JSON.parse(start >= 0 && end > start ? text.slice(start, end + 1) : text);
  } catch {
    throw new VisionError('invalid_response', 'JSON roto');
  }
  const analysis = FoodAnalysisSchema.safeParse(json);
  if (!analysis.success) throw new VisionError('invalid_response', 'El JSON no cumple el esquema');
  return analysis.data;
}
