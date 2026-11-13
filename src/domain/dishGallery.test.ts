import { aiEstimateFor, dishMatchesSearch, dishTitle, galleryDishes, photoFileName, similarDishes } from './dishGallery';
import type { FoodMemory } from './foodMemory';
import type { FoodItem, Meal } from './nutritionTypes';

const meta = (id: string) => ({ id, createdAt: 1, updatedAt: 1, deletedAt: null });

function item(name: string, grams: number, kcalPer100g: number): FoodItem {
  return { ...meta(`i-${name}-${grams}`), mealId: 'm', name, grams, kcalPer100g, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 0, aiEstimated: false, position: 0 };
}

function meal(id: string, photoUri: string | null, eatenAt: number, items: FoodItem[]): Meal {
  return { ...meta(id), localDate: '2026-11-10', mealType: 'lunch', eatenAt, source: photoUri ? 'photo' : 'manual', photoUri, aiProvider: null, isDemo: false, items };
}

const OLD = 'file:///var/mobile/Containers/Data/Application/AAAA-1111/Documents/meal-photos/arroz.jpg';
const NEW = 'file:///var/mobile/Containers/Data/Application/BBBB-2222/Documents/meal-photos/arroz.jpg';

const arrozPollo = [item('Arroz', 180, 130), item('Pollo', 150, 165)];
const meals: Meal[] = [
  meal('m1', OLD, 100, [item('Arroz', 150, 130), item('Pollo', 120, 165)]),
  meal('m2', NEW, 300, arrozPollo),
  meal('m3', 'file:///x/meal-photos/ensalada.jpg', 200, [item('Lechuga', 100, 15), item('Tomate', 120, 18), item('Atún', 60, 116)]),
  meal('m4', null, 400, [item('Plátano', 120, 89)]),
];

describe('nombre del archivo de la foto', () => {
  it('es el mismo aunque iOS cambie la carpeta de la app al reinstalar', () => {
    expect(photoFileName(OLD)).toBe('arroz.jpg');
    expect(photoFileName(NEW)).toBe('arroz.jpg');
    expect(photoFileName('C:\\fotos\\plato.jpg')).toBe('plato.jpg');
  });
});

describe('galería de platos', () => {
  const dishes = galleryDishes(meals);

  it('una entrada por foto: la comida más reciente manda y cuenta las veces usada', () => {
    expect(dishes.map((d) => d.key)).toEqual(['arroz.jpg', 'ensalada.jpg']);
    expect(dishes[0]).toMatchObject({ timesUsed: 2, lastUsedAt: 300 });
    expect(dishes[0]?.latest.id).toBe('m2');
    expect(Math.round(dishes[0]?.totals.kcal ?? 0)).toBe(Math.round(1.8 * 130 + 1.5 * 165));
  });

  it('las comidas sin foto o borradas no salen', () => {
    expect(galleryDishes([meal('x', null, 1, arrozPollo), { ...meal('y', OLD, 2, arrozPollo), deletedAt: 5 }])).toHaveLength(0);
  });

  it('título con los alimentos que más kcal aportan', () => {
    expect(dishTitle(meals[1] as Meal)).toBe('Pollo, Arroz');
    expect(dishTitle(meals[2] as Meal, 2)).toBe('Atún, Tomate y 1 más');
  });

  it('busca por alimento, sin tildes', () => {
    expect(dishes.filter((d) => dishMatchesSearch(d, 'atun')).map((d) => d.key)).toEqual(['ensalada.jpg']);
    expect(dishes.filter((d) => dishMatchesSearch(d, ''))).toHaveLength(2);
  });
});

describe('platos parecidos a una foto nueva', () => {
  const dishes = galleryDishes(meals);
  const memory: FoodMemory = {
    ...meta('fm'),
    name: 'Arroz',
    searchName: 'arroz',
    aliases: ['arroz blanco cocido'],
    grams: 180,
    kcalPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
    timesConfirmed: 3,
    aiGramsTotal: 0,
    finalGramsTotal: 0,
    aiSamples: 0,
    lastUsedAt: 1,
  };

  it('reconoce el plato aunque la IA use otro nombre que ya aprendió', () => {
    const found = similarDishes(['Arroz blanco cocido', 'Pollo'], dishes, [memory]);
    expect(found.map((f) => f.dish.key)).toEqual(['arroz.jpg']);
    expect(found[0]?.score).toBe(1);
  });

  it('no propone platos que se parecen poco', () => {
    expect(similarDishes(['Pollo', 'Patatas', 'Brócoli', 'Salsa'], dishes, [])).toHaveLength(0);
    expect(similarDishes([], dishes, [])).toHaveLength(0);
  });

  it('recupera lo que estimó la IA para cada alimento del plato guardado', () => {
    const aiRows = [
      { name: 'Arroz', aiName: 'Arroz blanco cocido', aiGrams: 140 },
      { name: 'Pollo', aiName: 'Pollo', aiGrams: 110 },
    ];
    expect(aiEstimateFor('Arroz', aiRows, [memory])).toEqual({ aiName: 'Arroz blanco cocido', aiGrams: 140 });
    expect(aiEstimateFor('Tomate', aiRows, [memory])).toBeNull();
  });
});
