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

/** Selector de ejercicios (varios a la vez) para una rutina o el entreno activo. */
export default function PickExerciseScreen() {
  const { target } = useLocalSearchParams<{ target?: string }>();
  const [selected, setSelected] = useState<Exercise[]>([]);
  const active = useActiveWorkout();
  const profile = useProfile();
  const { addExercise } = useWorkoutActions();
  const [busy, setBusy] = useState(false);

  const selectedIds = new Set(selected.map((e) => e.id));

  const toggle = (e: Exercise) =>
    setSelected((list) => (list.some((x) => x.id === e.id) ? list.filter((x) => x.id !== e.id) : [...list, e]));

  const confirm = async () => {
    if (target === 'workout') {
      const workoutId = active.data?.id;
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

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.top} />
      <ExerciseBrowser
        selectedIds={selectedIds}
        onPressExercise={toggle}
        onCreate={(name) => router.push({ pathname: '/ejercicio-editor', params: { name } })}
      />
      <View style={styles.footer}>
        {addExercise.isError ? (
          <AppText variant="caption" color="accentText">
            No se pudo añadir: {addExercise.error.message}
          </AppText>
        ) : null}
        <Button
          title={selected.length === 0 ? 'Elige uno o varios' : `Añadir ${selected.length} ${selected.length === 1 ? 'ejercicio' : 'ejercicios'}`}
          disabled={selected.length === 0}
          loading={busy}
          onPress={() => void confirm()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { height: spacing.xs },
  footer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
