/**
 * Días locales. Todo lo que se agrupa por día (pasos, comidas, entrenos) guarda
 * un `localDate` "AAAA-MM-DD" calculado con la zona horaria del móvil en el
 * momento del registro. Así una comida a las 23:59 se queda en su día.
 */

export type LocalDate = string;

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Instante (epoch ms) → día local "AAAA-MM-DD". */
export function toLocalDate(ms: number): LocalDate {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return toLocalDate(date.getTime()) === value;
}

function parts(localDate: LocalDate): [number, number, number] {
  const match = LOCAL_DATE_RE.exec(localDate);
  if (!match) throw new Error(`Fecha local no válida: ${localDate}`);
  return [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
}

/** Medianoche local del día (como Date). */
export function fromLocalDate(localDate: LocalDate): Date {
  const [y, m, d] = parts(localDate);
  return new Date(y, m, d);
}

/**
 * Límites del día local en epoch ms: [inicio, fin). Funciona en los días de
 * cambio de hora (23 o 25 horas) porque construye cada medianoche por separado.
 */
export function localDayRange(localDate: LocalDate): { start: number; end: number } {
  const [y, m, d] = parts(localDate);
  return { start: new Date(y, m, d).getTime(), end: new Date(y, m, d + 1).getTime() };
}

export function addDays(localDate: LocalDate, days: number): LocalDate {
  const [y, m, d] = parts(localDate);
  return toLocalDate(new Date(y, m, d + days).getTime());
}

/** Lunes de la semana del día dado (la semana empieza en lunes). */
export function startOfWeek(localDate: LocalDate): LocalDate {
  const date = fromLocalDate(localDate);
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDays(localDate, -mondayOffset);
}

export function todayLocalDate(now: number = Date.now()): LocalDate {
  return toLocalDate(now);
}

/** Días entre dos fechas locales (b − a). */
export function daysBetween(a: LocalDate, b: LocalDate): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm, bd) - Date.UTC(ay, am, ad)) / 86_400_000);
}
