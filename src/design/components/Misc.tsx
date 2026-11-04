import { StyleSheet, View } from 'react-native';

import { colors, spacing, type ColorToken } from '../tokens';
import { AppText } from './AppText';

export function SectionHeader({ title }: { title: string }) {
  return (
    <AppText variant="overline" color="textSecondary" accessibilityRole="header" style={styles.section}>
      {title}
    </AppText>
  );
}

type StatProps = {
  label: string;
  value: string;
  unit?: string;
  color?: ColorToken;
};

/** Dato grande con su etiqueta: «2.250 kcal». */
export function Stat({ label, value, unit, color = 'text' }: StatProps) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <View style={styles.statRow}>
        <AppText variant="headline" color={color} style={styles.statValue}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="caption" color="textSecondary">
            {unit}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.sm, marginBottom: -spacing.xs, paddingHorizontal: spacing.xxs },
  stat: { flex: 1, gap: 2 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs },
  statValue: { fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
