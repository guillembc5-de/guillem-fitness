import {
  ageFromBirthYear,
  birthYearFromAge,
  bmrMifflinStJeor,
  calorieTarget,
  dailyAdjustment,
  macroTargets,
} from './calorieGoal';

describe('Mifflin-St Jeor', () => {
  it('calcula el basal de un hombre', () => {
    // 10·80 + 6,25·180 − 5·25 + 5 = 800 + 1125 − 125 + 5
    expect(bmrMifflinStJeor({ sex: 'male', weightKg: 80, heightCm: 180, age: 25 })).toBe(1805);
  });

  it('calcula el basal de una mujer', () => {
    // 10·60 + 6,25·165 − 5·30 − 161 = 600 + 1031,25 − 150 − 161
    expect(bmrMifflinStJeor({ sex: 'female', weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(1320.25);
  });
});

describe('ajuste diario por objetivo', () => {
  it('perder 0,5 kg/semana ≈ −550 kcal/día', () => {
    expect(dailyAdjustment('lose', 0.5)).toBeCloseTo(-550);
  });
  it('ganar 0,25 kg/semana ≈ +275 kcal/día', () => {
    expect(dailyAdjustment('gain', 0.25)).toBeCloseTo(275);
  });
  it('mantener ignora el ritmo', () => {
    expect(dailyAdjustment('maintain', 0.5)).toBe(0);
  });
});

describe('objetivo calórico', () => {
  const base = { sex: 'male' as const, weightKg: 80, heightCm: 180, age: 25, activityLevel: 'light' as const };

  it('mantener = basal × factor, redondeado a decenas', () => {
    const r = calorieTarget({ ...base, goal: 'maintain', goalRateKgWeek: 0 });
    expect(r.bmr).toBe(1805);
    expect(r.tdee).toBe(2347); // 1805 × 1,3 = 2346,5 (sin caminar ni gimnasio)
    expect(r.target).toBe(2350);
    expect(r.floorApplied).toBe(false);
  });

  it('perder resta el déficit', () => {
    const r = calorieTarget({ ...base, goal: 'lose', goalRateKgWeek: 0.5 });
    expect(r.target).toBe(1800); // 2346,5 − 550 = 1796,5
    expect(r.adjustment).toBe(-550);
  });

  it('nunca baja del mínimo de seguridad', () => {
    const r = calorieTarget({
      sex: 'female',
      weightKg: 45,
      heightCm: 150,
      age: 60,
      activityLevel: 'sedentary',
      goal: 'lose',
      goalRateKgWeek: 1,
    });
    expect(r.target).toBe(1200);
    expect(r.floorApplied).toBe(true);
  });
});

describe('edad', () => {
  it('ida y vuelta entre edad y año de nacimiento', () => {
    const now = new Date(2026, 10, 4);
    expect(birthYearFromAge(25, now)).toBe(2001);
    expect(ageFromBirthYear(2001, now)).toBe(25);
  });
});

describe('macros', () => {
  it('reparte proteína, grasa e hidratos', () => {
    const m = macroTargets(2480, 80);
    expect(m.proteinG).toBe(144);
    expect(m.fatG).toBe(69); // 620 kcal / 9
    expect(m.carbsG).toBe(321); // (2480 − 576 − 621) / 4 = 320,75
  });

  it('los hidratos nunca son negativos', () => {
    expect(macroTargets(800, 150).carbsG).toBe(0);
  });
});
