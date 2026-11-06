import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, Icon, LoadingState, colors, radii, spacing } from '@/design';
import { getRepositories } from '@/data/repositories';
import { formatDuration, formatNumber, toDisplayWeight } from '@/domain/format';
import { nextInSuperset, restAfterSet, supersetLetters } from '@/domain/supersets';
import { EMPTY_BESTS, recordsInSession, totalVolume } from '@/domain/workout';
import { structureChanged } from '@/domain/workoutStats';
import type { WeightUnit } from '@/domain/types';
import type { SetPatch, WorkoutDetail, WorkoutExercise } from '@/domain/workoutTypes';
import { useProfile } from '@/features/profile/queries';
import { ExerciseBlock } from '@/features/workout/ExerciseBlock';
import { useActiveWorkout, useDeleteWorkout, useFinishWorkout, useHistoryBests, usePreviousSets, useSaveWorkoutAsRoutine, useWorkoutActions } from '@/features/workout/queries';
import {
  cancelRestNotification,
  getNotificationPermission,
  hapticRecord,
  hapticRestDone,
  hapticSetDone,
  restRemainingSeconds,
  scheduleRestEnd,
} from '@/features/workout/restTimer';
import { useRestUi } from '@/features/workout/restUiStore';
import { recordKindsText } from '@/features/workout/sessionRecords';
import { useWorkoutSettings } from '@/features/workout/settings';
import { useNow } from '@/lib/useNow';

const KEEP_AWAKE_TAG = 'entreno';

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
  const saveAsRoutine = useSaveWorkoutAsRoutine();
  const settings = useWorkoutSettings();
  const nowMs = useNow(500);
  const [notifDenied, setNotifDenied] = useState(false);
  const [banner, setBanner] = useState<{ text: string; tone: 'record' | 'info' } | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const exerciseIds = useMemo(() => [...new Set(workout.exercises.map((e) => e.exerciseId))], [workout.exercises]);
  const previous = usePreviousSets(workout.id, exerciseIds, settings.previousFrom === 'routine' ? workout.routineId : null);
  const bests = useHistoryBests(workout.id, exerciseIds);
  const letters = useMemo(() => supersetLetters(workout.exercises), [workout.exercises]);

  useEffect(() => {
    void getNotificationPermission().then((p) => setNotifDenied(p === 'denied'));
  }, []);

  // Pantalla encendida mientras entrenas (se puede desactivar en Perfil → Entreno).
  useEffect(() => {
    if (!settings.keepAwake) return undefined;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [settings.keepAwake]);

  useEffect(
    () => () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    },
    [],
  );

  const showBanner = useCallback((text: string, tone: 'record' | 'info') => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner({ text, tone });
    bannerTimer.current = setTimeout(() => setBanner(null), 3500);
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
    (we: WorkoutExercise, setId: string, values: SetPatch) => {
      hapticSetDone();
      actions.completeSet.mutate({ setId, values });

      // Aviso de récord en directo.
      if (settings.prAlerts) {
        const index = we.sets.findIndex((s) => s.id === setId);
        const hypothetical = we.sets.map((s) => (s.id === setId ? { ...s, ...values, completedAt: Date.now() } : s));
        const kinds = recordsInSession(hypothetical, bests.data?.[we.exerciseId] ?? EMPTY_BESTS)[index] ?? [];
        if (kinds.length > 0) {
          hapticRecord();
          showBanner(`¡Récord! ${we.exerciseNameSnapshot}: ${recordKindsText(kinds)}`, 'record');
        }
      }

      // En una superserie no se descansa hasta el último ejercicio del grupo.
      const rest = restAfterSet(we.id, workout.exercises);
      const next = nextInSuperset(we.id, workout.exercises);
      if (rest === null) {
        if (next) showBanner(`Ahora: ${next.exerciseNameSnapshot}`, 'info');
        return;
      }
      void startRest(rest, next?.exerciseNameSnapshot ?? we.exerciseNameSnapshot);
    },
    [actions.completeSet, bests.data, settings.prAlerts, showBanner, startRest, workout.exercises],
  );

  // ----- Terminar / descartar -----
  const allSets = workout.exercises.flatMap((e) => e.sets);
  const completedSets = allSets.filter((s) => s.completedAt !== null).length;
  const volume = toDisplayWeight(totalVolume(allSets), unit);

  const doDiscard = async () => {
    await cancelRestNotification(workout.restNotificationId);
    discard.mutate(workout.id, { onSuccess: () => router.back() });
  };

  const askDiscard = () =>
    Alert.alert('¿Descartar el entreno?', 'Se borrará todo lo que has registrado en este entreno.', [
      { text: 'Seguir entrenando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => void doDiscard() },
    ]);

  const goToSummary = () => router.replace({ pathname: '/resumen-entreno/[id]', params: { id: workout.id } });

  /** Si cambiaste ejercicios o series respecto a la rutina, ofrece guardarlo en ella (como Hevy). */
  const afterFinish = async () => {
    const repos = getRepositories();
    const [routine, done] = await Promise.all([
      workout.routineId ? repos.routines.get(workout.routineId) : Promise.resolve(null),
      repos.workouts.get(workout.id),
    ]);
    const changed =
      routine &&
      done &&
      structureChanged(
        routine.exercises.map((e) => ({ exerciseId: e.exercise.id, supersetId: e.supersetId, sets: e.sets })),
        done.exercises.map((e) => ({ exerciseId: e.exerciseId, supersetId: e.supersetId, sets: e.sets })),
      );
    if (!routine || !changed) {
      goToSummary();
      return;
    }
    Alert.alert(`¿Actualizar «${routine.name}»?`, 'Has cambiado ejercicios o series respecto a la rutina. Puedes guardar este entreno como la nueva versión.', [
      { text: 'Mantener la rutina', style: 'cancel', onPress: goToSummary },
      {
        text: 'Actualizar rutina',
        onPress: () => saveAsRoutine.mutate({ workoutId: workout.id, routineId: routine.id, name: routine.name }, { onSettled: goToSummary }),
      },
    ]);
  };

  const askFinish = () => {
    if (completedSets === 0) {
      Alert.alert('No has completado ninguna serie', 'Marca al menos una serie para guardar el entreno.', [
        { text: 'Seguir entrenando', style: 'cancel' },
        { text: 'Descartar entreno', style: 'destructive', onPress: () => void doDiscard() },
      ]);
      return;
    }
    const pending = allSets.length - completedSets;
    Alert.alert('¿Terminar el entreno?', pending > 0 ? `Hay ${pending} ${pending === 1 ? 'serie sin marcar que no se guardará' : 'series sin marcar que no se guardarán'}.` : 'Se guardará en tu historial.', [
      { text: 'Seguir', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: () => {
          void (async () => {
            await cancelRestNotification(workout.restNotificationId);
            finish.mutate(workout.id, { onSuccess: () => void afterFinish() });
          })();
        },
      },
    ]);
  };

  const restTotalSec = restUi.endsAt === workout.restEndsAt && restUi.totalMs ? restUi.totalMs / 1000 : Math.max(remaining, 1);

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
          <AppText variant="caption" color="textSecondary" align="center" style={styles.tabular} accessibilityLabel="Tiempo, volumen y series">
            {formatDuration((nowMs - workout.startedAt) / 1000)} · {formatNumber(volume)} {unit} · {completedSets} {completedSets === 1 ? 'serie' : 'series'}
          </AppText>
        </View>
        <Button title="Terminar" compact onPress={askFinish} loading={finish.isPending || saveAsRoutine.isPending} />
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

      {banner ? (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.banner, banner.tone === 'record' ? styles.bannerRecord : styles.bannerInfo]}
          accessibilityLiveRegion="assertive"
        >
          <Icon name={banner.tone === 'record' ? 'trophy' : 'swap-vertical'} size={20} color={banner.tone === 'record' ? 'onAccent' : 'info'} />
          <AppText variant="bodyStrong" color={banner.tone === 'record' ? 'onAccent' : 'text'} style={styles.flex}>
            {banner.text}
          </AppText>
        </Animated.View>
      ) : null}

      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" bottomOffset={spacing.xl}>
        {workout.exercises.length === 0 ? <EmptyState icon="add-circle-outline" title="Entreno vacío" message="Añade el primer ejercicio para empezar." /> : null}

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
            live
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
        <Button title="Descartar entreno" variant="danger" onPress={askDiscard} />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  bannerRecord: { backgroundColor: colors.accent },
  bannerInfo: { backgroundColor: colors.infoSoft },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
});
