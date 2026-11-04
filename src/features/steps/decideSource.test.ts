import { decideSource } from './decideSource';

const base = {
  sensorOnly: false,
  healthSource: 'healthkit' as const,
  healthState: 'ok' as const,
  healthRecent: 42000,
  sensorUsable: true,
  sensorRecent: 41000,
};

describe('una sola fuente de pasos', () => {
  it('con permiso de Salud usa Salud, aunque el sensor también tenga datos', () => {
    expect(decideSource(base)).toEqual({ source: 'healthkit', reason: 'ok' });
  });

  it('Salud da 0 y el sensor no: el permiso de Salud se denegó (iOS lo oculta)', () => {
    expect(decideSource({ ...base, healthRecent: 0 })).toEqual({ source: 'pedometer', reason: 'health_denied' });
  });

  it('móvil recién estrenado, todo a 0: se queda con Salud', () => {
    expect(decideSource({ ...base, healthRecent: 0, sensorRecent: 0 })).toEqual({ source: 'healthkit', reason: 'ok' });
  });

  it('Salud no disponible (app compilada sin HealthKit): sensor', () => {
    expect(decideSource({ ...base, healthState: 'unavailable', healthRecent: null })).toEqual({
      source: 'pedometer',
      reason: 'health_unavailable',
    });
  });

  it('Health Connect denegado explícitamente y sin sensor: sin fuente', () => {
    expect(
      decideSource({ ...base, healthSource: 'health_connect', healthState: 'denied', healthRecent: null, sensorUsable: false, sensorRecent: null }),
    ).toEqual({ source: null, reason: 'no_source' });
  });

  it('si eliges solo el sensor, nunca se lee Salud', () => {
    expect(decideSource({ ...base, sensorOnly: true })).toEqual({ source: 'pedometer', reason: 'sensor_only' });
  });
});
