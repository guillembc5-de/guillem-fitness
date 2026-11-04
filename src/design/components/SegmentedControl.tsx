import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../tokens';
import { AppText } from './AppText';

export type SegmentOption<T extends string | number> = {
  value: T;
  label: string;
  accessibilityLabel?: string;
};

type Props<T extends string | number> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function SegmentedControl<T extends string | number>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected ? styles.selected : null]}
          >
            <AppText variant="bodyStrong" color={selected ? 'bg' : 'textSecondary'} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  selected: { backgroundColor: colors.text },
});
