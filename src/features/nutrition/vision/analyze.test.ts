import { analyzeFood } from './analyze';
import { FoodAnalysisSchema, VisionError, canRetryLater, type FoodAnalysis, type NutritionVisionProvider } from './types';

function fakeProvider(responses: (FoodAnalysis | VisionError)[]): NutritionVisionProvider & { calls: number } {
  const queue = [...responses];
  const provider = {
    name: 'fake',
    calls: 0,
    async analyze() {
      provider.calls += 1;
      const next = queue.shift();
      if (!next) throw new VisionError('server', 'sin más respuestas');
      if (next instanceof VisionError) throw next;
      return next;
    },
    async testConnection() {},
  };
  return provider;
}

const plato: FoodAnalysis = {
  food_detected: true,
  items: [
    { name: 'Arroz blanco', grams: 180, kcal: 234, protein_g: 4.9, carbs_g: 50.4, fat_g: 0.5 },
    { name: 'Pechuga de pollo', grams: 150, kcal: 248, protein_g: 46.5, carbs_g: 0, fat_g: 5.4 },
  ],
};

describe('análisis de fotos', () => {
  it('convierte la respuesta en alimentos editables por 100 g', async () => {
    const result = await analyzeFood(fakeProvider([plato]), 'b64');
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.kcalPer100g).toBeCloseTo(130);
    expect(result.items[0]?.aiEstimated).toBe(true);
  });

  it('JSON roto: reintenta una vez y funciona', async () => {
    const provider = fakeProvider([new VisionError('invalid_response', 'roto'), plato]);
    const result = await analyzeFood(provider, 'b64');
    expect(result.status).toBe('ok');
    expect(provider.calls).toBe(2);
  });

  it('JSON roto dos veces: error (la pantalla pasa a entrada manual)', async () => {
    const provider = fakeProvider([new VisionError('invalid_response', 'roto'), new VisionError('invalid_response', 'roto')]);
    const result = await analyzeFood(provider, 'b64');
    expect(result.status).toBe('error');
    expect(provider.calls).toBe(2);
  });

  it('sin conexión: no reintenta y se puede dejar pendiente', async () => {
    const provider = fakeProvider([new VisionError('offline', 'sin red')]);
    const result = await analyzeFood(provider, 'b64');
    expect(provider.calls).toBe(1);
    expect(result.status === 'error' && canRetryLater(result.error.kind)).toBe(true);
  });

  it('si no hay comida, lo dice', async () => {
    expect((await analyzeFood(fakeProvider([{ food_detected: false, items: [] }]), 'b64')).status).toBe('no_food');
    // food_detected true pero sin alimentos válidos también cuenta como «no hay comida».
    expect((await analyzeFood(fakeProvider([{ food_detected: true, items: [{ name: ' ', grams: 0, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }] }]), 'b64')).status).toBe(
      'no_food',
    );
  });

  it('el esquema zod rechaza respuestas inventadas o incompletas', () => {
    expect(FoodAnalysisSchema.safeParse({ food_detected: true, items: [{ name: 'Pan', grams: '50' }] }).success).toBe(false);
    expect(FoodAnalysisSchema.safeParse({ items: [] }).success).toBe(false);
    expect(FoodAnalysisSchema.safeParse(plato).success).toBe(true);
  });

  it('una clave mala no se reintenta ni se deja pendiente', async () => {
    const provider = fakeProvider([new VisionError('auth', 'clave')]);
    const result = await analyzeFood(provider, 'b64');
    expect(provider.calls).toBe(1);
    expect(result.status === 'error' && canRetryLater(result.error.kind)).toBe(false);
  });
});
