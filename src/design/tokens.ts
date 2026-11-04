import type { TextStyle } from 'react-native';

/**
 * Paleta. El rojo se reserva para la acción principal, el progreso, los
 * récords y las kcal quemadas. Si todo es rojo, nada destaca.
 */
export const colors = {
  bg: '#0B0B0C',
  surface: '#161618',
  surfaceRaised: '#1E1E21',
  border: '#26262A',
  text: '#F5F5F7',
  textSecondary: '#9A9AA0',
  /** Pistas y textos menores: el gris más oscuro que aún da AA (≥ 4,5:1) sobre todas las superficies. */
  textTertiary: '#85858C',
  /**
   * Rellenos: botón principal, anillos, barras de progreso. Algo más oscuro que
   * el #E5383B de partida para que el texto blanco del botón llegue a AA (4,7:1).
   */
  accent: '#DC2F33',
  accentPressed: '#BF272B',
  /** Texto rojo pequeño (récords, «−260 kcal»): AA sobre todas las superficies. */
  accentText: '#FF5C5F',
  onAccent: '#FFFFFF',
  success: '#2BB673',
  successSoft: 'rgba(43, 182, 115, 0.15)',
  warmup: '#F5A524',
  warmupSoft: 'rgba(245, 165, 36, 0.35)',
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Área táctil mínima (pt) según las guías de accesibilidad. */
export const MIN_TOUCH = 44;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Tipografía del sistema (SF Pro en iPhone). Las variantes numéricas usan
 * cifras tabulares para que los números no bailen al cambiar.
 */
export const typography = {
  display: { fontSize: 64, lineHeight: 70, fontWeight: '700', fontVariant: tabular, letterSpacing: -1 },
  numberXL: { fontSize: 40, lineHeight: 46, fontWeight: '700', fontVariant: tabular, letterSpacing: -0.5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  numberField: { fontSize: 24, lineHeight: 30, fontWeight: '600', fontVariant: tabular },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  number: { fontSize: 16, lineHeight: 22, fontWeight: '600', fontVariant: tabular },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
export type ColorToken = keyof typeof colors;
