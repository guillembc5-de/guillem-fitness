import {
  computeBests,
  EMPTY_BESTS,
  epley1RM,
  matchPreviousSets,
  recordsForSet,
  recordsInSession,
  sessionPoints,
  setNumbers,
  setVolume,
  totalVolume,
  type SetLike,
} from './workout';

const done = (weightKg: number | null, reps: number | null, setType: SetLike['setType'] = 'normal'): SetLike => ({
  setType,
  weightKg,
  reps,
  completedAt: 1,
});

describe('1RM (Epley)', () => {
  it('peso × (1 + reps/30)', () => {
    expect(epley1RM(100, 10)).toBeCloseTo(133.333, 2);
    expect(epley1RM(90, 6)).toBeCloseTo(108);
  });
  it('con 1 repetición es el propio peso', () => {
    expect(epley1RM(140, 1)).toBe(140);
  });
  it('sin reps o sin peso es 0', () => {
    expect(epley1RM(100, 0)).toBe(0);
    expect(epley1RM(0, 10)).toBe(0);
  });
});

describe('volumen', () => {
  it('suma peso × reps de las series de trabajo', () => {
    // Peso muerto rumano de lower 1: 90×10 + 90×8 + 90×6 = 2160
    expect(totalVolume([done(90, 10), done(90, 8), done(90, 6)])).toBe(2160);
  });
  it('ignora calentamientos y series sin completar', () => {
    const sets = [done(10, 10, 'warmup'), { ...done(60, 7), completedAt: null }, done(60, 5)];
    expect(totalVolume(sets)).toBe(300);
  });
  it('una serie sin peso aporta 0', () => {
    expect(setVolume(done(null, 12))).toBe(0);
  });
});

describe('mejores marcas', () => {
  it('peso máximo, 1RM, volumen por serie y reps', () => {
    const b = computeBests([done(60, 7), done(60, 5), done(50, 8)]);
    expect(b.maxWeight).toBe(60);
    expect(b.best1RM).toBeCloseTo(74); // 60 × (1 + 7/30)
    expect(b.bestSetVolume).toBe(420);
    expect(b.maxReps).toBe(8);
  });
  it('sin series de trabajo no hay marcas', () => {
    expect(computeBests([done(10, 10, 'warmup')])).toEqual(EMPTY_BESTS);
  });
});

describe('récords', () => {
  const before = computeBests([done(60, 7), done(60, 5)]);

  it('detecta peso, 1RM y volumen', () => {
    expect(recordsForSet(done(62.5, 7), before)).toEqual(['weight', 'e1rm', 'volume']);
  });
  it('más reps con el mismo peso → 1RM y volumen, no peso', () => {
    expect(recordsForSet(done(60, 8), before)).toEqual(['e1rm', 'volume']);
  });
  it('igualar no es récord', () => {
    expect(recordsForSet(done(60, 7), before)).toEqual([]);
  });
  it('la primera vez que haces un ejercicio no hay récords', () => {
    expect(recordsForSet(done(100, 10), EMPTY_BESTS)).toEqual([]);
  });
  it('los calentamientos nunca son récord', () => {
    expect(recordsForSet(done(200, 10, 'warmup'), before)).toEqual([]);
  });
  it('dentro de una sesión, la 2.ª serie compite con la 1.ª', () => {
    const result = recordsInSession([done(65, 5), done(65, 5)], before);
    expect(result[0]).toContain('weight');
    expect(result[1]).toEqual([]);
  });
});

describe('puntos por sesión', () => {
  it('agrupa por entreno y ordena por fecha', () => {
    const points = sessionPoints([
      { ...done(60, 5), workoutId: 'b', startedAt: 200 },
      { ...done(50, 10), workoutId: 'a', startedAt: 100 },
      { ...done(55, 10), workoutId: 'a', startedAt: 100 },
      { ...done(20, 10, 'warmup'), workoutId: 'c', startedAt: 300 },
    ]);
    expect(points.map((p) => p.workoutId)).toEqual(['a', 'b']);
    expect(points[0]?.maxWeight).toBe(55);
    expect(points[0]?.volume).toBe(1050);
  });
});

describe('numeración de series', () => {
  it('los calentamientos no cuentan', () => {
    expect(setNumbers([{ setType: 'warmup' }, { setType: 'warmup' }, { setType: 'normal' }, { setType: 'normal' }])).toEqual([0, 0, 1, 2]);
  });
});

describe('«anterior» serie a serie', () => {
  it('empareja por posición dentro de cada tipo', () => {
    const current = [{ setType: 'warmup' as const }, { setType: 'normal' as const }, { setType: 'normal' as const }, { setType: 'normal' as const }];
    const previous = [
      { setType: 'warmup' as const, id: 'w1' },
      { setType: 'normal' as const, id: 'n1' },
      { setType: 'normal' as const, id: 'n2' },
    ];
    expect(matchPreviousSets(current, previous).map((p) => p?.id ?? null)).toEqual(['w1', 'n1', 'n2', null]);
  });
});
