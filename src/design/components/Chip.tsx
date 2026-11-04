import { Pressable, StyleSheet } from 'react-native';

import { colors, radii, spacing } from '../tokens';
import { AppText } from './AppText';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

/** Píldora seleccionable para filtros. */
export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.chip, selected ? styles.selected : null]}
    >
      <AppText variant="caption" color={selected ? 'bg' : 'text'} numberOfLines={1} style={styles.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.text },
  text: { fontWeight: '600' },
});
