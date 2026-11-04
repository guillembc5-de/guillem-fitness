import { restRemainingSeconds } from './restTimer';

jest.mock('expo-notifications', () => ({}));
jest.mock('expo-haptics', () => ({}));

describe('temporizador de descanso por marcas de tiempo', () => {
  const start = 1_000_000;

  it('cuenta atrás desde la marca de fin', () => {
    const endsAt = start + 150_000; // 2:30
    expect(restRemainingSeconds(endsAt, start)).toBe(150);
    expect(restRemainingSeconds(endsAt, start + 60_000)).toBe(90);
  });

  it('sigue siendo correcto tras mucho tiempo en segundo plano', () => {
    const endsAt = start + 150_000;
    // La app vuelve 2 minutos después sin haber ejecutado ningún intervalo.
    expect(restRemainingSeconds(endsAt, start + 120_000)).toBe(30);
    // Y si vuelve cuando ya terminó, es 0 (nunca negativo).
    expect(restRemainingSeconds(endsAt, start + 600_000)).toBe(0);
  });

  it('redondea hacia arriba para no mostrar 0 antes de tiempo', () => {
    expect(restRemainingSeconds(start + 500, start)).toBe(1);
  });

  it('sin descanso activo es 0', () => {
    expect(restRemainingSeconds(null, start)).toBe(0);
  });
});
