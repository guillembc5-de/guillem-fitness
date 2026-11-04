import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Icon, LoadingState, Screen, TextField, showActionSheet, spacing } from '@/design';
import { formatDuration } from '@/domain/format';
import { setNumbers } from '@/domain/workout';
import { useProfile } from '@/features/profile/queries';
import { RestLabel, REST_CHOICES, SetBadge, SetCell } from '@/features/workout/components';
import { weightColumnLabel } from '@/features/workout/labels';
import { useSaveRoutine } from '@/features/workout/queries';
import { getRepositories } from '@/data/repositories';
import { toRoutineDraft, useRoutineDraft, type DraftExercise } from '@/features/workout/routineDraftStore';

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const profile = useProfile();
  const unit = profile.data?.weightUnit ?? 'kg';
  const draft = useRoutineDraft();
  const save = useSaveRoutine();
  const [loaded, setLoaded] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const routine = id ? await getRepositories().routines.get(id) : null;
      if (cancelled) return;
      useRoutineDraft.getState().load(routine, unit);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, unit]);

  usePreventRemove(draft.dirty && !saving, ({ data }) => {
    Alert.alert('¿Descartar cambios?', 'Los cambios en la rutina no se guardarán.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  const onSave = () => {
    if (draft.name.trim() === '') {
      setNameError('Ponle un nombre a la rutina');
      return;
    }
    setSaving(true);
    save.mutate(
      { id: draft.routineId, draft: toRoutineDraft(draft.name, draft.exercises, unit) },
      {
        onSuccess: () => {
          useRoutineDraft.setState({ dirty: false });
          // Espera a que se desactive el aviso de «descartar cambios» antes de cerrar.
          setTimeout(() => router.back(), 0);
        },
        onError: () => setSaving(false),
      },
    );
  };

  if (!loaded) return <LoadingState />;

  return (
    <Screen
      edges={[]}
      footer={<Button title={draft.routineId ? 'Guardar cambios' : 'Crear rutina'} onPress={onSave} loading={save.isPending} />}
    >
      <TextField
        label="Nombre"
        value={draft.name}
        onChangeText={(t) => {
          setNameError(undefined);
          draft.setName(t);
        }}
        placeholder="Por ejemplo: lower 2"
        error={nameError}
        autoCapitalize="none"
      />

      {draft.exercises.length === 0 ? (
        <AppText variant="body" color="textSecondary" align="center" style={styles.empty}>
          Añade los ejercicios de la rutina y sus series objetivo.
        </AppText>
      ) : null}

      {draft.exercises.map((e, i) => (
        <ExerciseEditorCard key={e.key} exercise={e} index={i} total={draft.exercises.length} unitLabel={unit.toUpperCase()} />
      ))}

      <Button
        title="Añadir ejercicios"
        icon="add"
        variant="secondary"
        onPress={() => router.push({ pathname: '/elegir-ejercicio', params: { target: 'routine' } })}
      />
      {save.isError ? (
        <AppText variant="caption" color="accentText" accessibilityRole="alert">
          No se pudo guardar: {save.error.message}
        </AppText>
      ) : null}
    </Screen>
  );
}

function ExerciseEditorCard({ exercise: e, index, total, unitLabel }: { exercise: DraftExercise; index: number; total: number; unitLabel: string }) {
  const { removeExercise, moveExercise, setRest, addSet, removeSet, updateSet } = useRoutineDraft.getState();
  const weightLabel = weightColumnLabel(e.trackingType);
  const isDuration = e.trackingType === 'duration';

  const openMenu = () =>
    showActionSheet(e.name, [
      ...(index > 0 ? [{ label: 'Subir', onPress: () => moveExercise(e.key, -1) }] : []),
      ...(index < total - 1 ? [{ label: 'Bajar', onPress: () => moveExercise(e.key, 1) }] : []),
      { label: 'Quitar de la rutina', destructive: true, onPress: () => removeExercise(e.key) },
    ]);

  const chooseRest = () =>
    showActionSheet('Descanso entre series', [
      { label: 'Por defecto', selected: e.restSeconds === null, onPress: () => setRest(e.key, null) },
      ...REST_CHOICES.map((s) => ({ label: formatDuration(s), selected: e.restSeconds === s, onPress: () => setRest(e.key, s) })),
    ]);

  const numbers = setNumbers(e.sets);

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <AppText variant="headline" style={styles.flex}>
          {e.name}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${e.name}`} onPress={openMenu} style={styles.iconButton}>
          <Icon name="ellipsis-horizontal" color="textSecondary" />
        </Pressable>
      </View>
      <RestLabel seconds={e.restSeconds} onPress={chooseRest} />

      <View style={styles.headRow}>
        <AppText variant="overline" color="textSecondary" style={styles.colSet}>
          Serie
        </AppText>
        {weightLabel ? (
          <AppText variant="overline" color="textSecondary" align="center" style={styles.flex}>
            {weightLabel === 'KG' ? unitLabel : `+${unitLabel}`}
          </AppText>
        ) : null}
        <AppText variant="overline" color="textSecondary" align="center" style={styles.flex}>
          {isDuration ? 'Seg' : 'Reps'}
        </AppText>
        <View style={styles.colAction} />
      </View>

      {e.sets.map((s, si) => {
        const number = numbers[si] ?? 0;
        return (
          <View key={s.key} style={styles.setRow}>
            <View style={styles.colSet}>
              <SetBadge
                setType={s.setType}
                number={number}
                onPress={() => updateSet(e.key, s.key, { setType: s.setType === 'normal' ? 'warmup' : 'normal' })}
              />
            </View>
            {weightLabel ? (
              <SetCell
                accessibilityLabel={`Peso objetivo serie ${number}`}
                value={s.weight}
                onChangeText={(weight) => updateSet(e.key, s.key, { weight })}
                maxDecimals={2}
                placeholder="–"
              />
            ) : null}
            <SetCell
              accessibilityLabel={isDuration ? `Segundos objetivo serie ${number}` : `Repeticiones objetivo serie ${number}`}
              value={isDuration ? s.duration : s.reps}
              onChangeText={(t) => updateSet(e.key, s.key, isDuration ? { duration: t } : { reps: t })}
              maxDecimals={0}
              placeholder="–"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Borrar serie" onPress={() => removeSet(e.key, s.key)} style={styles.colAction}>
              <Icon name="close" size={20} color="textSecondary" />
            </Pressable>
          </View>
        );
      })}
      <Button title="Añadir serie" icon="add" variant="ghost" compact onPress={() => addSet(e.key)} />
      <AppText variant="caption" color="textTertiary">
        Toca el número de serie para marcarla como calentamiento (W).
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { paddingVertical: spacing.lg },
  card: { gap: spacing.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  colSet: { width: 44, alignItems: 'center' },
  colAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
