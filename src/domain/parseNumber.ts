const MAX_INT_DIGITS = 7;

/**
 * Limpia lo que se escribe en un campo numérico mientras se teclea.
 * - Acepta coma o punto como separador decimal y lo muestra siempre como coma.
 * - Solo un separador y como mucho `maxDecimals` decimales.
 * - Con `maxDecimals = 0` elimina cualquier separador.
 */
export function sanitizeDecimalInput(text: string, maxDecimals: number): string {
  let intPart = '';
  let fracPart = '';
  let seenSeparator = false;

  for (const char of text) {
    if (char >= '0' && char <= '9') {
      if (seenSeparator) {
        if (fracPart.length < maxDecimals) fracPart += char;
      } else if (intPart.length < MAX_INT_DIGITS) {
        intPart += char;
      }
    } else if ((char === ',' || char === '.') && !seenSeparator && maxDecimals > 0) {
      seenSeparator = true;
    }
  }

  if (!seenSeparator) return intPart;
  return `${intPart === '' ? '0' : intPart},${fracPart}`;
}

/**
 * Convierte texto en número aceptando coma o punto decimal.
 * Devuelve `null` si está vacío o no es un número válido.
 */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '' || !/^\d+(\.\d*)?$|^\.\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Valor numérico → texto editable con coma ("62,5"); `null` → "". */
export function toInputText(value: number | null | undefined, maxDecimals = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  return String(rounded).replace('.', ',');
}
