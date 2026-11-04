import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import type { StepSource } from '@/domain/enums';
import { fromLocalDate, type LocalDate } from '@/domain/localDay';

export const SOURCE_LABELS: Record<StepSource, string> = {
  healthkit: 'Salud',
  health_connect: 'Health Connect',
  pedometer: 'Sensor del iPhone',
  demo: 'Datos de prueba',
};

export const WEEKDAY_INITIALS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;

/** "miércoles 4 de noviembre". */
export function formatLongDay(date: LocalDate): string {
  return format(fromLocalDate(date), "EEEE d 'de' MMMM", { locale: es });
}

/** "3–9 nov" o "29 dic – 4 ene". */
export function formatWeekRange(monday: LocalDate, sunday: LocalDate): string {
  const a = fromLocalDate(monday);
  const b = fromLocalDate(sunday);
  if (a.getMonth() === b.getMonth()) return `${format(a, 'd', { locale: es })}–${format(b, 'd MMM', { locale: es })}`;
  return `${format(a, 'd MMM', { locale: es })} – ${format(b, 'd MMM', { locale: es })}`;
}

/** "Noviembre 2026". */
export function formatMonthTitle(year: number, month: number): string {
  const text = format(new Date(year, month - 1, 1), 'LLLL yyyy', { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}
