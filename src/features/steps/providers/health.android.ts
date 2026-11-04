import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

import { addDays, daysBetween, localDayRange, type LocalDate } from '@/domain/localDay';

import type { StepsProvider } from './types';

let initialized = false;

async function ensureInitialized(): Promise<boolean> {
  if (initialized) return true;
  if ((await getSdkStatus()) !== SdkAvailabilityStatus.SDK_AVAILABLE) return false;
  initialized = await initialize();
  return initialized;
}

/**
 * Health Connect (Android). Sin permiso de historial solo deja leer 30 días
 * hacia atrás desde que se concede; el resto lo guarda la app día a día.
 * Implementado según la documentación de la librería, pero sin probar en
 * un Android real (la app se usa en iPhone).
 */
export const healthProvider: StepsProvider = {
  source: 'health_connect',
  historyDays: 30,

  async isAvailable() {
    try {
      return await ensureInitialized();
    } catch {
      return false;
    }
  },

  async requestPermission() {
    if (!(await ensureInitialized())) return false;
    const granted = await requestPermission([{ accessType: 'read', recordType: 'Steps' }]);
    return granted.some((p) => 'recordType' in p && p.recordType === 'Steps');
  },

  async hasPermission() {
    if (!(await ensureInitialized())) return false;
    const granted = await getGrantedPermissions();
    return granted.some((p) => 'recordType' in p && p.recordType === 'Steps' && 'accessType' in p && p.accessType === 'read');
  },

  async dailySteps(from: LocalDate, to: LocalDate) {
    const map = new Map<LocalDate, number>();
    const days = daysBetween(from, to);
    for (let i = 0; i <= days; i++) {
      const date = addDays(from, i);
      const { start, end } = localDayRange(date);
      const result = await aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: { operator: 'between', startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString() },
      });
      map.set(date, Math.round(result.COUNT_TOTAL));
    }
    return map;
  },
};

export const HEALTH_APP_NAME = 'Health Connect';

export function openHealthSettings(): void {
  openHealthConnectSettings();
}
