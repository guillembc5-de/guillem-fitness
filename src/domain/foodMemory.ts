import { formatNumber } from './format';
import type { Per100 } from './nutrition';
import type { FoodDraft } from './nutritionTypes';
import { normalizeSearch } from './text';
import type { SyncMeta } from './types';

/**
 * Memoria de alimentos: lo que la app aprende de tus comidas para que cada
 * foto salga mejor que la anterior.
 *
 * - Valores: los kcal y macros por 100 g que tú confirmas o corriges sustituyen
 *   a los de la IA la próxima vez que reconozca ese alimento.
 * - Raciones: compara los gramos que estimó la IA con los que guardaste. Si la
 *   IA suele quedarse corta (o pasarse), corrige sus próximas estimaciones.
 * - Contexto: los alimentos que más comes se mandan a la IA junto a la foto.
 *
 * La IA no se reentrena: es la app la que aprende de tus correcciones.
 */
export type FoodMemory = SyncMeta &
  Per100 & {
    name: string;
    searchName: string;
    aliases: string[];
    grams: number;
    timesConfirmed: number;
    aiGramsTotal: number;
    finalGramsTotal: number;
    aiSamples: number;
    lastUsedAt: number;
  };

/** Un alimento guardado en una comida, con lo que había estimado la IA (si la hubo). */
export type LearnEntry = Per100 & {
  name: string;
  grams: number;
  /** Nombre que propuso la IA (null si se añadió a mano). */
  aiName: string | null;
  /** Gramos que estimó la IA antes de ninguna corrección (null si no hubo IA). */
  aiGrams: number | null;
};

/** Hacen falta varias correcciones para fiarse de la tendencia. */
export const MIN_FOOD_SAMPLES = 2;
export const MIN_GLOBAL_SAMPLES = 3;
/** Nunca se corrige una ración más allá de esto (protege de un error al teclear). */
export const RATIO_LIMITS = [0.6, 1.6] as const;

const clampRatio = (r: number) => Math.min(RATIO_LIMITS[1], Math.max(RATIO_LIMITS[0], r));

/** El recuerdo de ese alimento, por su nombre o por un nombre que usó antes la IA. */
export function findMemory(name: string, memories: readonly FoodMemory[]): FoodMemory | null {
  const key = normalizeSearch(name);
  if (key === '') return null;
  return memories.find((m) => m.searchName === key || m.aliases.includes(key)) ?? null;
}

export type PortionRatio = { ratio: number; source: 'food' | 'global' | null };

/**
 * Cuánto hay que multiplicar los gramos de la IA. Primero se usa lo aprendido
 * de ese alimento; si no hay bastante, la tendencia general de todas tus comidas.
 */
export function portionRatio(memory: FoodMemory | null, memories: readonly FoodMemory[]): PortionRatio {
  if (memory && memory.aiSamples >= MIN_FOOD_SAMPLES && memory.aiGramsTotal > 0) {
    return { ratio: clampRatio(memory.finalGramsTotal / memory.aiGramsTotal), source: 'food' };
  }
  let ai = 0;
  let final = 0;
  let samples = 0;
  for (const m of memories) {
    if (m.aiSamples === 0 || m.aiGramsTotal <= 0) continue;
    ai += m.aiGramsTotal;
    final += m.finalGramsTotal;
    samples += m.aiSamples;
  }
  if (samples >= MIN_GLOBAL_SAMPLES && ai > 0) return { ratio: clampRatio(final / ai), source: 'global' };
  return { ratio: 1, source: null };
}

export type LearnedFood = FoodDraft & {
  /** Lo que dijo la IA, para aprender de tu corrección al guardar. */
  aiName: string;
  aiGrams: number;
  /** Qué se ha ajustado con lo aprendido. */
  learned: ('values' | 'portion')[];
};

/** Ajusta lo que propone la IA con lo aprendido de tus comidas anteriores. */
export function applyMemory(items: readonly FoodDraft[], memories: readonly FoodMemory[]): LearnedFood[] {
  return items.map((item) => {
    const memory = findMemory(item.name, memories);
    const learned: LearnedFood['learned'] = [];
    let result: FoodDraft = item;
    if (memory) {
      result = {
        ...result,
        name: memory.name,
        kcalPer100g: memory.kcalPer100g,
        proteinPer100g: memory.proteinPer100g,
        carbsPer100g: memory.carbsPer100g,
        fatPer100g: memory.fatPer100g,
      };
      learned.push('values');
    }
    const { ratio } = portionRatio(memory, memories);
    if (Math.abs(ratio - 1) >= 0.03) {
      result = { ...result, grams: Math.max(5, Math.round((item.grams * ratio) / 5) * 5) };
      learned.push('portion');
    }
    return { ...result, aiName: item.name, aiGrams: item.grams, learned };
  });
}

/** Fila nueva o actualizada de la memoria tras guardar un alimento. */
export type MemoryRow = Omit<FoodMemory, keyof SyncMeta>;

export function mergeMemory(previous: MemoryRow | null, entry: LearnEntry, at: number): MemoryRow {
  const searchName = normalizeSearch(entry.name);
  const aliases = new Set(previous?.aliases ?? []);
  const aiKey = entry.aiName ? normalizeSearch(entry.aiName) : '';
  if (aiKey && aiKey !== searchName) aliases.add(aiKey);
  const hasAi = entry.aiGrams !== null && entry.aiGrams > 0;
  return {
    name: entry.name.trim(),
    searchName,
    aliases: [...aliases].slice(-10),
    grams: entry.grams,
    // Mandan tus últimos valores: eres quien sabe qué has comido.
    kcalPer100g: entry.kcalPer100g,
    proteinPer100g: entry.proteinPer100g,
    carbsPer100g: entry.carbsPer100g,
    fatPer100g: entry.fatPer100g,
    timesConfirmed: (previous?.timesConfirmed ?? 0) + 1,
    aiGramsTotal: (previous?.aiGramsTotal ?? 0) + (hasAi ? (entry.aiGrams ?? 0) : 0),
    finalGramsTotal: (previous?.finalGramsTotal ?? 0) + (hasAi ? entry.grams : 0),
    aiSamples: (previous?.aiSamples ?? 0) + (hasAi ? 1 : 0),
    lastUsedAt: at,
  };
}

/**
 * Texto para la IA con tus alimentos habituales y sus valores confirmados.
 * No incluye raciones: esas se corrigen después, con la tendencia aprendida.
 */
export function promptHints(memories: readonly FoodMemory[], limit = 25): string {
  const top = [...memories].sort((a, b) => b.timesConfirmed - a.timesConfirmed || b.lastUsedAt - a.lastUsedAt).slice(0, limit);
  if (top.length === 0) return '';
  const lines = top.map(
    (m) =>
      `- ${m.name}: ${formatNumber(m.kcalPer100g)} kcal, ${formatNumber(m.proteinPer100g, { maxDecimals: 1 })} g proteína, ${formatNumber(m.carbsPer100g, { maxDecimals: 1 })} g hidratos, ${formatNumber(m.fatPer100g, { maxDecimals: 1 })} g grasa por 100 g`,
  );
  return [
    'Alimentos que esta persona come a menudo, con valores que ella misma ha confirmado (por 100 g).',
    'Si reconoces alguno en la foto, usa ese mismo nombre y calcula con estos valores:',
    ...lines,
  ].join('\n');
}
