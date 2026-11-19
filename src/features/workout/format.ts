import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { TrackingType } from '@/domain/enums';
import { formatDuration, formatNumber, toDisplayWeight } from '@/domain/format';
import type { WeightUnit } from '@/domain/types';

/** "60 × 7", "+10 × 10", "12 reps", "0:45", "3,16 km · 20:00". */
export function formatSetShort(
  tracking: TrackingType,
  set: { weightKg: number | null; reps: number | null; durationS: number | null; distanceM?: number | null },
  unit: WeightUnit,
): string {
  if (tracking === 'distance_duration') {
    const parts = [
      set.distanceM !== null && set.distanceM !== undefined && set.distanceM > 0 ? `${formatNumber(set.distanceM / 1000, { maxDecimals: 2 })} km` : null,
      set.durationS !== null ? formatDuration(set.durationS) : null,
    ].filter((p): p is string => p !== null);
    return parts.length > 0 ? parts.join(' · ') : '–';
  }
  if (tracking === 'duration') return set.durationS !== null ? formatDuration(set.durationS) : '–';
  if (tracking === 'reps_only') return set.reps !== null ? `${set.reps} reps` : '–';
  const w = set.weightKg !== null ? formatNumber(toDisplayWeight(set.weightKg, unit), { maxDecimals: 2 }) : '–';
  const prefix = tracking === 'added_weight_reps' && set.weightKg !== null && set.weightKg > 0 ? '+' : '';
  return `${prefix}${w} × ${set.reps ?? '–'}`;
}

/** "lun 3 nov 2026". */
export function formatWorkoutDate(ms: number): string {
  return format(ms, "EEE d MMM yyyy", { locale: es });
}

/** "3 nov". */
export function formatShortDate(ms: number): string {
  return format(ms, 'd MMM', { locale: es });
}

/** "noviembre 2026" con mayúscula inicial. */
export function formatMonth(ms: number): string {
  const text = format(ms, 'LLLL yyyy', { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Duración larga: "1 h 05 min" o "47 min". */
export function formatWorkoutDuration(startedAt: number, endedAt: number): string {
  const minutes = Math.max(1, Math.round((endedAt - startedAt) / 60_000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
