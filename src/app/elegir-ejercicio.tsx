import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, colors, spacing } from '@/design';
import type { Exercise } from '@/domain/workoutTypes';
import { useProfile } from '@/features/profile/queries';
import { ExerciseBrowser } from '@/features/workout/ExerciseBrowser';
import { useActiveWorkout, useWorkoutActions } from '@/features/workout/queries';
import { useRoutineDraft } from '@/features/workout/routineDraftStore';

type Params = {
  /**
   * workout: añadir al entreno (activo o el indicado en workoutId)
   * routine: añadir a la rutina que se edita
   * replace: sustituir el ejercicio weId del entreno
   * routine-replace: sustituir el ejercicio que se está cambiando en la rutina
   */
  target?: 'workout' | 'routine' | 'replace' | 'routine-replace';
  workoutId?: string;
  weId?: string;
};

/** Selector de ejercicios: varios para añadir, o uno para sustituir. */
export default function PickExerciseScreen() {
  const { target = 'routine', workoutId: workoutParam, weId } = useLocalSearchParams<Params>();
  const [selected, setSelected] = useState<Exercise[]>([]);
  const active = useActiveWorkout();
  const profile = useProfile();
  const { addExercise, replaceExercise } = useWorkoutActions();
  const [busy, setBusy] = useState(false);
  const replacing = target === 'replace' || target === 'routine-replace';

  const selectedIds = new Set(selected.map((e) => e.id));

  const onPress = (e: Exercise) => {
    if (target === 'replace' && weId) {
      replaceExercise.mutate({ workoutExerciseId: weId, exerciseId: e.id }, { onSuccess: () => router.back() });
      return;
    }
    if (target === 'routine-replace') {
      const key = useRoutineDraft.getState().replacingKey;
      if (key) useRoutineDraft.getState().replaceExercise(key, e);
      router.back();
      return;
    }
    setSelected((list) => (list.some((x) => x.id === e.id) ? list.filter((x) => x.id !== e.id) : [...list, e]));
  };

  const confirm = async () => {
    if (target === 'workout') {
      const workoutId = workoutParam ?? active.data?.id;
      if (!workoutId) return;
      setBusy(true);
      for (const e of selected) {
        await addExercise.mutateAsync({ workoutId, exerciseId: e.id, restSeconds: profile.data?.defaultRestSeconds ?? 150 });
      }
      setBusy(false);
    } else {
      useRoutineDraft.getState().addExercises(selected);
    }
    router.back();
  };

  const error = addExercise.error ?? replaceExercise.error;

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.top}>
        {replacing ? (
          <AppText variant="caption" color="textSecondary" align="center">
            Elige el ejercicio que lo sustituye
          </AppText>
        ) : null}
      </View>
      <ExerciseBrowser
        selectedIds={selectedIds}
        onPressExercise={onPress}
        onCreate={(name) => router.push({ pathname: '/ejercicio-editor', params: { name } })}
      />
      {!replacing || error ? (
        <View style={styles.footer}>
          {error ? (
            <AppText variant="caption" color="accentText">
              No se pudo guardar: {error.message}
            </AppText>
          ) : null}
          {!replacing ? (
            <Button
              title={selected.length === 0 ? 'Elige uno o varios' : `Añadir ${selected.length} ${selected.length === 1 ? 'ejercicio' : 'ejercicios'}`}
              disabled={selected.length === 0}
              loading={busy}
              onPress={() => void confirm()}
            />
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { minHeight: spacing.xs, paddingTop: spacing.xs },
  footer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
