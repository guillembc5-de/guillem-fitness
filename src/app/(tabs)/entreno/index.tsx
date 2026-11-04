import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Screen,
  SectionHeader,
  colors,
  showActionSheet,
  spacing,
} from '@/design';
import { formatDuration } from '@/domain/format';
import type { RoutineSummary } from '@/domain/workoutTypes';
import { useActiveWorkout, useDeleteRoutine, useDuplicateRoutine, useReorderRoutines, useRoutines } from '@/features/workout/queries';
import { useStartWorkoutFlow } from '@/features/workout/useStartWorkoutFlow';
import { useNow } from '@/lib/useNow';

export default function EntrenoScreen() {
  const routines = useRoutines();
  const active = useActiveWorkout();
  const { startWorkout, starting } = useStartWorkoutFlow();
  const duplicate = useDuplicateRoutine();
  const remove = useDeleteRoutine();
  const reorder = useReorderRoutines();
  const [ordering, setOrdering] = useState(false);
  const nowMs = useNow(1000, active.data != null);

  const list = routines.data ?? [];

  const move = (index: number, delta: -1 | 1) => {
    const ids = list.map((r) => r.id);
    const j = index + delta;
    const a = ids[index];
    const b = ids[j];
    if (a === undefined || b === undefined) return;
    ids[index] = b;
    ids[j] = a;
    reorder.mutate(ids);
  };

  const openMenu = (r: RoutineSummary) =>
    showActionSheet(r.name, [
      { label: 'Editar rutina', onPress: () => router.push({ pathname: '/rutina-editor', params: { id: r.id } }) },
      { label: 'Duplicar', onPress: () => duplicate.mutate(r.id) },
      {
        label: 'Borrar rutina',
        destructive: true,
        onPress: () =>
          Alert.alert('¿Borrar la rutina?', `«${r.name}» desaparecerá de tu lista. Los entrenos que ya hiciste con ella se conservan.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate(r.id) },
          ]),
      },
    ]);

  return (
    <Screen
      title="Entreno"
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Historial de entrenos"
          onPress={() => router.push('/entreno/historial')}
          style={styles.iconButton}
        >
          <Icon name="time-outline" size={26} />
        </Pressable>
      }
    >
      {active.data ? (
        <Card style={styles.activeCard}>
          <View style={styles.activeTexts}>
            <AppText variant="caption" color="textSecondary">
              Entreno en curso
            </AppText>
            <AppText variant="headline" numberOfLines={1}>
              {active.data.name}
            </AppText>
            <AppText variant="number" color="textSecondary">
              {formatDuration((nowMs - active.data.startedAt) / 1000)}
            </AppText>
          </View>
          <Button title="Reanudar" compact onPress={() => router.push('/entreno-activo')} />
        </Card>
      ) : null}

      <Button
        title="Empezar entreno vacío"
        icon="add"
        variant="secondary"
        loading={starting}
        onPress={() => void startWorkout(null, 'Entreno libre')}
      />
      <View style={styles.row}>
        <Button
          title="Nueva rutina"
          icon="clipboard-outline"
          variant="secondary"
          onPress={() => router.push('/rutina-editor')}
          style={styles.flex}
        />
        <Button
          title="Ejercicios"
          icon="search"
          variant="secondary"
          onPress={() => router.push('/entreno/ejercicios')}
          style={styles.flex}
        />
      </View>

      <View style={styles.sectionRow}>
        <SectionHeader title={`Mis rutinas (${list.length})`} />
        {list.length > 1 ? (
          <Pressable accessibilityRole="button" onPress={() => setOrdering((o) => !o)} style={styles.textButton}>
            <AppText variant="bodyStrong" color="textSecondary">
              {ordering ? 'Listo' : 'Ordenar'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {routines.isPending ? <LoadingState /> : null}
      {routines.isError ? <ErrorState message={routines.error.message} onRetry={() => void routines.refetch()} /> : null}
      {routines.isSuccess && list.length === 0 ? (
        <EmptyState
          icon="clipboard-outline"
          title="Sin rutinas"
          message="Crea una rutina con tus ejercicios para empezar más rápido."
          actionLabel="Crear rutina"
          onAction={() => router.push('/rutina-editor')}
        />
      ) : null}

      {list.map((r, i) => (
        <Card key={r.id} style={styles.routineCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rutina ${r.name}. ${r.exerciseNames.length} ejercicios`}
            accessibilityHint="Abre el detalle de la rutina"
            onPress={() => router.push({ pathname: '/entreno/rutina/[id]', params: { id: r.id } })}
            style={styles.routineHeader}
          >
            <View style={styles.flex}>
              <AppText variant="headline">{r.name}</AppText>
              <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                {r.exerciseNames.length > 0 ? r.exerciseNames.join(', ') : 'Sin ejercicios'}
              </AppText>
            </View>
            {ordering ? (
              <View style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Subir ${r.name}`}
                  disabled={i === 0}
                  onPress={() => move(i, -1)}
                  style={[styles.iconButton, i === 0 ? styles.disabled : null]}
                >
                  <Icon name="arrow-up" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bajar ${r.name}`}
                  disabled={i === list.length - 1}
                  onPress={() => move(i, 1)}
                  style={[styles.iconButton, i === list.length - 1 ? styles.disabled : null]}
                >
                  <Icon name="arrow-down" />
                </Pressable>
              </View>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${r.name}`} onPress={() => openMenu(r)} style={styles.iconButton}>
                <Icon name="ellipsis-horizontal" color="textSecondary" />
              </Pressable>
            )}
          </Pressable>
          {!ordering ? <Button title="Empezar rutina" loading={starting} onPress={() => void startWorkout(r.id, r.name)} /> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.accent },
  activeTexts: { flex: 1, gap: 2 },
  routineCard: { gap: spacing.sm },
  routineHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
