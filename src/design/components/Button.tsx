import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radii, spacing, type ColorToken } from '../tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Botón compacto (44 pt) para cabeceras y filas. */
  compact?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

const bgByVariant: Record<Variant, string> = {
  primary: colors.accent,
  secondary: colors.surfaceRaised,
  ghost: 'transparent',
  danger: colors.surfaceRaised,
};

const textByVariant: Record<Variant, ColorToken> = {
  primary: 'onAccent',
  secondary: 'text',
  ghost: 'text',
  danger: 'accentText',
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  compact = false,
  accessibilityHint,
  style,
}: Props) {
  const inactive = disabled || loading;
  const textColor = textByVariant[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact ? styles.compact : styles.regular,
        { backgroundColor: pressed && variant === 'primary' ? colors.accentPressed : bgByVariant[variant] },
        pressed && variant !== 'primary' ? styles.pressed : null,
        inactive ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[textColor]} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={20} color={textColor} /> : null}
          <AppText variant="bodyStrong" color={textColor} numberOfLines={1}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  regular: { minHeight: 52 },
  compact: { minHeight: 44 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
});
