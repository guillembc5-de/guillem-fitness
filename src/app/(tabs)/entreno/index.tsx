import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

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
import type { RoutineFolder, RoutineSummary } from '@/domain/workoutTypes';
import {
  useActiveWorkout,
  useDeleteRoutine,
  useDuplicateRoutine,
  useFolderActions,
  useReorderRoutines,
  useRoutineFolders,
  useRoutines,
} from '@/features/workout/queries';
import { autoSyncHevy } from '@/features/workout/hevySync';
import { useStartWorkoutFlow } from '@/features/workout/useStartWorkoutFlow';
import { useNow } from '@/lib/useNow';

/** Pide un nombre (en Android, que no tiene diálogo con texto, usa uno por defecto). */
function askName(title: string, initial: string, onDone: (name: string) => void) {
  if (Platform.OS === 'ios') {
    Alert.prompt(title, undefined, (text) => text.trim() && onDone(text.trim()), 'plain-text', initial);
  } else {
    onDone(initial);
  }
}

export default function EntrenoScreen() {
  const routines = useRoutines();
  const folders = useRoutineFolders();
  const active = useActiveWorkout();
  const client = useQueryClient();
  // Con Hevy Pro (clave guardada), los entrenos nuevos de Hevy entran solos al abrir Entreno.
  useFocusEffect(
    useCallback(() => {
      void autoSyncHevy().then((r) => {
        if (r && r.inserted + r.updated > 0) void client.invalidateQueries();
      });
    }, [client]),
  );
  const { startWorkout, starting } = useStartWorkoutFlow();
  const duplicate = useDuplicateRoutine();
  const remove = useDeleteRoutine();
  const reorder = useReorderRoutines();
  const folderActions = useFolderActions();
  const [ordering, setOrdering] = useState(false);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const nowMs = useNow(1000, active.data != null);

  const list = routines.data ?? [];
  const folderList = folders.data ?? [];
  const folderIds = new Set(folderList.map((f) => f.id));
  const loose = list.filter((r) => !r.folderId || !folderIds.has(r.folderId));

  /** Intercambia una rutina con la de al lado dentro de su grupo, manteniendo el orden global. */
  const move = (group: readonly RoutineSummary[], index: number, delta: -1 | 1) => {
    const a = group[index];
    const b = group[index + delta];
    if (!a || !b) return;
    const ids = list.map((r) => r.id);
    const ia = ids.indexOf(a.id);
    const ib = ids.indexOf(b.id);
    ids[ia] = b.id;
    ids[ib] = a.id;
    reorder.mutate(ids);
  };

  const chooseFolder = (r: RoutineSummary) =>
    showActionSheet('Mover a carpeta', [
      { label: 'Sin carpeta', selected: !r.folderId, onPress: () => folderActions.move.mutate({ routineId: r.id, folderId: null }) },
      ...folderList.map((f) => ({ label: f.name, selected: r.folderId === f.id, onPress: () => folderActions.move.mutate({ routineId: r.id, folderId: f.id }) })),
      {
        label: 'Nueva carpeta…',
        onPress: () =>
          askName('Nueva carpeta', `Carpeta ${folderList.length + 1}`, (name) =>
            folderActions.create.mutate(name, { onSuccess: (folderId) => folderActions.move.mutate({ routineId: r.id, folderId }) }),
          ),
      },
    ]);

  const openMenu = (r: RoutineSummary) =>
    showActionSheet(r.name, [
      { label: 'Editar rutina', onPress: () => router.push({ pathname: '/rutina-editor', params: { id: r.id } }) },
      { label: 'Duplicar', onPress: () => duplicate.mutate(r.id) },
      { label: 'Mover a carpeta', onPress: () => chooseFolder(r) },
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

  const openFolderMenu = (f: RoutineFolder) =>
    showActionSheet(f.name, [
      { label: 'Cambiar nombre', onPress: () => askName('Nombre de la carpeta', f.name, (name) => folderActions.rename.mutate({ id: f.id, name })) },
      {
        label: 'Borrar carpeta',
        destructive: true,
        onPress: () =>
          Alert.alert('¿Borrar la carpeta?', 'Sus rutinas no se borran: pasan a «Mis rutinas».', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Borrar', style: 'destructive', onPress: () => folderActions.remove.mutate(f.id) },
          ]),
      },
    ]);

  const toggleFolder = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderRoutines = (group: readonly RoutineSummary[]) =>
    group.map((r, i) => (
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
                onPress={() => move(group, i, -1)}
                style={[styles.iconButton, i === 0 ? styles.disabled : null]}
              >
                <Icon name="arrow-up" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Bajar ${r.name}`}
                disabled={i === group.length - 1}
                onPress={() => move(group, i, 1)}
                style={[styles.iconButton, i === group.length - 1 ? styles.disabled : null]}
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
    ));

  return (
    <Screen
      title="Entreno"
      headerRight={
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Traer entrenos de Hevy"
            onPress={() => router.push('/perfil/hevy')}
            style={styles.iconButton}
          >
            <Icon name="swap-horizontal-outline" size={26} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Historial y estadísticas" onPress={() => router.push('/entreno/historial')} style={styles.iconButton}>
            <Icon name="stats-chart-outline" size={26} />
          </Pressable>
        </View>
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

      <Button title="Empezar entreno vacío" icon="add" variant="secondary" loading={starting} onPress={() => void startWorkout(null, 'Entreno libre')} />
      <View style={styles.row}>
        <Button title="Nueva rutina" icon="clipboard-outline" variant="secondary" onPress={() => router.push('/rutina-editor')} style={styles.flex} />
        <Button title="Ejercicios" icon="search" variant="secondary" onPress={() => router.push('/entreno/ejercicios')} style={styles.flex} />
      </View>

      <View style={styles.sectionRow}>
        <SectionHeader title={`Rutinas (${list.length})`} />
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nueva carpeta"
            onPress={() => askName('Nueva carpeta', `Carpeta ${folderList.length + 1}`, (name) => folderActions.create.mutate(name))}
            style={styles.iconButton}
          >
            <Icon name="folder-open-outline" color="textSecondary" />
          </Pressable>
          {list.length > 1 ? (
            <Pressable accessibilityRole="button" onPress={() => setOrdering((o) => !o)} style={styles.textButton}>
              <AppText variant="bodyStrong" color="textSecondary">
                {ordering ? 'Listo' : 'Ordenar'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
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

      {folderList.map((f) => {
        const inFolder = list.filter((r) => r.folderId === f.id);
        const isCollapsed = collapsed.has(f.id);
        return (
          <View key={f.id} style={styles.folder}>
            <View style={styles.folderHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: !isCollapsed }}
                accessibilityLabel={`Carpeta ${f.name}, ${inFolder.length} rutinas`}
                onPress={() => toggleFolder(f.id)}
                style={styles.folderTitle}
              >
                <Icon name={isCollapsed ? 'chevron-forward' : 'chevron-down'} size={20} color="textSecondary" />
                <Icon name="folder-outline" size={20} color="textSecondary" />
                <AppText variant="bodyStrong" style={styles.flex}>
                  {f.name} ({inFolder.length})
                </AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de la carpeta ${f.name}`} onPress={() => openFolderMenu(f)} style={styles.iconButton}>
                <Icon name="ellipsis-horizontal" color="textSecondary" />
              </Pressable>
            </View>
            {!isCollapsed ? (
              inFolder.length > 0 ? (
                renderRoutines(inFolder)
              ) : (
                <AppText variant="caption" color="textTertiary">
                  Carpeta vacía. Usa «⋯ → Mover a carpeta» en una rutina.
                </AppText>
              )
            ) : null}
          </View>
        );
      })}

      {folderList.length > 0 && loose.length > 0 ? <SectionHeader title="Mis rutinas" /> : null}
      {renderRoutines(loose)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row' },
  row: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.3 },
  textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.accent },
  activeTexts: { flex: 1, gap: 2 },
  folder: { gap: spacing.sm },
  folderHeader: { flexDirection: 'row', alignItems: 'center' },
  folderTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
  routineCard: { gap: spacing.sm },
  routineHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
