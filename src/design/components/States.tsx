import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

type EmptyProps = {
  icon: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.center} accessible accessibilityLabel={message ? `${title}. ${message}` : title}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={32} color="textSecondary" />
      </View>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textSecondary" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

type ErrorProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Algo ha fallado', message, onRetry }: ErrorProps) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Icon name="alert-circle-outline" size={32} color="textSecondary" />
      </View>
      <AppText variant="headline" align="center">
        {title}
      </AppText>
      <AppText variant="body" color="textSecondary" align="center">
        {message}
      </AppText>
      {onRetry ? <Button title="Reintentar" variant="secondary" onPress={onRetry} style={styles.action} /> : null}
    </View>
  );
}

export function LoadingState({ label = 'Cargando…' }: { label?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.textSecondary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  action: { marginTop: spacing.sm, alignSelf: 'stretch' },
});
