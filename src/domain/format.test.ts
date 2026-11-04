import { formatDuration, formatKcal, formatNumber, formatSigned, formatWeight, fromDisplayWeight } from './format';
import { parseDecimal, sanitizeDecimalInput, toInputText } from './parseNumber';

describe('formatNumber (formato español)', () => {
  it('usa coma decimal', () => {
    expect(formatNumber(62.5, { maxDecimals: 1 })).toBe('62,5');
  });
  it('agrupa miles con punto, también con 4 cifras', () => {
    expect(formatNumber(10000)).toBe('10.000');
    expect(formatNumber(1850)).toBe('1.850');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });
  it('quita ceros decimales sobrantes salvo minDecimals', () => {
    expect(formatNumber(60, { maxDecimals: 1 })).toBe('60');
    expect(formatNumber(60, { maxDecimals: 2, minDecimals: 1 })).toBe('60,0');
  });
  it('redondea', () => {
    expect(formatNumber(2.25, { maxDecimals: 1 })).toBe('2,3');
    expect(formatNumber(999.96, { maxDecimals: 1 })).toBe('1.000');
  });
  it('negativos con signo menos tipográfico', () => {
    expect(formatNumber(-260)).toBe('−260');
    expect(formatNumber(-0.01)).toBe('0');
  });
});

describe('formatSigned', () => {
  it('pone + a los positivos', () => {
    expect(formatSigned(1850)).toBe('+1.850');
    expect(formatSigned(-260)).toBe('−260');
    expect(formatSigned(0)).toBe('0');
  });
});

describe('pesos y kcal', () => {
  it('formatea kg y lb', () => {
    expect(formatWeight(62.5, 'kg')).toBe('62,5 kg');
    expect(formatWeight(100, 'lb')).toBe('220,5 lb');
  });
  it('convierte lb a kg', () => {
    expect(fromDisplayWeight(220.46226218, 'lb')).toBeCloseTo(100);
  });
  it('kcal', () => {
    expect(formatKcal(2250)).toBe('2.250 kcal');
  });
});

describe('formatDuration', () => {
  it('minutos y horas', () => {
    expect(formatDuration(150)).toBe('2:30');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(3909)).toBe('1:05:09');
  });
});

describe('entrada numérica', () => {
  it('acepta coma y punto y muestra coma', () => {
    expect(sanitizeDecimalInput('62.5', 1)).toBe('62,5');
    expect(sanitizeDecimalInput('62,5', 1)).toBe('62,5');
  });
  it('un solo separador y decimales limitados', () => {
    expect(sanitizeDecimalInput('62,5,3', 2)).toBe('62,53');
    expect(sanitizeDecimalInput('62,555', 2)).toBe('62,55');
  });
  it('sin decimales elimina separadores', () => {
    expect(sanitizeDecimalInput('10.000', 0)).toBe('10000');
  });
  it('separador al principio', () => {
    expect(sanitizeDecimalInput(',5', 1)).toBe('0,5');
  });
  it('descarta letras', () => {
    expect(sanitizeDecimalInput('6a2', 1)).toBe('62');
  });

  it('parseDecimal', () => {
    expect(parseDecimal('62,5')).toBe(62.5);
    expect(parseDecimal('62.5')).toBe(62.5);
    expect(parseDecimal('62,')).toBe(62);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
    expect(parseDecimal('1,2,3')).toBeNull();
  });

  it('toInputText', () => {
    expect(toInputText(62.5)).toBe('62,5');
    expect(toInputText(80)).toBe('80');
    expect(toInputText(null)).toBe('');
  });
});
