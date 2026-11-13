import { findMemory, type FoodMemory } from './foodMemory';
import { itemTotals, sumTotals, type Totals } from './nutrition';
import type { Meal } from './nutritionTypes';
import { matchesSearch, normalizeSearch } from './text';

/**
 * Galería de platos: cada foto de comida que guardas, con los valores que tú
 * confirmaste. Sirve para repetir un plato sin volver a analizarlo y para que,
 * al analizar una foto nueva, la app te proponga un plato tuyo que se parece.
 */

/**
 * Nombre del archivo de una foto guardada. La ruta completa cambia cada vez
 * que iOS reinstala la app; el nombre del archivo, no.
 */
export function photoFileName(uri: string): string {
  const clean = uri.split(/[?#]/)[0] ?? uri;
  const parts = clean.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? clean;
}

export type GalleryDish = {
  /** Nombre del archivo de la foto: identifica el plato aunque lo repitas. */
  key: string;
  photoUri: string;
  /** La comida más reciente hecha con esta foto (sus valores son los vigentes). */
  latest: Meal;
  /** Cuántas comidas has guardado con esta foto. */
  timesUsed: number;
  lastUsedAt: number;
  totals: Totals;
};

/** Una entrada por foto (la más reciente manda), de la más nueva a la más antigua. */
export function galleryDishes(meals: readonly Meal[]): GalleryDish[] {
  const byKey = new Map<string, GalleryDish>();
  for (const meal of meals) {
    if (!meal.photoUri || meal.deletedAt !== null || meal.items.length === 0) continue;
    const key = photoFileName(meal.photoUri);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        photoUri: meal.photoUri,
        latest: meal,
        timesUsed: 1,
        lastUsedAt: meal.eatenAt,
        totals: sumTotals(meal.items.map(itemTotals)),
      });
    } else {
      existing.timesUsed += 1;
      if (meal.eatenAt > existing.lastUsedAt) {
        existing.latest = meal;
        existing.photoUri = meal.photoUri;
        existing.lastUsedAt = meal.eatenAt;
        existing.totals = sumTotals(meal.items.map(itemTotals));
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
}

/** Nombre corto del plato: sus alimentos, de mayor a menor aporte de kcal. */
export function dishTitle(meal: Meal, maxItems = 3): string {
  const names = [...meal.items]
    .sort((a, b) => itemTotals(b).kcal - itemTotals(a).kcal)
    .map((i) => i.name.trim())
    .filter(Boolean);
  if (names.length === 0) return 'Plato';
  const shown = names.slice(0, maxItems).join(', ');
  return names.length > maxItems ? `${shown} y ${names.length - maxItems} más` : shown;
}

/** Busca por cualquier alimento del plato, sin tildes ni mayúsculas. */
export function dishMatchesSearch(dish: GalleryDish, query: string): boolean {
  if (query.trim() === '') return true;
  return matchesSearch(normalizeSearch(dish.latest.items.map((i) => i.name).join(' ')), query);
}

/** Con menos parecido que esto no se propone el plato. */
export const MIN_DISH_SIMILARITY = 0.5;

/**
 * Clave de un alimento para comparar platos: si la app ya lo conoce (por su
 * nombre o por un nombre que usó la IA), su nombre aprendido; si no, el texto.
 */
function foodKey(name: string, memories: readonly FoodMemory[]): string {
  return findMemory(name, memories)?.searchName ?? normalizeSearch(name);
}

export type SimilarDish = { dish: GalleryDish; score: number };

/**
 * Platos de tu galería parecidos a lo que la IA ve en una foto nueva.
 * Parecido = alimentos en común / alimentos en total (0 a 1).
 */
export function similarDishes(
  names: readonly string[],
  dishes: readonly GalleryDish[],
  memories: readonly FoodMemory[],
  limit = 3,
): SimilarDish[] {
  const wanted = new Set(names.map((n) => foodKey(n, memories)).filter(Boolean));
  if (wanted.size === 0) return [];
  const result: SimilarDish[] = [];
  for (const dish of dishes) {
    const keys = new Set(dish.latest.items.map((i) => foodKey(i.name, memories)).filter(Boolean));
    if (keys.size === 0) continue;
    let shared = 0;
    for (const k of keys) if (wanted.has(k)) shared += 1;
    const score = shared / (wanted.size + keys.size - shared);
    if (shared > 0 && score >= MIN_DISH_SIMILARITY) result.push({ dish, score });
  }
  return result.sort((a, b) => b.score - a.score || b.dish.timesUsed - a.dish.timesUsed || b.dish.lastUsedAt - a.dish.lastUsedAt).slice(0, limit);
}

/**
 * Lo que la IA estimó para un alimento del plato guardado (si lo vio en la
 * foto nueva), para seguir aprendiendo de la diferencia de gramos.
 */
export function aiEstimateFor<T extends { aiName: string | null; aiGrams: number | null; name: string }>(
  itemName: string,
  aiRows: readonly T[],
  memories: readonly FoodMemory[],
): { aiName: string; aiGrams: number } | null {
  const key = foodKey(itemName, memories);
  const row = aiRows.find((r) => r.aiName !== null && r.aiGrams !== null && (foodKey(r.name, memories) === key || foodKey(r.aiName, memories) === key));
  return row && row.aiName !== null && row.aiGrams !== null ? { aiName: row.aiName, aiGrams: row.aiGrams } : null;
}
