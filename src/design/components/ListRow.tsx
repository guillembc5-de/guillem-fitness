import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../tokens';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

type Props = {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  /** Dibuja la línea separadora inferior (para filas dentro de una Card). */
  divider?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
};

export function ListRow({ title, subtitle, value, icon, onPress, divider = false, destructive = false, accessibilityHint }: Props) {
  const content = (
    <View style={[styles.row, divider ? styles.divider : null]}>
      {icon ? (
        <View style={styles.icon}>
          <Icon name={icon} size={22} color={destructive ? 'accentText' : 'textSecondary'} />
        </View>
      ) : null}
      <View style={styles.texts}>
        <AppText variant="body" color={destructive ? 'accentText' : 'text'} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="number" color="textSecondary" numberOfLines={1}>
          {value}
        </AppText>
      ) : null}
      {onPress ? <Icon name="chevron-forward" size={18} color="textTertiary" /> : null}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}: ${value}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  icon: { width: 28, alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  pressed: { backgroundColor: colors.surfaceRaised },
});
