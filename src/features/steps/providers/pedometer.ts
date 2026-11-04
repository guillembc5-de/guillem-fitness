import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

import { addDays, daysBetween, localDayRange, type LocalDate } from '@/domain/localDay';

import type { StepsProvider } from './types';

/**
 * Podómetro del iPhone (CoreMotion). Respaldo cuando no hay acceso a Salud.
 * iOS solo guarda unos 7 días; la app apunta cada día en su base de datos
 * para que el calendario no se vacíe.
 * En Android el sensor no da historial, así que no se usa como fuente.
 */
export const pedometerProvider: StepsProvider = {
  source: 'pedometer',
  historyDays: 7,

  async isAvailable() {
    if (Platform.OS !== 'ios') return false;
    try {
      return await Pedometer.isAvailableAsync();
    } catch {
      return false;
    }
  },

  async requestPermission() {
    const result = await Pedometer.requestPermissionsAsync();
    return result.granted;
  },

  async hasPermission() {
    const result = await Pedometer.getPermissionsAsync();
    return result.granted;
  },

  async dailySteps(from: LocalDate, to: LocalDate) {
    const map = new Map<LocalDate, number>();
    const nowMs = Date.now();
    const days = daysBetween(from, to);
    for (let i = 0; i <= days; i++) {
      const date = addDays(from, i);
      const { start, end } = localDayRange(date);
      if (start > nowMs) break;
      const result = await Pedometer.getStepCountAsync(new Date(start), new Date(Math.min(end, nowMs)));
      map.set(date, result.steps);
    }
    return map;
  },
};
