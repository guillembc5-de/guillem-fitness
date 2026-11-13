import { addDays, isLocalDate, todayLocalDate, type LocalDate } from '@/domain/localDay';

/**
 * Pasos que llegan de la app Salud a través de un Atajo de iPhone:
 *   guillemfitness://salud?pasos=8432                  (hoy)
 *   guillemfitness://salud?fecha=2026-11-05&pasos=8432
 *   guillemfitness://salud?dias=2026-11-04:9120,2026-11-05:8432
 *   guillemfitness://salud?pasos=8432&energia=612&ejercicio=48   (+ anillos de Fitness)
 *
 * Así se leen los pasos de Salud sin el permiso de HealthKit, que Apple no
 * siempre da a las apps instaladas con un Apple ID gratuito.
 */
export type HealthLinkDay = {
  localDate: LocalDate;
  steps?: number;
  /** Energía activa de Fitness (kcal). */
  activeKcal?: number;
  /** Minutos de ejercicio de Fitness. */
  exerciseMin?: number;
};

export type HealthLinkResult = { ok: true; days: HealthLinkDay[] } | { ok: false; error: string };

/** Nadie da 100.000 pasos en un día: más es un error del Atajo. */
export const MAX_STEPS_PER_DAY = 100_000;
/** Más de 10.000 kcal activas o de 24 h de ejercicio es un error del Atajo. */
export const MAX_ACTIVE_KCAL = 10_000;
export const MAX_EXERCISE_MIN = 1440;
/** Solo se aceptan días recientes (un enlace no puede reescribir tu historial). */
export const MAX_DAYS_BACK = 31;

/**
 * Lee un número tal y como lo escribe Atajos según el idioma:
 * «8432», «8.432», «8,432», «8432,0» o «8432.5», con o sin la unidad detrás.
 */
export function parseStepCount(raw: string): number | null {
  // Quita la unidad del final («8.432 passos», «8432 count»).
  const text = raw
    .trim()
    .replace(/\s*\p{L}+\.?$/u, '')
    .replace(/[\s ]/g, '');
  if (!/^\d[\d.,]*$/.test(text)) return null;
  // Separadores de miles: 8.432 / 8,432 / 12.345.678
  if (/^\d{1,3}([.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ''));
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) ? Math.round(value) : null;
}

function validDate(localDate: string, today: LocalDate): string | null {
  if (!isLocalDate(localDate)) return `Fecha no válida: «${localDate}»`;
  if (localDate > today) return 'La fecha es del futuro';
  if (localDate < addDays(today, -MAX_DAYS_BACK)) return 'La fecha es de hace más de un mes';
  return null;
}

function validDay(localDate: string, steps: number | null, today: LocalDate): HealthLinkDay | string {
  const dateError = validDate(localDate, today);
  if (dateError) return dateError;
  if (steps === null || steps < 0 || steps > MAX_STEPS_PER_DAY) return 'El número de pasos no es válido';
  return { localDate, steps };
}

/** Un valor opcional del enlace: ausente o vacío = no viene; si viene, tiene que ser válido. */
function optionalValue(raw: string | undefined, max: number, label: string): number | undefined | string {
  if (raw === undefined || raw.trim() === '') return undefined;
  const value = parseStepCount(raw);
  if (value === null || value < 0 || value > max) return `${label} no es válido`;
  return value;
}

type LinkParams = { pasos?: string; fecha?: string; dias?: string; energia?: string; ejercicio?: string };

export function parseHealthLink(params: LinkParams, now: number = Date.now()): HealthLinkResult {
  const today = todayLocalDate(now);
  const days: HealthLinkDay[] = [];
  if (params.dias) {
    for (const part of params.dias.split(/[;,|](?=\s*\d{4}-)/)) {
      const [date = '', count = ''] = part.trim().split(':');
      const day = validDay(date.trim(), parseStepCount(count), today);
      if (typeof day === 'string') return { ok: false, error: day };
      days.push(day);
    }
  } else {
    const localDate = (params.fecha ?? today).trim();
    const activeKcal = optionalValue(params.energia, MAX_ACTIVE_KCAL, 'La energía activa');
    if (typeof activeKcal === 'string') return { ok: false, error: activeKcal };
    const exerciseMin = optionalValue(params.ejercicio, MAX_EXERCISE_MIN, 'Los minutos de ejercicio');
    if (typeof exerciseMin === 'string') return { ok: false, error: exerciseMin };
    let day: HealthLinkDay | null = null;
    if (params.pasos !== undefined && params.pasos.trim() !== '') {
      const withSteps = validDay(localDate, parseStepCount(params.pasos), today);
      if (typeof withSteps === 'string') return { ok: false, error: withSteps };
      day = withSteps;
    } else if (activeKcal !== undefined || exerciseMin !== undefined) {
      const dateError = validDate(localDate, today);
      if (dateError) return { ok: false, error: dateError };
      day = { localDate };
    }
    if (day) {
      if (activeKcal !== undefined) day.activeKcal = activeKcal;
      if (exerciseMin !== undefined) day.exerciseMin = exerciseMin;
      days.push(day);
    }
  }
  if (days.length === 0) return { ok: false, error: 'El enlace no trae pasos' };
  return { ok: true, days };
}
