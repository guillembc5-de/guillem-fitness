import { addDays, isLocalDate, todayLocalDate, type LocalDate } from '@/domain/localDay';

/**
 * Pasos que llegan de la app Salud a través de un Atajo de iPhone:
 *   guillemfitness://salud?pasos=8432                  (hoy)
 *   guillemfitness://salud?fecha=2026-11-05&pasos=8432
 *   guillemfitness://salud?dias=2026-11-04:9120,2026-11-05:8432
 *
 * Así se leen los pasos de Salud sin el permiso de HealthKit, que Apple no
 * siempre da a las apps instaladas con un Apple ID gratuito.
 */
export type HealthLinkDay = { localDate: LocalDate; steps: number };

export type HealthLinkResult = { ok: true; days: HealthLinkDay[] } | { ok: false; error: string };

/** Nadie da 100.000 pasos en un día: más es un error del Atajo. */
export const MAX_STEPS_PER_DAY = 100_000;
/** Solo se aceptan días recientes (un enlace no puede reescribir tu historial). */
export const MAX_DAYS_BACK = 31;

/**
 * Lee un número tal y como lo escribe Atajos según el idioma:
 * «8432», «8.432», «8,432», «8432,0» o «8432.5».
 */
export function parseStepCount(raw: string): number | null {
  const text = raw.replace(/[\s ]/g, '');
  if (!/^\d[\d.,]*$/.test(text)) return null;
  // Separadores de miles: 8.432 / 8,432 / 12.345.678
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ''));
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? Math.round(value) : null;
}

function validDay(localDate: string, steps: number | null, today: LocalDate): HealthLinkDay | string {
  if (!isLocalDate(localDate)) return `Fecha no válida: «${localDate}»`;
  if (localDate > today) return 'La fecha es del futuro';
  if (localDate < addDays(today, -MAX_DAYS_BACK)) return 'La fecha es de hace más de un mes';
  if (steps === null || steps < 0 || steps > MAX_STEPS_PER_DAY) return 'El número de pasos no es válido';
  return { localDate, steps };
}

export function parseHealthLink(params: { pasos?: string; fecha?: string; dias?: string }, now: number = Date.now()): HealthLinkResult {
  const today = todayLocalDate(now);
  const days: HealthLinkDay[] = [];
  if (params.dias) {
    for (const part of params.dias.split(/[;,|](?=\s*\d{4}-)/)) {
      const [date = '', count = ''] = part.trim().split(':');
      const day = validDay(date.trim(), parseStepCount(count), today);
      if (typeof day === 'string') return { ok: false, error: day };
      days.push(day);
    }
  } else if (params.pasos !== undefined) {
    const day = validDay((params.fecha ?? today).trim(), parseStepCount(params.pasos), today);
    if (typeof day === 'string') return { ok: false, error: day };
    days.push(day);
  }
  if (days.length === 0) return { ok: false, error: 'El enlace no trae pasos' };
  return { ok: true, days };
}
