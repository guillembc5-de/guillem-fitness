import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorState, Icon, LoadingState, Screen, spacing } from '@/design';
import { useProfile } from '@/features/profile/queries';
import { useHistoryBests, useWorkout } from '@/features/workout/queries';
import { sessionRecords } from '@/features/workout/sessionRecords';
import { RecordList, WorkoutExercisesList, WorkoutStats } from '@/features/workout/WorkoutView';

/** Resumen que aparece al terminar un entreno. */
export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  const profile = useProfile();
  const unit = profile.data?.weightUnit ?? 'kg';
  const exerciseIds = useMemo(() => [...new Set((workout.data?.exercises ?? []).map((e) => e.exerciseId))], [workout.data]);
  const bests = useHistoryBests(id, exerciseIds, workout.data?.startedAt);

  if (workout.isPending || bests.isPending) return <LoadingState />;
  if (!workout.data) return <ErrorState message="No se encontró el entreno." onRetry={() => router.back()} />;

  const w = workout.data;
  const records = sessionRecords(w, bests.data ?? {});
  const trackingOf = (name: string) => w.exercises.find((e) => e.exerciseNameSnapshot === name)?.trackingType ?? 'weight_reps';

  return (
    <Screen edges={['top']} footer={<Button title="Hecho" onPress={() => router.back()} />}>
      <View style={styles.hero}>
        <Icon name={records.length > 0 ? 'trophy' : 'checkmark-circle'} size={56} color={records.length > 0 ? 'accentText' : 'success'} />
        <AppText variant="title" align="center">
          ¡Entreno terminado!
        </AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {w.name}
          {records.length > 0 ? ` · ${records.length} ${records.length === 1 ? 'récord nuevo' : 'récords nuevos'}` : ''}
        </AppText>
      </View>
      <WorkoutStats workout={w} unit={unit} recordCount={records.length} />
      <RecordList records={records} unit={unit} trackingOf={trackingOf} />
      <WorkoutExercisesList workout={w} unit={unit} records={records} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.lg },
});
