import { getRepositories } from '@/data/repositories';
import { addDays, todayLocalDate, type LocalDate } from '@/domain/localDay';
import type { IncomingStepDay } from '@/domain/stepTypes';

import { decideSource, type HealthState, type SourceDecision } from './decideSource';
import type { HealthLinkDay } from './healthLink';
import { getFitnessAsked, getStepPrefs, setFitnessAsked, setLastHealthLink, setStepPrefs } from './prefs';
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

  // Fitness (energía activa, minutos y entrenos) sale de Salud aunque los pasos vengan del sensor.
  if (healthState === 'ok' && healthProvider) await syncFitness(healthProvider, today);

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

/** Días hacia atrás que se releen de Fitness en cada sincronización. */
const FITNESS_DAYS = 14;

/**
 * Lee los anillos y los entrenos de los últimos días. Nunca lanza: si Salud
 * no deja (o no hay reloj), simplemente no llega nada.
 */
async function syncFitness(provider: StepsProvider, today: LocalDate): Promise<void> {
  try {
    // Quien ya tenía Salud conectada debe aceptar también estos datos (una sola vez).
    if (!getFitnessAsked()) {
      setFitnessAsked();
      await provider.requestPermission();
    }
    const from = addDays(today, -(FITNESS_DAYS - 1));
    const repos = getRepositories();
    if (provider.dailyFitness) {
      const days = await provider.dailyFitness(from, today);
      await repos.activity.saveDays([...days].map(([localDate, v]) => ({ localDate, ...v, source: 'healthkit' as const })));
    }
    if (provider.workouts) await repos.activity.saveWorkouts(await provider.workouts(from, today));
  } catch {
    // Sin permiso o sin datos de Fitness: los pasos siguen funcionando igual.
  }
}

/** Primera vez: pide Salud y, como respaldo, el sensor de movimiento. */
export async function setupWithHealth(): Promise<void> {
  if (healthProvider && (await healthProvider.isAvailable())) {
    try {
      setFitnessAsked();
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
 * Guarda lo que manda un Atajo desde la app Salud (ver healthLink.ts).
 * Los pasos cuentan como datos de Salud (si el sensor tiene más ese día, se
 * queda el mayor). La energía activa y los minutos van a Fitness.
 */
export async function importHealthLinkDays(days: readonly HealthLinkDay[]): Promise<number> {
  const repos = getRepositories();
  const profile = await repos.profile.get();
  if (!profile) throw new Error('Primero completa tu perfil');
  const stepDays: IncomingStepDay[] = days.flatMap((d) => (d.steps === undefined ? [] : [{ localDate: d.localDate, steps: d.steps, source: 'healthkit' as const }]));
  let changed = 0;
  if (stepDays.length > 0) {
    changed += await repos.stepDays.saveDays(stepDays, {
      sex: profile.sex,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      stepGoal: profile.stepGoal,
      today: todayLocalDate(),
    });
  }
  changed += await repos.activity.saveDays(
    days.map((d) => ({ localDate: d.localDate, activeKcal: d.activeKcal, exerciseMin: d.exerciseMin, source: 'shortcut' as const })),
  );
  setStepPrefs({ setupDone: true });
  setLastHealthLink({ at: Date.now(), days: days.length, lastDate: days[days.length - 1]?.localDate ?? null });
  return changed;
}
