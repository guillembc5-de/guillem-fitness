import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Card, EmptyState, Icon, LoadingState, colors, radii, showActionSheet, spacing } from '@/design';
import { formatDuration } from '@/domain/format';
import { EMPTY_BESTS, recordsInSession, type ExerciseBests } from '@/domain/workout';
import type { SetPatch, WorkoutDetail, WorkoutExercise, WorkoutSet } from '@/domain/workoutTypes';
import type { WeightUnit } from '@/domain/types';
import { useProfile } from '@/features/profile/queries';
import { RestLabel, REST_CHOICES } from '@/features/workout/components';
import {
  useActiveWorkout,
  useDeleteWorkout,
  useFinishWorkout,
  useHistoryBests,
  usePreviousSets,
  useWorkoutActions,
} from '@/features/workout/queries';
import {
  cancelRestNotification,
  getNotificationPermission,
  hapticRestDone,
  hapticSetDone,
  restRemainingSeconds,
  scheduleRestEnd,
} from '@/features/workout/restTimer';
import { useRestUi } from '@/features/workout/restUiStore';
import { SetHeader, SetRow } from '@/features/workout/SetRow';
import { matchPreviousSets, setNumbers } from '@/domain/workout';
import { useNow } from '@/lib/useNow';

export default function ActiveWorkoutScreen() {
  const active = useActiveWorkout();
  const profile = useProfile();

  if (active.isPending) return <LoadingState />;
  if (!active.data) {
    return (
      <SafeAreaView style={styles.root}>
        <EmptyState icon="barbell-outline" title="No hay ningún entreno en curso" actionLabel="Volver" onAction={() => router.back()} />
      </SafeAreaView>
    );
  }
  return <ActiveWorkoutView workout={active.data} unit={profile.data?.weightUnit ?? 'kg'} />;
}

function ActiveWorkoutView({ workout, unit }: { workout: WorkoutDetail; unit: WeightUnit }) {
  const actions = useWorkoutActions();
  const finish = useFinishWorkout();
  const discard = useDeleteWorkout();
  const nowMs = useNow(500);
  const [notifDenied, setNotifDenied] = useState(false);

  const exerciseIds = useMemo(() => [...new Set(workout.exercises.map((e) => e.exerciseId))], [workout.exercises]);
  const previous = usePreviousSets(workout.id, exerciseIds);
  const bests = useHistoryBests(workout.id, exerciseIds);

  useEffect(() => {
    void getNotificationPermission().then((p) => setNotifDenied(p === 'denied'));
  }, []);

  // ----- Descanso -----
  const remaining = restRemainingSeconds(workout.restEndsAt, nowMs);
  const restUi = useRestUi();
  const wasResting = useRef(false);
  useEffect(() => {
    if (remaining > 0) {
      wasResting.current = true;
    } else if (wasResting.current) {
      wasResting.current = false;
      hapticRestDone();
      actions.setRest.mutate({ workoutId: workout.id, restEndsAt: null, notificationId: null });
    }
  }, [remaining, actions.setRest, workout.id]);

  const startRest = useCallback(
    async (seconds: number, nextExercise: string) => {
      await cancelRestNotification(workout.restNotificationId);
      const endsAt = Date.now() + seconds * 1000;
      useRestUi.getState().set(endsAt, seconds * 1000);
      const notificationId = await scheduleRestEnd(endsAt, nextExercise);
      actions.setRest.mutate({ workoutId: workout.id, restEndsAt: endsAt, notificationId });
    },
    [workout.id, workout.restNotificationId, actions.setRest],
  );

  const adjustRest = async (deltaSeconds: number) => {
    if (workout.restEndsAt === null) return;
    const endsAt = Math.max(Date.now() + 1000, workout.restEndsAt + deltaSeconds * 1000);
    const total = restUi.endsAt === workout.restEndsAt && restUi.totalMs ? restUi.totalMs + deltaSeconds * 1000 : null;
    useRestUi.getState().set(endsAt, total);
    await cancelRestNotification(workout.restNotificationId);
    const notificationId = await scheduleRestEnd(endsAt, 'siguiente serie');
    actions.setRest.mutate({ workoutId: workout.id, restEndsAt: endsAt, notificationId });
  };

  const skipRest = async () => {
    wasResting.current = false;
    await cancelRestNotification(workout.restNotificationId);
    actions.setRest.mutate({ workoutId: workout.id, restEndsAt: null, notificationId: null });
  };

  // ----- Series -----
  const onComplete = useCallback(
    (we: WorkoutExercise) => (setId: string, values: SetPatch) => {
      hapticSetDone();
      actions.completeSet.mutate({ setId, values });
      void startRest(we.restSeconds, we.exerciseNameSnapshot);
    },
    [actions.completeSet, startRest],
  );

  const onUpdate = useCallback((setId: string, patch: SetPatch) => actions.updateSet.mutate({ setId, patch }), [actions.updateSet]);
  const onUncomplete = useCallback((setId: string) => actions.uncompleteSet.mutate(setId), [actions.uncompleteSet]);

  const onSetMenu = useCallback(
    (set: WorkoutSet, number: number) =>
      showActionSheet(`Serie ${set.setType === 'warmup' ? 'de calentamiento' : number}`, [
        set.setType === 'normal'
          ? { label: 'Marcar como calentamiento (W)', onPress: () => actions.updateSet.mutate({ setId: set.id, patch: { setType: 'warmup' } }) }
          : { label: 'Marcar como serie normal', onPress: () => actions.updateSet.mutate({ setId: set.id, patch: { setType: 'normal' } }) },
        { label: 'Borrar serie', destructive: true, onPress: () => actions.removeSet.mutate(set.id) },
      ]),
    [actions.updateSet, actions.removeSet],
  );

  // ----- Terminar / descartar -----
  const completedSets = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completedAt !== null).length, 0);

  const doDiscard = async () => {
    await cancelRestNotification(workout.restNotificationId);
    discard.mutate(workout.id, { onSuccess: () => router.back() });
  };

  const askDiscard = () =>
    Alert.alert('¿Descartar el entreno?', 'Se borrará todo lo que has registrado en este entreno.', [
      { text: 'Seguir entrenando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => void doDiscard() },
    ]);

  const askFinish = () => {
    if (completedSets === 0) {
      Alert.alert('No has completado ninguna serie', 'Marca al menos una serie para guardar el entreno.', [
        { text: 'Seguir entrenando', style: 'cancel' },
        { text: 'Descartar entreno', style: 'destructive', onPress: () => void doDiscard() },
      ]);
      return;
    }
    Alert.alert('¿Terminar el entreno?', 'Las series sin marcar no se guardarán.', [
      { text: 'Seguir', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: () => {
          void (async () => {
            await cancelRestNotification(workout.restNotificationId);
            finish.mutate(workout.id, {
              onSuccess: () => router.replace({ pathname: '/resumen-entreno/[id]', params: { id: workout.id } }),
            });
          })();
        },
      },
    ]);
  };

  const restTotalSec =
    restUi.endsAt === workout.restEndsAt && restUi.totalMs ? restUi.totalMs / 1000 : Math.max(remaining, 1);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Minimizar entreno" onPress={() => router.back()} style={styles.iconButton}>
          <Icon name="chevron-down" size={28} />
        </Pressable>
        <View style={styles.headerTexts}>
          <AppText variant="headline" numberOfLines={1} align="center">
            {workout.name}
          </AppText>
          <AppText variant="number" color="textSecondary" align="center" accessibilityLabel="Tiempo de entreno">
            {formatDuration((nowMs - workout.startedAt) / 1000)}
          </AppText>
        </View>
        <Button title="Terminar" compact onPress={askFinish} loading={finish.isPending} />
      </View>

      {remaining > 0 ? (
        <Animated.View entering={FadeInUp.duration(200)} exiting={FadeOutUp.duration(200)} style={styles.restBar} accessibilityLiveRegion="polite">
          <View style={styles.restTop}>
            <View>
              <AppText variant="caption" color="textSecondary">
                Descanso
              </AppText>
              <AppText variant="numberXL" accessibilityLabel={`Quedan ${remaining} segundos de descanso`}>
                {formatDuration(remaining)}
              </AppText>
            </View>
            <View style={styles.restButtons}>
              <Button title="−15 s" variant="secondary" compact onPress={() => void adjustRest(-15)} accessibilityHint="Quita 15 segundos al descanso" />
              <Button title="+15 s" variant="secondary" compact onPress={() => void adjustRest(15)} accessibilityHint="Añade 15 segundos al descanso" />
              <Button title="Saltar" variant="ghost" compact onPress={() => void skipRest()} />
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, (remaining / restTotalSec) * 100)}%` }]} />
          </View>
          {notifDenied ? (
            <AppText variant="caption" color="warmup">
              Notificaciones desactivadas: solo te avisaré con la app abierta. Actívalas en Ajustes → Notificaciones.
            </AppText>
          ) : null}
        </Animated.View>
      ) : null}

      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={spacing.xl}>
        {workout.exercises.length === 0 ? (
          <EmptyState icon="add-circle-outline" title="Entreno vacío" message="Añade el primer ejercicio para empezar." />
        ) : null}

        {workout.exercises.map((we) => (
          <ExerciseBlock
            key={we.id}
            we={we}
            unit={unit}
            previous={previous.data?.[we.exerciseId] ?? []}
            bests={bests.data?.[we.exerciseId] ?? EMPTY_BESTS}
            onComplete={onComplete(we)}
            onUpdate={onUpdate}
            onUncomplete={onUncomplete}
            onSetMenu={onSetMenu}
            onAddSet={() => actions.addSet.mutate(we.id)}
            onRest={(seconds) => actions.setExerciseRest.mutate({ workoutExerciseId: we.id, seconds })}
            onRemove={() =>
              Alert.alert('¿Quitar el ejercicio?', `Se borrarán sus series de este entreno.`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Quitar', style: 'destructive', onPress: () => actions.removeExercise.mutate(we.id) },
              ])
            }
          />
        ))}

        <Button
          title="Añadir ejercicio"
          icon="add"
          variant="secondary"
          onPress={() => router.push({ pathname: '/elegir-ejercicio', params: { target: 'workout' } })}
        />
        <Button title="Descartar entreno" variant="danger" onPress={askDiscard} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

type BlockProps = {
  we: WorkoutExercise;
  unit: WeightUnit;
  previous: readonly WorkoutSet[];
  bests: ExerciseBests;
  onComplete: (setId: string, values: SetPatch) => void;
  onUpdate: (setId: string, patch: SetPatch) => void;
  onUncomplete: (setId: string) => void;
  onSetMenu: (set: WorkoutSet, number: number) => void;
  onAddSet: () => void;
  onRest: (seconds: number) => void;
  onRemove: () => void;
};

function ExerciseBlock({ we, unit, previous, bests, onComplete, onUpdate, onUncomplete, onSetMenu, onAddSet, onRest, onRemove }: BlockProps) {
  const matched = matchPreviousSets(we.sets, previous);
  const records = recordsInSession(we.sets, bests);
  const numbers = setNumbers(we.sets);

  const openMenu = () =>
    showActionSheet(we.exerciseNameSnapshot, [
      { label: `Descanso: ${formatDuration(we.restSeconds)}`, onPress: chooseRest },
      { label: 'Quitar ejercicio', destructive: true, onPress: onRemove },
    ]);

  const chooseRest = () =>
    showActionSheet('Descanso entre series', REST_CHOICES.map((s) => ({ label: formatDuration(s), selected: we.restSeconds === s, onPress: () => onRest(s) })));

  return (
    <Card style={styles.block} padded={false}>
      <View style={styles.blockHeader}>
        <AppText variant="headline" style={styles.flex}>
          {we.exerciseNameSnapshot}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${we.exerciseNameSnapshot}`} onPress={openMenu} style={styles.iconButton}>
          <Icon name="ellipsis-horizontal" color="textSecondary" />
        </Pressable>
      </View>
      <View style={styles.restLabel}>
        <RestLabel seconds={we.restSeconds} onPress={chooseRest} />
      </View>
      <SetHeader tracking={we.trackingType} unit={unit} />
      {we.sets.map((s, i) => {
        return (
          <SetRow
            key={s.id}
            set={s}
            number={numbers[i] ?? 0}
            tracking={we.trackingType}
            unit={unit}
            previous={matched[i] ?? null}
            records={records[i] ?? []}
            onUpdate={onUpdate}
            onComplete={onComplete}
            onUncomplete={onUncomplete}
            onMenu={onSetMenu}
          />
        );
      })}
      <Button title="Añadir serie" icon="add" variant="ghost" compact onPress={onAddSet} />
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTexts: { flex: 1 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  restBar: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  restTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  restButtons: { flexDirection: 'row', gap: spacing.xxs },
  progressTrack: { height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: radii.pill },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  block: { paddingVertical: spacing.sm, gap: spacing.xxs },
  blockHeader: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingRight: spacing.xs },
  restLabel: { paddingHorizontal: spacing.md },
});
