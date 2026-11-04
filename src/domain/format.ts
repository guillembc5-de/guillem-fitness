import type { WeightUnit } from './types';

const MINUS = '−';
const LB_PER_KG = 2.2046226218;

type NumberFormatOptions = {
  /** Decimales máximos (se redondea). */
  maxDecimals?: number;
  /** Decimales que se muestran siempre, aunque sean cero. */
  minDecimals?: number;
};

/**
 * Formato español: punto de miles y coma decimal.
 * Agrupa también los números de 4 cifras ("10.000"), a diferencia de
 * `Intl` con `es-ES`, que deja "10000".
 */
export function formatNumber(value: number, { maxDecimals = 0, minDecimals = 0 }: NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) return '–';
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const negative = value < 0 && rounded !== 0;

  const [intRaw = '0', fracRaw = ''] = rounded.toFixed(maxDecimals).split('.');
  let frac = fracRaw;
  while (frac.length > minDecimals && frac.endsWith('0')) frac = frac.slice(0, -1);

  const grouped = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negative ? MINUS : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

/** "+1.850" / "−260" / "0". */
export function formatSigned(value: number, options?: NumberFormatOptions): string {
  const text = formatNumber(value, options);
  return value > 0 && text !== '0' ? `+${text}` : text;
}

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG;
}

export function lbToKg(lb: number): number {
  return lb / LB_PER_KG;
}

/** Peso guardado en kg → valor en la unidad elegida. */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg);
}

/** Valor introducido en la unidad elegida → kg para guardar. */
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : lbToKg(value);
}

/** "62,5 kg" o "137,8 lb". */
export function formatWeight(kg: number, unit: WeightUnit, maxDecimals = 1): string {
  return `${formatNumber(toDisplayWeight(kg, unit), { maxDecimals })} ${unit}`;
}

export function formatKcal(kcal: number): string {
  return `${formatNumber(kcal)} kcal`;
}

/** Segundos → "2:30" o "1:05:09". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  return `${minutes}:${ss}`;
}
