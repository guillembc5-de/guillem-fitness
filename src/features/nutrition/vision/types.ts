import { z } from 'zod';

/**
 * Lo que devuelve la IA: alimentos con la ración estimada y sus kcal y
 * macros DE ESA RACIÓN. Es solo una estimación: siempre pasa por tu revisión.
 * El mismo esquema se pide como salida estructurada y se valida con zod.
 */
export const FoodAnalysisSchema = z.object({
  food_detected: z.boolean(),
  items: z.array(
    z.object({
      name: z.string(),
      grams: z.number(),
      kcal: z.number(),
      protein_g: z.number(),
      carbs_g: z.number(),
      fat_g: z.number(),
    }),
  ),
});

export type FoodAnalysis = z.infer<typeof FoodAnalysisSchema>;

/** El mismo esquema en JSON Schema, para Gemini. */
export const FOOD_ANALYSIS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    food_detected: { type: 'boolean', description: 'false si en la foto no hay comida ni bebida' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nombre del alimento en español' },
          grams: { type: 'number', description: 'Ración estimada en gramos' },
          kcal: { type: 'number', description: 'kcal de esa ración' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
        required: ['name', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  },
  required: ['food_detected', 'items'],
} as const;

export const FOOD_PROMPT = [
  'Eres un nutricionista. Analiza la foto de comida.',
  'Identifica cada alimento o bebida visible por separado (por ejemplo: arroz, pollo, ensalada, pan).',
  'Para cada uno, estima la ración en gramos a partir del tamaño del plato, los cubiertos y otros objetos de referencia, y da las kcal, proteína, hidratos y grasa DE ESA RACIÓN (no por 100 g).',
  'Usa nombres en español de España, cortos y claros.',
  'No inventes alimentos que no se ven. Si no estás seguro de una salsa o aceite, inclúyelo con una cantidad prudente.',
  'Si en la foto no hay comida ni bebida, responde food_detected = false e items vacío.',
].join('\n');

export type VisionErrorKind =
  /** No hay clave guardada. */
  | 'no_key'
  /** Clave inválida o sin permiso. */
  | 'auth'
  /** Sin conexión o tiempo agotado. */
  | 'offline'
  | 'rate_limit'
  | 'server'
  /** JSON roto o que no cumple el esquema. */
  | 'invalid_response'
  /** El modelo se negó a responder. */
  | 'refused'
  /** Petición rechazada (por ejemplo, nombre de modelo incorrecto). */
  | 'bad_request';

export class VisionError extends Error {
  constructor(
    readonly kind: VisionErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'VisionError';
  }
}

/** Fallos temporales: la foto se puede guardar como pendiente y reintentar después. */
export function canRetryLater(kind: VisionErrorKind): boolean {
  return kind === 'offline' || kind === 'rate_limit' || kind === 'server';
}

export const VISION_ERROR_TEXT: Record<VisionErrorKind, string> = {
  no_key: 'Falta la clave de la IA. Añádela en Perfil → Análisis de fotos.',
  auth: 'La clave de la IA no es válida. Revísala en Perfil → Análisis de fotos.',
  offline: 'No hay conexión con la IA.',
  rate_limit: 'La IA ha recibido demasiadas peticiones. Prueba en unos minutos.',
  server: 'El servicio de IA ha fallado.',
  invalid_response: 'La IA no ha devuelto datos válidos.',
  refused: 'La IA no ha querido analizar esta foto.',
  bad_request: 'La IA ha rechazado la petición. Revisa el nombre del modelo en Perfil.',
};

/** Interfaz común: Gemini y Claude son intercambiables. */
export interface NutritionVisionProvider {
  readonly name: string;
  /**
   * Analiza una foto JPEG en base64. `hints`: tus alimentos habituales con sus
   * valores confirmados, para que la estimación se parezca a lo que sueles comer.
   * Lanza VisionError.
   */
  analyze(jpegBase64: string, hints?: string): Promise<FoodAnalysis>;
  /** Comprueba la clave y el modelo con una llamada ligera. Lanza VisionError. */
  testConnection(): Promise<void>;
}
