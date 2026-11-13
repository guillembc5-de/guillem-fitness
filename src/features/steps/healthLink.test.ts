import { parseHealthLink, parseStepCount } from './healthLink';

// TZ=Europe/Madrid. Jueves 5 de noviembre de 2026, 22:00.
const now = new Date(2026, 10, 5, 22).getTime();

describe('número de pasos tal y como lo escribe Atajos', () => {
  it.each([
    ['8432', 8432],
    ['8.432', 8432],
    ['8,432', 8432],
    ['8432,0', 8432],
    ['8432.6', 8433],
    ['12.345', 12345],
    [' 9 120 ', 9120],
    ['8.432 passos', 8432],
    ['8432 pasos', 8432],
    ['8432 count', 8432],
  ])('«%s» → %d', (raw, expected) => {
    expect(parseStepCount(raw)).toBe(expected);
  });

  it('rechaza texto que no es un número', () => {
    expect(parseStepCount('muchos')).toBeNull();
    expect(parseStepCount('-5')).toBeNull();
  });
});

describe('enlace de Salud', () => {
  it('solo pasos: son de hoy', () => {
    expect(parseHealthLink({ pasos: '8.432' }, now)).toEqual({ ok: true, days: [{ localDate: '2026-11-05', steps: 8432 }] });
  });

  it('con fecha', () => {
    expect(parseHealthLink({ fecha: '2026-11-04', pasos: '9120' }, now)).toEqual({ ok: true, days: [{ localDate: '2026-11-04', steps: 9120 }] });
  });

  it('varios días', () => {
    expect(parseHealthLink({ dias: '2026-11-04:9.120,2026-11-05:8432' }, now)).toEqual({
      ok: true,
      days: [
        { localDate: '2026-11-04', steps: 9120 },
        { localDate: '2026-11-05', steps: 8432 },
      ],
    });
  });

  it('no acepta fechas futuras, muy antiguas ni cifras absurdas', () => {
    expect(parseHealthLink({ fecha: '2026-11-06', pasos: '100' }, now).ok).toBe(false);
    expect(parseHealthLink({ fecha: '2026-09-01', pasos: '100' }, now).ok).toBe(false);
    expect(parseHealthLink({ pasos: '250000' }, now).ok).toBe(false);
    expect(parseHealthLink({ fecha: 'ayer', pasos: '100' }, now).ok).toBe(false);
    expect(parseHealthLink({}, now).ok).toBe(false);
  });
});

describe('anillos de Fitness en el enlace', () => {
  it('pasos, energía activa y minutos de ejercicio a la vez', () => {
    expect(parseHealthLink({ pasos: '8432', energia: '612,4 kcal', ejercicio: '48 min' }, now)).toEqual({
      ok: true,
      days: [{ localDate: '2026-11-05', steps: 8432, activeKcal: 612, exerciseMin: 48 }],
    });
  });

  it('sirve sin pasos, y un valor vacío es como si no viniera', () => {
    expect(parseHealthLink({ energia: '1.204', ejercicio: '' }, now)).toEqual({ ok: true, days: [{ localDate: '2026-11-05', activeKcal: 1204 }] });
  });

  it('rechaza cifras absurdas', () => {
    expect(parseHealthLink({ pasos: '100', energia: '25000' }, now).ok).toBe(false);
    expect(parseHealthLink({ ejercicio: '2000' }, now).ok).toBe(false);
    expect(parseHealthLink({ energia: 'mucha' }, now).ok).toBe(false);
  });
});
