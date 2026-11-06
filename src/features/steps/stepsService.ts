import { getRepositories } from '@/data/repositories';
import { addDays, todayLocalDate, type LocalDate } from '@/domain/localDay';
import type { IncomingStepDay } from '@/domain/stepTypes';

import { decideSource, type HealthState, type SourceDecision } from './decideSource';
import type { HealthLinkDay } from './healthLink';
import { getStepPrefs, setLastHealthLink, setStepPrefs } from './prefs';
import { healthProvider } from './providers/health';
import { pedometerProvider } from './providers/pedometer';
import type { StepsProvider } from './providers/types';

export type StepsStatus = SourceDecision & {
  setupDone: boolean;
  syncedAt: number | null;
  /** Error exacto de Salud, para saber por qué no se puede leer. */
  healthError?: string;
};

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sum(map: Map<LocalDate, number> | null): number | null {
  if (!map) return null;
  let total = 0;
  for (const v of map.values()) total += v;
  return total;
}

/**
 * Sincroniza los pasos: elige UNA fuente, lee los días nuevos y los guarda en
 * la base de datos (así el calendario conserva el historial aunque el sensor
 * solo recuerde 7 días). Nunca lanza: si algo falla, lo dice en el estado.
 */
export async function syncSteps(): Promise<StepsStatus> {
  const prefs = getStepPrefs();
  if (!prefs.setupDone) return { source: null, reason: 'no_source', setupDone: false, syncedAt: null };

  const repos = getRepositories();
  const profile = await repos.profile.get();
  if (!profile) return { source: null, reason: 'no_source', setupDone: true, syncedAt: null };

  const today = todayLocalDate();
  const weekFrom = addDays(today, -6);

  // 1. Salud / Health Connect (si no has elegido solo el sensor).
  let healthState: HealthState = 'unavailable';
  let healthWeek: Map<LocalDate, number> | null = null;
  let healthError: string | undefined;
  if (!prefs.sensorOnly && healthProvider) {
    try {
      if (!(await healthProvider.isAvailable())) {
        healthError = 'Este dispositivo dice que Salud no está disponible';
      } else {
        const permission = await healthProvider.hasPermission();
        if (permission === false) {
          healthState = 'denied';
        } else {
          healthWeek = await healthProvider.dailySteps(weekFrom, today);
          healthState = 'ok';
        }
      }
    } catch (e) {
      healthState = 'unavailable';
      healthError = errorText(e);
    }
  }

  // 2. Sensor: solo hace falta si Salud no sirve o si da 0 (posible denegación).
  let sensorUsable = false;
  let sensorWeek: Map<LocalDate, number> | null = null;
  const needSensor = prefs.sensorOnly || healthState !== 'ok' || (sum(healthWeek) ?? 0) === 0;
  if (needSensor) {
    try {
      sensorUsable = (await pedometerProvider.isAvailable()) && (await pedometerProvider.hasPermission()) === true;
      if (sensorUsable) sensorWeek = await pedometerProvider.dailySteps(weekFrom, today);
    } catch {
      sensorUsable = false;
    }
  }

  const decision = decideSource({
    sensorOnly: prefs.sensorOnly,
    healthSource: healthProvider?.source ?? null,
    healthState,
    healthRecent: sum(healthWeek),
    sensorUsable,
    sensorRecent: sum(sensorWeek),
  });

  const provider: StepsProvider | null =
    decision.source === 'pedometer' ? pedometerProvider : decision.source && healthProvider ? healthProvider : null;
  if (!provider) return { ...decision, setupDone: true, syncedAt: null, healthError };

  // 3. Solo lo nuevo: desde el último día guardado (menos uno, por si cambió) o todo el historial posible.
  const earliest = addDays(today, -(provider.historyDays - 1));
  const last = await repos.stepDays.lastDateFrom(provider.source);
  const from = last && addDays(last, -1) > earliest ? addDays(last, -1) : earliest;
  const weekData = provider.source === 'pedometer' ? sensorWeek : healthWeek;
  let days: Map<LocalDate, number>;
  try {
    days = from >= weekFrom && weekData ? weekData : await provider.dailySteps(from, today);
  } catch {
    return { ...decision, setupDone: true, syncedAt: null, healthError };
  }

  const incoming: IncomingStepDay[] = [];
  for (const [localDate, steps] of days) {
    if (localDate < from) continue;
    if (steps > 0 || localDate === today) incoming.push({ localDate, steps, source: provider.source });
  }
  await repos.stepDays.saveDays(incoming, {
    sex: profile.sex,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    stepGoal: profile.stepGoal,
    today,
  });

  return { ...decision, setupDone: true, syncedAt: Date.now(), healthError };
}

/** Primera vez: pide Salud y, como respaldo, el sensor de movimiento. */
export async function setupWithHealth(): Promise<void> {
  if (healthProvider && (await healthProvider.isAvailable())) {
    try {
      await healthProvider.requestPermission();
    } catch {
      // Sin HealthKit (por ejemplo, compilada sin él): seguirá con el sensor.
    }
  }
  if (await pedometerProvider.isAvailable()) {
    try {
      await pedometerProvider.requestPermission();
    } catch {
      // Sin permiso de movimiento: se informa en la pantalla.
    }
  }
  setStepPrefs({ setupDone: true, sensorOnly: false });
}

/** Usar solo el sensor del móvil, sin Salud. */
export async function setupSensorOnly(): Promise<void> {
  if (await pedometerProvider.isAvailable()) {
    try {
      await pedometerProvider.requestPermission();
    } catch {
      // Se informa en la pantalla.
    }
  }
  setStepPrefs({ setupDone: true, sensorOnly: true });
}

/**
 * Guarda los pasos que manda un Atajo desde la app Salud (ver healthLink.ts).
 * Cuentan como datos de Salud; si el sensor tiene más ese día, se queda el mayor.
 */
export async function importHealthLinkDays(days: readonly HealthLinkDay[]): Promise<number> {
  const repos = getRepositories();
  const profile = await repos.profile.get();
  if (!profile) throw new Error('Primero completa tu perfil');
  const changed = await repos.stepDays.saveDays(
    days.map((d) => ({ localDate: d.localDate, steps: d.steps, source: 'healthkit' as const })),
    { sex: profile.sex, heightCm: profile.heightCm, weightKg: profile.weightKg, stepGoal: profile.stepGoal, today: todayLocalDate() },
  );
  setStepPrefs({ setupDone: true });
  setLastHealthLink({ at: Date.now(), days: days.length, lastDate: days[days.length - 1]?.localDate ?? null });
  return changed;
}
