import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type ColorToken, type TypographyVariant } from '../tokens';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
};

/** Texto con la escala tipográfica de la app. Respeta el tamaño de letra del sistema. */
export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={variant === 'display' || variant === 'numberXL' ? 1.2 : 1.6}
      style={[typography[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}
