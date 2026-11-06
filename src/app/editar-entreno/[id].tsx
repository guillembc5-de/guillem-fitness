import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, ErrorState, LoadingState, TextField, colors, spacing } from '@/design';
import { supersetLetters } from '@/domain/supersets';
import { EMPTY_BESTS } from '@/domain/workout';
import type { SetPatch, WorkoutDetail, WorkoutExercise } from '@/domain/workoutTypes';
import { useProfile } from '@/features/profile/queries';
import { ExerciseBlock } from '@/features/workout/ExerciseBlock';
import { formatWorkoutDate, formatWorkoutDuration } from '@/features/workout/format';
import { useHistoryBests, usePreviousSets, useSaveWorkoutEdits, useUpdateWorkoutDetails, useWorkout, useWorkoutActions } from '@/features/workout/queries';

/** Editar un entreno ya terminado (como en Hevy): datos, ejercicios y series. */
export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workout = useWorkout(id);
  if (workout.isPending) return <LoadingState />;
  if (!workout.data || workout.data.endedAt === null) return <ErrorState message="Este entreno no se puede editar." onRetry={() => router.back()} />;
  return <Editor workout={workout.data} />;
}

const MINUTE = 60_000;

function Editor({ workout }: { workout: WorkoutDetail }) {
  const profile = useProfile();
  const unit = profile.data?.weightUnit ?? 'kg';
  const actions = useWorkoutActions();
  const updateDetails = useUpdateWorkoutDetails();
  const saveEdits = useSaveWorkoutEdits();
  const [name, setName] = useState(workout.name);
  const [notes, setNotes] = useState(workout.notes ?? '');
  const [startedAt, setStartedAt] = useState(workout.startedAt);
  const [durationMin, setDurationMin] = useState(Math.max(1, Math.round(((workout.endedAt ?? workout.startedAt) - workout.startedAt) / MINUTE)));

  const exerciseIds = useMemo(() => [...new Set(workout.exercises.map((e) => e.exerciseId))], [workout.exercises]);
  const previous = usePreviousSets(workout.id, exerciseIds);
  const bests = useHistoryBests(workout.id, exerciseIds, workout.startedAt);
  const letters = useMemo(() => supersetLetters(workout.exercises), [workout.exercises]);

  const onComplete = useCallback(
    (_we: WorkoutExercise, setId: string, values: SetPatch) => actions.completeSet.mutate({ setId, values }),
    [actions.completeSet],
  );

  const save = () => {
    updateDetails.mutate(
      { id: workout.id, patch: { name, notes: notes || null, startedAt, endedAt: startedAt + durationMin * MINUTE } },
      { onSuccess: () => saveEdits.mutate(workout.id, { onSuccess: () => router.back() }) },
    );
  };

  const time = new Date(startedAt);
  const hhmm = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  const error = updateDetails.error ?? saveEdits.error;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AppText variant="headline" style={styles.flex}>
          Editar entreno
        </AppText>
        <Button title="Guardar" compact onPress={save} loading={updateDetails.isPending || saveEdits.isPending} />
      </View>
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={spacing.xl}>
        {error ? (
          <AppText variant="caption" color="accentText" accessibilityRole="alert">
            No se pudo guardar: {error.message}
          </AppText>
        ) : null}
        <Card style={styles.details}>
          <TextField label="Nombre" value={name} onChangeText={setName} />
          <TextField label="Nota del entreno" value={notes} onChangeText={setNotes} placeholder="Cómo te has sentido, qué cambiar…" />
          <Stepper
            label="Día"
            value={formatWorkoutDate(startedAt)}
            onMinus={() => setStartedAt((t) => t - 24 * 60 * MINUTE)}
            onPlus={() => setStartedAt((t) => t + 24 * 60 * MINUTE)}
            minusLabel="Un día antes"
            plusLabel="Un día después"
          />
          <Stepper
            label="Hora de inicio"
            value={hhmm}
            onMinus={() => setStartedAt((t) => t - 15 * MINUTE)}
            onPlus={() => setStartedAt((t) => t + 15 * MINUTE)}
            minusLabel="15 minutos antes"
            plusLabel="15 minutos después"
          />
          <Stepper
            label="Duración"
            value={formatWorkoutDuration(0, durationMin * MINUTE)}
            onMinus={() => setDurationMin((m) => Math.max(5, m - 5))}
            onPlus={() => setDurationMin((m) => Math.min(300, m + 5))}
            minusLabel="5 minutos menos"
            plusLabel="5 minutos más"
          />
        </Card>
        <AppText variant="caption" color="textTertiary">
          Los cambios en ejercicios y series se guardan al momento. Las series que añadas y no marques no se guardan.
        </AppText>

        {workout.exercises.map((we, i) => (
          <ExerciseBlock
            key={we.id}
            we={we}
            siblings={workout.exercises}
            index={i}
            unit={unit}
            previous={previous.data?.[we.exerciseId] ?? []}
            bests={bests.data?.[we.exerciseId] ?? EMPTY_BESTS}
            supersetLetter={we.supersetId ? (letters.get(we.supersetId) ?? null) : null}
            live={false}
            actions={actions}
            onComplete={onComplete}
          />
        ))}
        <Button
          title="Añadir ejercicio"
          icon="add"
          variant="secondary"
          onPress={() => router.push({ pathname: '/elegir-ejercicio', params: { target: 'workout', workoutId: workout.id } })}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Stepper(props: { label: string; value: string; onMinus: () => void; onPlus: () => void; minusLabel: string; plusLabel: string }) {
  return (
    <View style={styles.stepper}>
      <View style={styles.flex}>
        <AppText variant="caption" color="textSecondary">
          {props.label}
        </AppText>
        <AppText variant="bodyStrong">{props.value}</AppText>
      </View>
      <Button title="−" variant="secondary" compact onPress={props.onMinus} accessibilityLabel={props.minusLabel} />
      <Button title="+" variant="secondary" compact onPress={props.onPlus} accessibilityLabel={props.plusLabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  details: { gap: spacing.sm },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 48 },
});
