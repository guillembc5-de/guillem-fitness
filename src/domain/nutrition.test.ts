import { dailyBalance, itemTotals, mealTypeForTime, per100FromPortion, sanitizeEstimate, sumTotals } from './nutrition';

// TZ=Europe/Madrid

describe('recálculo de kcal por gramos', () => {
  const arroz = { grams: 180, kcalPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 };

  it('kcal y macros de la ración', () => {
    const t = itemTotals(arroz);
    expect(t.kcal).toBeCloseTo(234);
    expect(t.protein).toBeCloseTo(4.86);
    expect(t.carbs).toBeCloseTo(50.4);
  });

  it('al cambiar los gramos todo cambia en proporción exacta', () => {
    expect(itemTotals({ ...arroz, grams: 90 }).kcal).toBeCloseTo(117);
    expect(itemTotals({ ...arroz, grams: 360 }).kcal).toBeCloseTo(468);
    expect(itemTotals({ ...arroz, grams: 0 }).kcal).toBe(0);
  });

  it('de la ración de la IA a valores por 100 g y vuelta', () => {
    const per100 = per100FromPortion(250, { kcal: 400, protein: 30, carbs: 20, fat: 22 });
    expect(per100.kcalPer100g).toBeCloseTo(160);
    expect(itemTotals({ ...per100, grams: 250 }).kcal).toBeCloseTo(400);
    expect(itemTotals({ ...per100, grams: 125 }).protein).toBeCloseTo(15);
  });

  it('suma varios alimentos', () => {
    const total = sumTotals([itemTotals(arroz), itemTotals({ ...arroz, grams: 20 })]);
    expect(total.kcal).toBeCloseTo(260);
  });
});

describe('estimaciones absurdas de la IA', () => {
  it('limita gramos y valores por 100 g a lo físicamente posible', () => {
    const s = sanitizeEstimate(100, { kcal: 5000, protein: 300, carbs: -5, fat: 20 });
    expect(s.kcalPer100g).toBe(900);
    expect(s.proteinPer100g).toBe(100);
    expect(s.carbsPer100g).toBe(0);
    expect(s.fatPer100g).toBe(20);
  });
  it('gramos fuera de rango', () => {
    expect(sanitizeEstimate(0, { kcal: 0, protein: 0, carbs: 0, fat: 0 }).grams).toBe(1);
    expect(sanitizeEstimate(99999, { kcal: 100, protein: 0, carbs: 0, fat: 0 }).grams).toBe(3000);
  });
});

describe('comida del día según la hora', () => {
  const at = (h: number, m: number) => new Date(2026, 10, 4, h, m).getTime();
  it('horarios españoles', () => {
    expect(mealTypeForTime(at(8, 0))).toBe('breakfast');
    expect(mealTypeForTime(at(11, 29))).toBe('breakfast');
    expect(mealTypeForTime(at(14, 30))).toBe('lunch');
    expect(mealTypeForTime(at(17, 30))).toBe('snack');
    expect(mealTypeForTime(at(21, 15))).toBe('dinner');
  });
  it('23:59 es cena y a las 00:01 (nuevo día) se propone desayuno', () => {
    expect(mealTypeForTime(at(23, 59))).toBe('dinner');
    expect(mealTypeForTime(new Date(2026, 10, 5, 0, 1).getTime())).toBe('breakfast');
  });
});

describe('balance del día', () => {
  it('objetivo − comido + pasos', () => {
    const b = dailyBalance(2250, 1850, 260);
    expect(b.remaining).toBe(660);
    expect(b.net).toBe(1590);
  });
  it('negativo si te pasas', () => {
    expect(dailyBalance(2000, 2400, 100).remaining).toBe(-300);
  });
  it('los entrenos también restan, aparte de los pasos', () => {
    const b = dailyBalance(2250, 1850, 260, 300);
    expect(b).toMatchObject({ steps: 260, workouts: 300, burned: 560, remaining: 960, net: 1290 });
  });
  it('con Fitness se usa la mayor cifra: nunca se suman', () => {
    // El reloj midió más que la estimación: manda Fitness (ya incluye pasos y entreno).
    expect(dailyBalance(2250, 1850, 260, 300, 720)).toMatchObject({ burned: 720, usesFitness: true, remaining: 1120 });
    // Sin reloj en el gimnasio, Fitness se queda corto: manda la estimación.
    expect(dailyBalance(2250, 1850, 260, 300, 400)).toMatchObject({ burned: 560, usesFitness: false, fitness: 400 });
    expect(dailyBalance(2250, 1850, 260, 300, null)).toMatchObject({ burned: 560, usesFitness: false, fitness: null });
  });
});
