import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ErrorState, LineChart, LoadingState, Screen, SectionHeader, spacing } from '@/design';
import { formatDuration, formatNumber, toDisplayWeight } from '@/domain/format';
import { setNumbers } from '@/domain/workout';
import { useProfile } from '@/features/profile/queries';
import { SET_TYPE_COLORS } from '@/features/workout/components';
import { setLabel } from '@/features/workout/labels';
import { formatSetShort, formatShortDate } from '@/features/workout/format';
import { useRoutine, useWorkouts } from '@/features/workout/queries';
import { useStartWorkoutFlow } from '@/features/workout/useStartWorkoutFlow';
import { useNow } from '@/lib/useNow';

const THREE_MONTHS = 92 * 86_400_000;

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = useRoutine(id);
  const workouts = useWorkouts();
  const profile = useProfile();
  const { startWorkout, starting } = useStartWorkoutFlow();
  const unit = profile.data?.weightUnit ?? 'kg';
  const defaultRest = profile.data?.defaultRestSeconds ?? 150;
  const nowMs = useNow(60_000);

  if (routine.isPending) return <LoadingState />;
  if (!routine.data) return <ErrorState message="Esta rutina ya no existe." />;
  const r = routine.data;

  const cutoff = nowMs - THREE_MONTHS;
  const sessions = (workouts.data ?? []).filter((w) => w.routineId === r.id && w.startedAt >= cutoff).reverse();
  const points = sessions.map((w) => ({ x: w.startedAt, y: toDisplayWeight(w.volume, unit) }));

  return (
    <Screen edges={[]} footer={<Button title="Empezar rutina" loading={starting} onPress={() => void startWorkout(r.id, r.name)} />}>
      <Stack.Screen
        options={{
          title: r.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/rutina-editor', params: { id: r.id } })}
              style={styles.headerButton}
            >
              <AppText variant="bodyStrong">Editar</AppText>
            </Pressable>
          ),
        }}
      />
      <AppText variant="title">{r.name}</AppText>

      {points.length > 1 ? (
        <Card style={styles.chart}>
          <AppText variant="caption" color="textSecondary">
            Volumen por entreno · últimos 3 meses
          </AppText>
          <LineChart
            points={points}
            formatX={formatShortDate}
            formatY={(y) => `${formatNumber(y)} ${unit}`}
            accessibilityLabel={`Volumen de ${points.length} entrenos con esta rutina`}
          />
        </Card>
      ) : null}

      <SectionHeader title={`Ejercicios (${r.exercises.length})`} />
      {r.exercises.map((e) => {
        const numbers = setNumbers(e.sets);
        return (
          <Card key={e.id} style={styles.exercise}>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Abre el historial del ejercicio"
              onPress={() => router.push({ pathname: '/entreno/ejercicios/[id]', params: { id: e.exercise.id } })}
            >
              <AppText variant="headline">{e.exercise.name}</AppText>
            </Pressable>
            <AppText variant="caption" color="textSecondary">
              ⏱ Descanso {formatDuration(e.restSeconds ?? e.exercise.defaultRestSeconds ?? defaultRest)}
            </AppText>
            {e.notes ? (
              <AppText variant="caption" color="textSecondary">
                {e.notes}
              </AppText>
            ) : null}
            {e.sets.map((s, si) => {
              return (
                <View key={s.id} style={styles.setLine}>
                  <AppText variant="number" color={s.setType === 'normal' ? 'textSecondary' : SET_TYPE_COLORS[s.setType]} style={styles.setNum}>
                    {setLabel(s.setType, numbers[si] ?? 0)}
                  </AppText>
                  <AppText variant="number">
                    {formatSetShort(e.exercise.trackingType, { weightKg: s.targetWeightKg, reps: s.targetReps, durationS: s.targetDurationS }, unit)}
                  </AppText>
                </View>
              );
            })}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  chart: { gap: spacing.xs },
  exercise: { gap: spacing.xxs },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 26 },
  setNum: { width: 24 },
});
