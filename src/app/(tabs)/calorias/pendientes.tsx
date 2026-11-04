import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { Alert, Image, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, ErrorState, LoadingState, Screen, colors, radii, spacing } from '@/design';
import type { PendingPhoto } from '@/domain/nutritionTypes';
import { MEAL_LABELS } from '@/features/nutrition/labels';
import { usePendingPhotos, useResolvePending } from '@/features/nutrition/queries';
import { formatLongDay } from '@/features/steps/labels';

/** Fotos que no se pudieron analizar (sin conexión, sin clave…). */
export default function PendingPhotosScreen() {
  const pending = usePendingPhotos();

  if (pending.isPending) return <LoadingState />;
  if (pending.isError) return <ErrorState message={pending.error.message} onRetry={() => void pending.refetch()} />;
  if ((pending.data ?? []).length === 0) {
    return (
      <View style={styles.root}>
        <EmptyState icon="checkmark-circle-outline" title="Nada pendiente" message="Todas tus fotos están analizadas." />
      </View>
    );
  }

  return (
    <Screen edges={[]}>
      {(pending.data ?? []).map((p) => (
        <PendingCard key={p.id} photo={p} />
      ))}
    </Screen>
  );
}

function PendingCard({ photo }: { photo: PendingPhoto }) {
  const resolve = useResolvePending();
  const open = (manual: boolean) =>
    router.push({
      pathname: '/comida',
      params: { mode: 'pending', pendingId: photo.id, date: photo.localDate, ...(manual ? { manual: '1' } : {}) },
    });

  const remove = () =>
    Alert.alert('¿Borrar la foto pendiente?', 'No se añadirá nada a tu día.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () =>
          resolve.mutate(photo.id, {
            onSuccess: () => {
              try {
                new File(photo.photoUri).delete();
              } catch {
                // Si el archivo ya no existe, no pasa nada.
              }
            },
          }),
      },
    ]);

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Image source={{ uri: photo.photoUri }} style={styles.thumb} accessibilityLabel="Foto pendiente" />
        <View style={styles.flex}>
          <AppText variant="bodyStrong" style={styles.capitalize}>
            {MEAL_LABELS[photo.mealType]} · {formatLongDay(photo.localDate)}
          </AppText>
          {photo.lastError ? (
            <AppText variant="caption" color="textSecondary">
              {photo.lastError}
            </AppText>
          ) : null}
          {photo.attempts > 0 ? (
            <AppText variant="caption" color="textTertiary">
              {photo.attempts} {photo.attempts === 1 ? 'intento' : 'intentos'}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Analizar" compact onPress={() => open(false)} style={styles.flex} />
        <Button title="A mano" variant="secondary" compact onPress={() => open(true)} style={styles.flex} />
        <Button title="Borrar" variant="danger" compact onPress={remove} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised },
  flex: { flex: 1, gap: 2 },
  capitalize: { textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
