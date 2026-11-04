import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '../tokens';

type Props = ViewProps & { padded?: boolean };

export function Card({ padded = true, style, ...rest }: Props) {
  return <View style={[styles.card, padded ? styles.padded : null, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  padded: { padding: spacing.md },
});
