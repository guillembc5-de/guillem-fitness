import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorState, LoadingState, Screen, spacing } from '@/design';
import { useProfile } from '@/features/profile/queries';
import { formatWorkoutDate } from '@/features/workout/format';
import { useDeleteWorkout, useHistoryBests, useSaveWorkoutAsRoutine, useWorkout } from '@/features/workout/queries';
import { useStartWorkoutFlow } from '@/features/workout/useStartWorkoutFlow';
import { sessionRecords } from '@/features/workout/sessionRecords';
import { RecordList, WorkoutExercisesList, WorkoutStats } from '@/features/workout/WorkoutView';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  const profile = useProfile();
  const remove = useDeleteWorkout();
  const saveAsRoutine = useSaveWorkoutAsRoutine();
  const { repeatWorkout, starting } = useStartWorkoutFlow();
  const unit = profile.data?.weightUnit ?? 'kg';
  const exerciseIds = useMemo(() => [...new Set((workout.data?.exercises ?? []).map((e) => e.exerciseId))], [workout.data]);
  const bests = useHistoryBests(id, exerciseIds, workout.data?.startedAt);

  if (workout.isPending || bests.isPending) return <LoadingState />;
  if (!workout.data) return <ErrorState message="Este entreno ya no existe." />;

  const w = workout.data;
  // Los récords se calculan contra los entrenos anteriores a este.
  const records = sessionRecords(w, bests.data ?? {});
  const trackingOf = (name: string) => w.exercises.find((e) => e.exerciseNameSnapshot === name)?.trackingType ?? 'weight_reps';

  const askDelete = () =>
    Alert.alert('¿Borrar este entreno?', 'Desaparecerá del historial y de las gráficas.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate(w.id, { onSuccess: () => router.back() }) },
    ]);

  const askSaveAsRoutine = () =>
    Alert.alert('Guardar como rutina', 'Se creará una rutina nueva con estos ejercicios y series (lo que hiciste pasa a ser el objetivo).', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Crear rutina',
        onPress: () =>
          saveAsRoutine.mutate(
            { workoutId: w.id, routineId: null, name: w.name },
            { onSuccess: (routineId) => router.push({ pathname: '/entreno/rutina/[id]', params: { id: routineId } }) },
          ),
      },
    ]);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: w.name }} />
      <View style={styles.title}>
        <AppText variant="title">{w.name}</AppText>
        <AppText variant="body" color="textSecondary">
          {formatWorkoutDate(w.startedAt)}
        </AppText>
      </View>
      <WorkoutStats workout={w} unit={unit} recordCount={records.length} />
      <RecordList records={records} unit={unit} trackingOf={trackingOf} />
      <WorkoutExercisesList workout={w} unit={unit} records={records} />
      <View style={styles.actions}>
        <Button title="Repetir" icon="repeat" variant="secondary" loading={starting} onPress={() => void repeatWorkout(w.id)} style={styles.flex} />
        <Button title="Editar" icon="create-outline" variant="secondary" onPress={() => router.push({ pathname: '/editar-entreno/[id]', params: { id: w.id } })} style={styles.flex} />
      </View>
      <Button title="Guardar como rutina" icon="clipboard-outline" variant="secondary" loading={saveAsRoutine.isPending} onPress={askSaveAsRoutine} />
      <Button title="Borrar entreno" variant="danger" onPress={askDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.xxs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
