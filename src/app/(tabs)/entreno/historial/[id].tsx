import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorState, LoadingState, Screen, spacing } from '@/design';
import { useProfile } from '@/features/profile/queries';
import { formatWorkoutDate } from '@/features/workout/format';
import { useDeleteWorkout, useHistoryBests, useWorkout } from '@/features/workout/queries';
import { sessionRecords } from '@/features/workout/sessionRecords';
import { RecordList, WorkoutExercisesList, WorkoutStats } from '@/features/workout/WorkoutView';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  const profile = useProfile();
  const remove = useDeleteWorkout();
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
      <Button title="Borrar entreno" variant="danger" onPress={askDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { gap: spacing.xxs },
});
