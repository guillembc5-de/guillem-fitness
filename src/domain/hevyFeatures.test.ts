import { strengthWorkoutKcal, workoutsKcal } from './exerciseKcal';
import { plateBreakdown } from './plates';
import { nextInSuperset, restAfterSet, supersetLetters } from './supersets';
import { warmupSets } from './warmup';
import { structureChanged, weeklyStreak, weeklyTotals } from './workoutStats';
import { isWorkingSet, matchPreviousSets, recordsForSet, setNumbers, totalVolume } from './workout';

const done = 1;

describe('tipos de serie', () => {
  it('drop set y al fallo cuentan como trabajo; el calentamiento no', () => {
    expect(isWorkingSet({ setType: 'dropset', weightKg: 40, reps: 8, completedAt: done })).toBe(true);
    expect(isWorkingSet({ setType: 'failure', weightKg: 60, reps: 6, completedAt: done })).toBe(true);
    expect(isWorkingSet({ setType: 'warmup', weightKg: 40, reps: 10, completedAt: done })).toBe(false);
    expect(
      totalVolume([
        { setType: 'normal', weightKg: 60, reps: 10, completedAt: done },
        { setType: 'dropset', weightKg: 40, reps: 8, completedAt: done },
        { setType: 'warmup', weightKg: 20, reps: 10, completedAt: done },
      ]),
    ).toBe(920);
  });

  it('solo las normales llevan número', () => {
    expect(setNumbers([{ setType: 'warmup' }, { setType: 'normal' }, { setType: 'normal' }, { setType: 'dropset' }, { setType: 'failure' }])).toEqual([0, 1, 2, 0, 0]);
  });

  it('«anterior» empareja cada tipo con el suyo', () => {
    const prev = [{ setType: 'normal' as const, id: 'n1' }, { setType: 'dropset' as const, id: 'd1' }];
    expect(matchPreviousSets([{ setType: 'dropset' }, { setType: 'normal' }, { setType: 'failure' }], prev).map((p) => p?.id ?? null)).toEqual(['d1', 'n1', null]);
  });

  it('sin peso, hacer más repeticiones es récord', () => {
    const before = { maxWeight: null, best1RM: null, bestSetVolume: null, maxReps: 12 };
    expect(recordsForSet({ setType: 'normal', weightKg: 0, reps: 13, completedAt: done }, before)).toEqual(['reps']);
    expect(recordsForSet({ setType: 'normal', weightKg: 0, reps: 12, completedAt: done }, before)).toEqual([]);
  });
});

describe('calculadora de discos', () => {
  it('100 kg con barra de 20: 25 + 15 por lado', () => {
    expect(plateBreakdown(100)).toEqual({ perSide: [{ plate: 25, count: 1 }, { plate: 15, count: 1 }], achievedKg: 100, remainderKg: 0 });
  });

  it('142,5 kg: 2×25 + 10 + 1,25 por lado', () => {
    const r = plateBreakdown(142.5);
    expect(r.perSide).toEqual([
      { plate: 25, count: 2 },
      { plate: 10, count: 1 },
      { plate: 1.25, count: 1 },
    ]);
    expect(r.remainderKg).toBe(0);
  });

  it('si no se puede exacto, dice cuánto falta', () => {
    const r = plateBreakdown(101, 20, [20, 10, 5, 2.5]);
    expect(r.achievedKg).toBe(100);
    expect(r.remainderKg).toBe(1);
  });

  it('barra vacía o menos: sin discos', () => {
    expect(plateBreakdown(20).perSide).toEqual([]);
    expect(plateBreakdown(15).perSide).toEqual([]);
  });
});

describe('calentamiento', () => {
  it('100 kg: 40 × 10, 60 × 5, 80 × 3', () => {
    expect(warmupSets(100, 20)).toEqual([
      { weightKg: 40, reps: 10 },
      { weightKg: 60, reps: 5 },
      { weightKg: 80, reps: 3 },
    ]);
  });

  it('peso bajo: nunca menos que la barra ni series repetidas', () => {
    expect(warmupSets(30, 20)).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 25, reps: 3 },
    ]);
  });

  it('sin peso de trabajo no propone nada', () => {
    expect(warmupSets(0)).toEqual([]);
  });
});

describe('superseries', () => {
  const list = [
    { id: 'a', supersetId: 's1', restSeconds: 90 },
    { id: 'b', supersetId: 's1', restSeconds: 120 },
    { id: 'c', supersetId: null, restSeconds: 150 },
    { id: 'd', supersetId: 's2', restSeconds: 60 },
  ];

  it('letras por orden y sin contar grupos de uno', () => {
    expect([...supersetLetters(list)]).toEqual([['s1', 'A']]);
  });

  it('dentro de la superserie no hay descanso hasta el último ejercicio', () => {
    expect(restAfterSet('a', list)).toBeNull();
    expect(restAfterSet('b', list)).toBe(120);
    expect(restAfterSet('c', list)).toBe(150);
    expect(restAfterSet('d', list)).toBe(60); // grupo de uno = ejercicio normal
  });

  it('siguiente ejercicio de la superserie, en bucle', () => {
    expect(nextInSuperset('a', list)?.id).toBe('b');
    expect(nextInSuperset('b', list)?.id).toBe('a');
    expect(nextInSuperset('c', list)).toBeNull();
  });
});

describe('kcal de los entrenos', () => {
  it('(MET 4 − 1) × kg × horas', () => {
    expect(strengthWorkoutKcal(60 * 60_000, 80)).toBe(240);
    expect(strengthWorkoutKcal(75 * 60_000, 80)).toBe(300);
  });

  it('un entreno olvidado abierto cuenta como máximo 3 horas', () => {
    expect(strengthWorkoutKcal(10 * 3_600_000, 80)).toBe(720);
  });

  it('suma solo los terminados', () => {
    expect(
      workoutsKcal(
        [
          { startedAt: 0, endedAt: 3_600_000 },
          { startedAt: 0, endedAt: null },
        ],
        80,
      ),
    ).toBe(240);
  });
});

describe('racha semanal, totales y cambios de rutina', () => {
  // Jueves 5 de noviembre de 2026, 12:00.
  const now = new Date(2026, 10, 5, 12).getTime();

  it('cuenta semanas seguidas; la semana actual sin entrenar no rompe la racha', () => {
    expect(weeklyStreak(['2026-11-03', '2026-10-28', '2026-10-20'], now)).toBe(3);
    expect(weeklyStreak(['2026-10-28', '2026-10-20'], now)).toBe(2);
    expect(weeklyStreak(['2026-10-20'], now)).toBe(0);
  });

  it('totales por semana', () => {
    const weeks = weeklyTotals(
      [
        { localDate: '2026-11-03', startedAt: 0, endedAt: 3_600_000, volume: 5000, setCount: 20 },
        { localDate: '2026-11-04', startedAt: 0, endedAt: 1_800_000, volume: 1000, setCount: 5 },
        { localDate: '2026-10-27', startedAt: 0, endedAt: null, volume: 300, setCount: 3 },
      ],
      2,
      now,
    );
    expect(weeks).toEqual([
      { weekStart: '2026-10-26', workouts: 1, volume: 300, sets: 3, minutes: 0 },
      { weekStart: '2026-11-02', workouts: 2, volume: 6000, sets: 25, minutes: 90 },
    ]);
  });

  it('detecta si cambiaste ejercicios, series o superseries respecto a la rutina', () => {
    const base = [
      { exerciseId: 'a', supersetId: 'x', sets: [{ setType: 'normal' as const }] },
      { exerciseId: 'b', supersetId: 'x', sets: [{ setType: 'normal' as const }] },
    ];
    const same = base.map((e) => ({ ...e, supersetId: 'otro-id' }));
    expect(structureChanged(base, same)).toBe(false);
    expect(structureChanged(base, [base[0]!])).toBe(true);
    expect(structureChanged(base, [base[0]!, { ...base[1]!, supersetId: null }])).toBe(true);
    expect(structureChanged(base, [base[0]!, { ...base[1]!, sets: [{ setType: 'dropset' as const }] }])).toBe(true);
  });
});
