import { applyMemory, findMemory, mergeMemory, portionRatio, promptHints, type FoodMemory, type MemoryRow } from './foodMemory';

const per100 = { kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 };

function memory(row: MemoryRow, id = row.searchName): FoodMemory {
  return { ...row, id, createdAt: 0, updatedAt: 0, deletedAt: null };
}

describe('memoria de alimentos', () => {
  it('aprende tus valores y el nombre que usó la IA', () => {
    const row = mergeMemory(null, { name: 'Arroz', grams: 200, ...per100, aiName: 'Arroz blanco cocido', aiGrams: 150 }, 10);
    expect(row).toMatchObject({ searchName: 'arroz', aliases: ['arroz blanco cocido'], timesConfirmed: 1, aiSamples: 1, aiGramsTotal: 150, finalGramsTotal: 200 });
    const m = memory(row);
    expect(findMemory('ARROZ', [m])).toBe(m);
    expect(findMemory('Arroz blanco cocido', [m])).toBe(m);
    expect(findMemory('Pollo', [m])).toBeNull();
  });

  it('lo añadido a mano enseña valores pero no cambia la tendencia de raciones', () => {
    const row = mergeMemory(null, { name: 'Yogur', grams: 125, ...per100, aiName: null, aiGrams: null }, 10);
    expect(row.aiSamples).toBe(0);
    expect(row.finalGramsTotal).toBe(0);
  });

  it('corrige raciones con la tendencia del alimento o la general', () => {
    let rice = mergeMemory(null, { name: 'Arroz', grams: 200, ...per100, aiName: 'Arroz', aiGrams: 150 }, 1);
    rice = mergeMemory(rice, { name: 'Arroz', grams: 180, ...per100, aiName: 'Arroz', aiGrams: 150 }, 2);
    const m = memory(rice);
    expect(portionRatio(m, [m])).toEqual({ ratio: 380 / 300, source: 'food' });
    // Un alimento sin historial usa la tendencia general (con 3+ correcciones en total).
    const chicken = memory(mergeMemory(null, { name: 'Pollo', grams: 130, ...per100, aiName: 'Pollo', aiGrams: 100 }, 3));
    expect(portionRatio(null, [m, chicken]).source).toBe('global');
    expect(portionRatio(null, [chicken]).source).toBeNull(); // 1 corrección no basta
  });

  it('la corrección de ración tiene límites', () => {
    let row = mergeMemory(null, { name: 'Pan', grams: 1000, ...per100, aiName: 'Pan', aiGrams: 50 }, 1);
    row = mergeMemory(row, { name: 'Pan', grams: 1000, ...per100, aiName: 'Pan', aiGrams: 50 }, 2);
    expect(portionRatio(memory(row), [memory(row)]).ratio).toBe(1.6);
  });

  it('ajusta lo que propone la IA', () => {
    let rice = mergeMemory(null, { name: 'Arroz', grams: 200, kcalPer100g: 120, proteinPer100g: 2, carbsPer100g: 27, fatPer100g: 0, aiName: 'Arroz blanco', aiGrams: 160 }, 1);
    rice = mergeMemory(rice, { name: 'Arroz', grams: 200, kcalPer100g: 120, proteinPer100g: 2, carbsPer100g: 27, fatPer100g: 0, aiName: 'Arroz blanco', aiGrams: 160 }, 2);
    const [item] = applyMemory([{ name: 'Arroz blanco', grams: 160, ...per100, aiEstimated: true }], [memory(rice)]);
    expect(item).toMatchObject({ name: 'Arroz', kcalPer100g: 120, grams: 200, aiName: 'Arroz blanco', aiGrams: 160, learned: ['values', 'portion'] });
  });

  it('sin memoria deja la estimación tal cual', () => {
    const [item] = applyMemory([{ name: 'Lentejas', grams: 250, ...per100, aiEstimated: true }], []);
    expect(item).toMatchObject({ name: 'Lentejas', grams: 250, learned: [] });
  });

  it('el contexto para la IA lista tus alimentos más frecuentes', () => {
    const a = memory(mergeMemory(null, { name: 'Arroz', grams: 200, ...per100, aiName: null, aiGrams: null }, 1));
    expect(promptHints([a])).toContain('- Arroz: 130 kcal, 2,7 g proteína, 28 g hidratos, 0,3 g grasa por 100 g');
    expect(promptHints([])).toBe('');
  });
});
