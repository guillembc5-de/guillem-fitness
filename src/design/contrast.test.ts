import { colors } from './tokens';

/** Contraste WCAG 2.x entre dos colores hex opacos. */
function luminance(hex: string): number {
  const v = hex.replace('#', '');
  const channel = (i: number) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const BACKGROUNDS = { bg: colors.bg, surface: colors.surface, surfaceRaised: colors.surfaceRaised };
const TEXTS = {
  text: colors.text,
  textSecondary: colors.textSecondary,
  textTertiary: colors.textTertiary,
  accentText: colors.accentText,
  success: colors.success,
  warmup: colors.warmup,
  info: colors.info,
};

describe('contraste AA (4,5:1) de todo el texto', () => {
  for (const [bgName, bg] of Object.entries(BACKGROUNDS)) {
    for (const [textName, fg] of Object.entries(TEXTS)) {
      it(`${textName} sobre ${bgName}`, () => {
        expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it('texto blanco sobre el botón rojo', () => {
    expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('número oscuro sobre el día cumplido (verde) del calendario', () => {
    expect(contrast(colors.bg, colors.success)).toBeGreaterThanOrEqual(4.5);
  });

  it('los elementos gráficos rojos (anillo, barras) superan 3:1 sobre el fondo', () => {
    expect(contrast(colors.accent, colors.bg)).toBeGreaterThanOrEqual(3);
  });
});
