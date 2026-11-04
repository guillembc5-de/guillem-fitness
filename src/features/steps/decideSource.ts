import type { StepSource } from '@/domain/enums';

export type HealthState = 'ok' | 'denied' | 'unavailable';

export type SourceReason =
  /** Usando Salud / Health Connect. */
  | 'ok'
  /** Elegiste usar solo el sensor. */
  | 'sensor_only'
  /** Salud parece denegado: Salud da 0 pasos y el sensor no. */
  | 'health_denied'
  /** Salud no está disponible (o la app se compiló sin HealthKit). */
  | 'health_unavailable'
  /** Ni Salud ni sensor. */
  | 'no_source';

export type SourceDecision = { source: StepSource | null; reason: SourceReason };

type Input = {
  sensorOnly: boolean;
  healthSource: StepSource | null;
  healthState: HealthState;
  /** Pasos de los últimos 7 días según Salud (null si no se pudo leer). */
  healthRecent: number | null;
  sensorUsable: boolean;
  /** Pasos de los últimos 7 días según el sensor (null si no se pudo leer). */
  sensorRecent: number | null;
};

/**
 * Elige UNA fuente de pasos. Nunca se mezclan: mezclar duplica los pasos.
 * iOS no dice si se denegó la lectura de Salud (simplemente devuelve 0), así
 * que si Salud da 0 y el sensor sí cuenta pasos, se asume denegado.
 */
export function decideSource(i: Input): SourceDecision {
  const sensor: SourceDecision | null = i.sensorUsable ? { source: 'pedometer', reason: 'ok' } : null;

  if (i.sensorOnly) return sensor ? { source: 'pedometer', reason: 'sensor_only' } : { source: null, reason: 'no_source' };

  if (i.healthState === 'ok' && i.healthSource) {
    const healthSilent = (i.healthRecent ?? 0) === 0;
    if (healthSilent && sensor && (i.sensorRecent ?? 0) > 0) return { source: 'pedometer', reason: 'health_denied' };
    return { source: i.healthSource, reason: 'ok' };
  }

  const reason: SourceReason = i.healthState === 'denied' ? 'health_denied' : 'health_unavailable';
  return sensor ? { source: 'pedometer', reason } : { source: null, reason: 'no_source' };
}
