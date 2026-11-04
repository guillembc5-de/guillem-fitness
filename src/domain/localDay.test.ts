import { addDays, daysBetween, isLocalDate, localDayRange, startOfWeek, toLocalDate } from './localDay';

// Los tests se ejecutan con TZ=Europe/Madrid (ver jest.globalSetup.js).

describe('límites de día local', () => {
  it('23:59 se queda en su día y 00:01 pasa al siguiente', () => {
    expect(toLocalDate(new Date(2026, 10, 4, 23, 59).getTime())).toBe('2026-11-04');
    expect(toLocalDate(new Date(2026, 10, 5, 0, 1).getTime())).toBe('2026-11-05');
  });

  it('usa la hora local, no UTC', () => {
    // 4-nov 00:30 en Madrid = 3-nov 23:30 UTC. Debe contar como 4 de noviembre.
    const ms = Date.UTC(2026, 10, 3, 23, 30);
    expect(toLocalDate(ms)).toBe('2026-11-04');
  });

  it('día con cambio a horario de verano (23 h)', () => {
    const { start, end } = localDayRange('2026-03-29');
    expect((end - start) / 3_600_000).toBe(23);
    expect(toLocalDate(new Date(2026, 2, 29, 23, 59).getTime())).toBe('2026-03-29');
    expect(toLocalDate(new Date(2026, 2, 30, 0, 1).getTime())).toBe('2026-03-30');
  });

  it('día con cambio a horario de invierno (25 h)', () => {
    const { start, end } = localDayRange('2026-10-25');
    expect((end - start) / 3_600_000).toBe(25);
    expect(toLocalDate(end - 60_000)).toBe('2026-10-25');
    expect(toLocalDate(end)).toBe('2026-10-26');
  });
});

describe('aritmética de días', () => {
  it('suma días cruzando meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('la semana empieza en lunes', () => {
    expect(startOfWeek('2026-11-04')).toBe('2026-11-02'); // miércoles → lunes
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02'); // domingo → lunes anterior
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02'); // lunes → mismo día
  });

  it('días entre fechas, sin errores por cambio de hora', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(daysBetween('2026-11-04', '2026-11-01')).toBe(-3);
  });

  it('valida fechas locales', () => {
    expect(isLocalDate('2026-02-28')).toBe(true);
    expect(isLocalDate('2026-02-30')).toBe(false);
    expect(isLocalDate('26-2-3')).toBe(false);
  });
});
