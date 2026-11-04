import { localDayRange } from './localDay';
import {
  compliance,
  mergeDay,
  monthDates,
  monthGrid,
  stepsDistanceMeters,
  stepsKcal,
  streak,
  strideMeters,
  sumByLocalDay,
  weekDates,
} from './steps';

// TZ=Europe/Madrid (jest.globalSetup.js)

describe('distancia y kcal', () => {
  it('zancada según altura', () => {
    expect(strideMeters(180, 'male')).toBeCloseTo(0.747);
    expect(strideMeters(165, 'female')).toBeCloseTo(0.681, 3);
  });
  it('10.000 pasos ≈ 7,5 km y ≈ 300 kcal netas para 80 kg y 180 cm', () => {
    expect(stepsDistanceMeters(10000, 180, 'male')).toBeCloseTo(7470);
    expect(stepsKcal(10000, 80, 180, 'male')).toBeCloseTo(298.8, 1);
  });
});

describe('cumplimiento', () => {
  it('niveles para el calendario', () => {
    expect(compliance(null, 10000)).toBe('none');
    expect(compliance(3000, 10000)).toBe('low');
    expect(compliance(5000, 10000)).toBe('mid');
    expect(compliance(9999, 10000)).toBe('mid');
    expect(compliance(10000, 10000)).toBe('done');
  });
});

describe('racha', () => {
  const day = (localDate: string, steps: number) => ({ localDate, steps, goal: 10000 });

  it('cuenta días seguidos cumplidos hasta hoy', () => {
    const days = [day('2026-11-01', 12000), day('2026-11-02', 10500), day('2026-11-03', 11000), day('2026-11-04', 10000)];
    expect(streak(days, '2026-11-04')).toBe(4);
  });
  it('si hoy aún no lo has cumplido, la racha sigue viva hasta ayer', () => {
    const days = [day('2026-11-02', 10500), day('2026-11-03', 11000), day('2026-11-04', 2000)];
    expect(streak(days, '2026-11-04')).toBe(2);
  });
  it('un día sin cumplir o sin datos la corta', () => {
    const days = [day('2026-11-01', 12000), day('2026-11-03', 11000), day('2026-11-04', 10000)];
    expect(streak(days, '2026-11-04')).toBe(2);
    expect(streak([day('2026-11-02', 4000), day('2026-11-03', 11000)], '2026-11-04')).toBe(1);
  });
  it('usa el objetivo de cada día', () => {
    expect(streak([{ localDate: '2026-11-03', steps: 8000, goal: 8000 }], '2026-11-04')).toBe(1);
  });
  it('sin datos, 0', () => {
    expect(streak([], '2026-11-04')).toBe(0);
  });
});

describe('calendario (semana desde el lunes)', () => {
  it('noviembre 2026 empieza en domingo: la cuadrícula arranca el lunes 26 de octubre', () => {
    const grid = monthGrid(2026, 11);
    expect(grid[0]).toEqual({ localDate: '2026-10-26', inMonth: false });
    expect(grid[6]).toEqual({ localDate: '2026-11-01', inMonth: true });
    expect(grid.length % 7).toBe(0);
    expect(grid[grid.length - 1]?.localDate).toBe('2026-12-06');
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30);
  });
  it('febrero de 2027 que empieza en lunes ocupa 4 semanas justas', () => {
    expect(monthGrid(2027, 2)).toHaveLength(28);
    expect(monthGrid(2027, 2)[0]?.localDate).toBe('2027-02-01');
  });
  it('semana y días del mes', () => {
    expect(weekDates('2026-11-02')).toEqual([
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
    ]);
    expect(monthDates(2026, 2)).toHaveLength(28);
  });
});

describe('pasos por día local (medianoche)', () => {
  it('pasos a las 23:59 van a ese día y a las 00:01 al siguiente', () => {
    const t2359 = new Date(2026, 10, 4, 23, 59).getTime();
    const t0001 = new Date(2026, 10, 5, 0, 1).getTime();
    const totals = sumByLocalDay([
      { start: t2359, end: t2359 + 30_000, steps: 40 },
      { start: t0001, end: t0001 + 30_000, steps: 25 },
    ]);
    expect(totals.get('2026-11-04')).toBe(40);
    expect(totals.get('2026-11-05')).toBe(25);
  });

  it('una muestra que cruza la medianoche se reparte por tiempo', () => {
    const start = new Date(2026, 10, 4, 23, 50).getTime();
    const end = new Date(2026, 10, 5, 0, 10).getTime();
    const totals = sumByLocalDay([{ start, end, steps: 200 }]);
    expect(totals.get('2026-11-04')).toBe(100);
    expect(totals.get('2026-11-05')).toBe(100);
  });

  it('funciona el día del cambio de hora (25 h)', () => {
    const { start, end } = localDayRange('2026-10-25');
    const totals = sumByLocalDay([{ start: end - 60_000, end: end + 60_000, steps: 10 }, { start, end: start + 1000, steps: 5 }]);
    expect(totals.get('2026-10-25')).toBe(10);
    expect(totals.get('2026-10-26')).toBe(5);
  });
});

describe('una sola fuente por día', () => {
  it('misma fuente: se sobrescribe', () => {
    expect(mergeDay({ steps: 5000, source: 'healthkit' }, { steps: 6000, source: 'healthkit' })).toEqual({ steps: 6000, source: 'healthkit' });
    expect(mergeDay({ steps: 5000, source: 'healthkit' }, { steps: 5000, source: 'healthkit' })).toBeNull();
  });
  it('fuentes distintas: nunca se suman, se queda la mayor', () => {
    expect(mergeDay({ steps: 8000, source: 'healthkit' }, { steps: 7900, source: 'pedometer' })).toBeNull();
    expect(mergeDay({ steps: 7000, source: 'pedometer' }, { steps: 7400, source: 'healthkit' })).toEqual({ steps: 7400, source: 'healthkit' });
  });
  it('los datos reales sustituyen a los de prueba', () => {
    expect(mergeDay({ steps: 20000, source: 'demo' }, { steps: 3000, source: 'pedometer' })).toEqual({ steps: 3000, source: 'pedometer' });
  });
  it('día nuevo: se guarda', () => {
    expect(mergeDay(null, { steps: 10, source: 'pedometer' })).toEqual({ steps: 10, source: 'pedometer' });
  });
});
