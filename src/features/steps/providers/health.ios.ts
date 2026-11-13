import {
  isHealthDataAvailableAsync,
  queryStatisticsCollectionForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import type { IncomingExternalWorkout } from '@/domain/fitnessTypes';
import { fromLocalDate, localDayRange, toLocalDate, type LocalDate } from '@/domain/localDay';

import type { StepsProvider } from './types';

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;
const EXERCISE_TIME = 'HKQuantityTypeIdentifierAppleExerciseTime' as const;
const WORKOUTS = 'HKWorkoutTypeIdentifier' as const;

type Quantity = { unit: string; quantity: number };

/** kcal sea cual sea la unidad que devuelva Salud. */
function toKcal(q: Quantity | undefined): number | null {
  if (!q || !Number.isFinite(q.quantity)) return null;
  // HealthKit: «kcal» y «Cal» son kilocalorías; «cal», caloría pequeña.
  if (q.unit === 'kJ') return q.quantity / 4.184;
  if (q.unit === 'J') return q.quantity / 4184;
  if (q.unit === 'cal') return q.quantity / 1000;
  return q.quantity;
}

function toSeconds(q: Quantity | undefined): number | null {
  if (!q || !Number.isFinite(q.quantity)) return null;
  if (q.unit === 'min') return q.quantity * 60;
  if (q.unit === 'hr' || q.unit === 'h') return q.quantity * 3600;
  return q.quantity; // s
}

function toMeters(q: Quantity | undefined): number | null {
  if (!q || !Number.isFinite(q.quantity)) return null;
  if (q.unit === 'km') return q.quantity * 1000;
  if (q.unit === 'mi') return q.quantity * 1609.344;
  return q.quantity; // m
}

async function dailySum(type: typeof STEPS | typeof ACTIVE_ENERGY | typeof EXERCISE_TIME, unit: 'count' | 'kcal' | 'min', from: LocalDate, to: LocalDate) {
  const start = fromLocalDate(from);
  const end = new Date(localDayRange(to).end);
  const results = await queryStatisticsCollectionForQuantity(type, ['cumulativeSum'], start, { day: 1 }, {
    unit,
    filter: { date: { startDate: start, endDate: end } },
  });
  const map = new Map<LocalDate, number>();
  for (const r of results) {
    if (!r.startDate) continue;
    map.set(toLocalDate(r.startDate.getTime()), r.sumQuantity?.quantity ?? 0);
  }
  return map;
}

/**
 * Apple Salud (HealthKit). Da años de historial, sumados por día local con
 * la medianoche como ancla, así que los cambios de hora los resuelve iOS.
 */
export const healthProvider: StepsProvider = {
  source: 'healthkit',
  historyDays: 730,

  async isAvailable() {
    try {
      return await isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  },

  async requestPermission() {
    // iOS no dice si el usuario denegó la lectura: devuelve true en ambos casos.
    return requestAuthorization({ toRead: [STEPS, ACTIVE_ENERGY, EXERCISE_TIME, WORKOUTS] });
  },

  async hasPermission() {
    return null;
  },

  async dailySteps(from: LocalDate, to: LocalDate) {
    const sums = await dailySum(STEPS, 'count', from, to);
    return new Map([...sums].map(([d, v]) => [d, Math.round(v)] as const));
  },

  async dailyFitness(from: LocalDate, to: LocalDate) {
    const [kcal, minutes] = await Promise.all([dailySum(ACTIVE_ENERGY, 'kcal', from, to), dailySum(EXERCISE_TIME, 'min', from, to)]);
    const map = new Map<LocalDate, { activeKcal: number; exerciseMin: number }>();
    for (const d of new Set([...kcal.keys(), ...minutes.keys()])) {
      map.set(d, { activeKcal: Math.round(kcal.get(d) ?? 0), exerciseMin: Math.round(minutes.get(d) ?? 0) });
    }
    return map;
  },

  async workouts(from: LocalDate, to: LocalDate) {
    const startDate = fromLocalDate(from);
    const endDate = new Date(localDayRange(to).end);
    const list = await queryWorkoutSamples({ limit: 200, ascending: true, filter: { date: { startDate, endDate } } });
    return list.map((w): IncomingExternalWorkout => {
      const startedAt = w.startDate.getTime();
      const endedAt = w.endDate.getTime();
      const kcal = toKcal(w.totalEnergyBurned);
      const distance = toMeters(w.totalDistance);
      return {
        externalId: w.uuid,
        localDate: toLocalDate(startedAt),
        startedAt,
        endedAt,
        activityType: Number(w.workoutActivityType),
        durationS: Math.round(toSeconds(w.duration) ?? (endedAt - startedAt) / 1000),
        kcal: kcal === null ? null : Math.round(kcal),
        distanceM: distance === null || distance === 0 ? null : Math.round(distance),
        sourceName: w.sourceRevision.source.name || null,
      };
    });
  },
};

export const HEALTH_APP_NAME = 'Salud';

/** Los permisos de Salud se cambian en la app Salud; abrimos los Ajustes de la app. */
export function openHealthSettings(): void {
  void Linking.openSettings();
}
