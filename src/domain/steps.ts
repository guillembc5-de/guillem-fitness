import type { StepSource } from './enums';
import { addDays, daysBetween, fromLocalDate, localDayRange, toLocalDate, type LocalDate } from './localDay';
import type { Sex } from './types';

/** Longitud de zancada estimada (m) a partir de la altura. */
export function strideMeters(heightCm: number, sex: Sex): number {
  return (heightCm * (sex === 'male' ? 0.415 : 0.413)) / 100;
}

export function stepsDistanceMeters(steps: number, heightCm: number, sex: Sex): number {
  return steps * strideMeters(heightCm, sex);
}

/**
 * kcal NETAS de caminar (por encima del reposo): ≈ 0,5 kcal por kg y km.
 * Son netas para no contar dos veces el metabolismo basal, que ya está en el objetivo.
 */
export function stepsKcal(steps: number, weightKg: number, heightCm: number, sex: Sex): number {
  const km = stepsDistanceMeters(steps, heightCm, sex) / 1000;
  return 0.5 * weightKg * km;
}

export type Compliance = 'none' | 'low' | 'mid' | 'done';

/** Nivel de cumplimiento para colorear el calendario. */
export function compliance(steps: number | null, goal: number): Compliance {
  if (steps === null) return 'none';
  if (goal <= 0) return 'done';
  const ratio = steps / goal;
  if (ratio >= 1) return 'done';
  if (ratio >= 0.5) return 'mid';
  return 'low';
}

export type DayTotal = { localDate: LocalDate; steps: number; goal: number };

/**
 * Racha: días seguidos cumpliendo el objetivo hasta hoy. Si hoy aún no lo
 * has cumplido, la racha cuenta hasta ayer (el día no ha terminado).
 */
export function streak(days: readonly DayTotal[], today: LocalDate): number {
  const byDate = new Map(days.map((d) => [d.localDate, d]));
  const met = (date: LocalDate) => {
    const d = byDate.get(date);
    return d !== undefined && d.steps >= d.goal;
  };
  let cursor = met(today) ? today : addDays(today, -1);
  let count = 0;
  while (met(cursor)) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export type CalendarCell = { localDate: LocalDate; inMonth: boolean };

/**
 * Cuadrícula del mes: semanas completas de lunes a domingo (5 o 6 filas).
 * `month` va de 1 a 12.
 */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = toLocalDate(new Date(year, month - 1, 1).getTime());
  const last = toLocalDate(new Date(year, month, 0).getTime());
  const offset = (fromLocalDate(first).getDay() + 6) % 7;
  const start = addDays(first, -offset);
  const daysShown = offset + daysBetween(first, last) + 1;
  const total = Math.ceil(daysShown / 7) * 7;
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return Array.from({ length: total }, (_, i) => {
    const localDate = addDays(start, i);
    return { localDate, inMonth: localDate.startsWith(prefix) };
  });
}

/** Los 7 días (lunes a domingo) de la semana que empieza en `monday`. */
export function weekDates(monday: LocalDate): LocalDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Todos los días de un mes. */
export function monthDates(year: number, month: number): LocalDate[] {
  return monthGrid(year, month)
    .filter((c) => c.inMonth)
    .map((c) => c.localDate);
}

export type StepSample = { start: number; end: number; steps: number };

/**
 * Reparte muestras de pasos por día local. Una muestra que cruza la
 * medianoche (23:50–00:10) se reparte en proporción al tiempo de cada día.
 */
export function sumByLocalDay(samples: readonly StepSample[]): Map<LocalDate, number> {
  const totals = new Map<LocalDate, number>();
  const add = (date: LocalDate, steps: number) => totals.set(date, (totals.get(date) ?? 0) + steps);
  for (const s of samples) {
    if (s.steps <= 0) continue;
    const duration = s.end - s.start;
    if (duration <= 0) {
      add(toLocalDate(s.start), s.steps);
      continue;
    }
    let cursor = s.start;
    while (cursor < s.end) {
      const date = toLocalDate(cursor);
      const dayEnd = Math.min(localDayRange(date).end, s.end);
      add(date, (s.steps * (dayEnd - cursor)) / duration);
      cursor = dayEnd;
    }
  }
  for (const [date, steps] of totals) totals.set(date, Math.round(steps));
  return totals;
}

export type StoredDay = { steps: number; source: StepSource };

/**
 * Regla de una sola fuente: nunca se suman fuentes distintas.
 * - Misma fuente → se sobrescribe (el dato nuevo es más completo).
 * - Fuente distinta → se queda el mayor de los dos (no la suma).
 * Devuelve el valor a guardar, o null si no hay que tocar el día.
 */
export function mergeDay(existing: StoredDay | null, incoming: StoredDay): StoredDay | null {
  if (!existing) return incoming;
  if (existing.source === incoming.source) {
    return existing.steps === incoming.steps ? null : incoming;
  }
  if (existing.source === 'demo') return incoming;
  return incoming.steps > existing.steps ? incoming : null;
}
