import {
  isHealthDataAvailableAsync,
  queryStatisticsCollectionForQuantity,
  requestAuthorization,
} from '@kingstinct/react-native-healthkit';
import { Linking } from 'react-native';

import { fromLocalDate, localDayRange, toLocalDate, type LocalDate } from '@/domain/localDay';

import type { StepsProvider } from './types';

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;

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
    return requestAuthorization({ toRead: [STEPS] });
  },

  async hasPermission() {
    return null;
  },

  async dailySteps(from: LocalDate, to: LocalDate) {
    const start = fromLocalDate(from);
    const end = new Date(localDayRange(to).end);
    const results = await queryStatisticsCollectionForQuantity(STEPS, ['cumulativeSum'], start, { day: 1 }, {
      unit: 'count',
      filter: { date: { startDate: start, endDate: end } },
    });
    const map = new Map<LocalDate, number>();
    for (const r of results) {
      if (!r.startDate) continue;
      map.set(toLocalDate(r.startDate.getTime()), Math.round(r.sumQuantity?.quantity ?? 0));
    }
    return map;
  },
};

export const HEALTH_APP_NAME = 'Salud';

/** Los permisos de Salud se cambian en la app Salud; abrimos los Ajustes de la app. */
export function openHealthSettings(): void {
  void Linking.openSettings();
}
