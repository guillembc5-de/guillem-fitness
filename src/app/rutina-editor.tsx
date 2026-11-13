import { router, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Card, Icon, LoadingState, Screen, TextField, colors, radii, showActionSheet, showReorderSheet, spacing } from '@/design';
import { SET_TYPES } from '@/domain/enums';
import { formatDuration } from '@/domain/format';
import { supersetLetters } from '@/domain/supersets';
import { setNumbers } from '@/domain/workout';
import { useProfile } from '@/features/profile/queries';
import { RestLabel, REST_CHOICES, SetBadge, SetCell } from '@/features/workout/components';
import { SET_TYPE_LABELS, SET_TYPE_LETTERS, weightColumnLabel } from '@/features/workout/labels';
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

  const letters = supersetLetters(draft.exercises.map((e) => ({ id: e.key, supersetId: e.supersetId })));

  return (
    <Screen edges={[]} footer={<Button title={draft.routineId ? 'Guardar cambios' : 'Crear rutina'} onPress={onSave} loading={save.isPending} />}>
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
        <ExerciseEditorCard
          key={e.key}
          exercise={e}
          index={i}
          all={draft.exercises}
          unitLabel={unit.toUpperCase()}
          supersetLetter={e.supersetId ? (letters.get(e.supersetId) ?? null) : null}
        />
      ))}

      <Button title="Añadir ejercicios" icon="add" variant="secondary" onPress={() => router.push({ pathname: '/elegir-ejercicio', params: { target: 'routine' } })} />
      {save.isError ? (
        <AppText variant="caption" color="accentText" accessibilityRole="alert">
          No se pudo guardar: {save.error.message}
        </AppText>
      ) : null}
    </Screen>
  );
}

type CardProps = {
  exercise: DraftExercise;
  index: number;
  all: readonly DraftExercise[];
  unitLabel: string;
  supersetLetter: string | null;
};

function ExerciseEditorCard({ exercise: e, all, unitLabel, supersetLetter }: CardProps) {
  const store = useRoutineDraft.getState();
  const weightLabel = weightColumnLabel(e.trackingType);
  const isDuration = e.trackingType === 'duration';

  const chooseSupersetPartner = () =>
    showActionSheet(
      'Superserie con…',
      all.filter((o) => o.key !== e.key).map((o) => ({ label: o.name, onPress: () => store.joinSuperset(e.key, o.key) })),
    );

  const reorder = () =>
    showReorderSheet(
      'Reordenar ejercicios',
      all.map((o) => ({ key: o.key, label: o.name, caption: `${o.sets.length} ${o.sets.length === 1 ? 'serie' : 'series'}` })),
      (keys) => store.reorderExercises(keys),
    );

  // Mismo orden que el menú de Hevy.
  const openMenu = () =>
    showActionSheet(null, [
      { label: 'Reordenar ejercicios', icon: 'swap-vertical', disabled: all.length < 2, onPress: reorder },
      {
        label: 'Reemplazar ejercicio',
        icon: 'sync',
        onPress: () => {
          store.startReplacing(e.key);
          router.push({ pathname: '/elegir-ejercicio', params: { target: 'routine-replace' } });
        },
      },
      e.supersetId
        ? { label: 'Quitar de la superserie', icon: 'remove', onPress: () => store.leaveSuperset(e.key) }
        : { label: 'Agregar a superserie', icon: 'add', disabled: all.length < 2, onPress: chooseSupersetPartner },
      { label: 'Eliminar ejercicio', icon: 'close', destructive: true, onPress: () => store.removeExercise(e.key) },
    ]);

  const chooseRest = () =>
    showActionSheet('Descanso entre series', [
      { label: 'Por defecto', selected: e.restSeconds === null, onPress: () => store.setRest(e.key, null) },
      ...REST_CHOICES.map((s) => ({ label: formatDuration(s), selected: e.restSeconds === s, onPress: () => store.setRest(e.key, s) })),
    ]);

  const chooseSetType = (setKey: string, current: (typeof SET_TYPES)[number]) =>
    showActionSheet('Tipo de serie', [
      ...SET_TYPES.map((t) => ({
        label: `${SET_TYPE_LABELS[t]}${SET_TYPE_LETTERS[t] ? ` (${SET_TYPE_LETTERS[t]})` : ''}`,
        selected: current === t,
        onPress: () => store.updateSet(e.key, setKey, { setType: t }),
      })),
      { label: 'Borrar serie', destructive: true, onPress: () => store.removeSet(e.key, setKey) },
    ]);

  const numbers = setNumbers(e.sets);

  return (
    <Card style={[styles.card, supersetLetter ? styles.superset : null]}>
      <View style={styles.cardHeader}>
        <View style={styles.flex}>
          {supersetLetter ? (
            <AppText variant="overline" color="info">
              Superserie {supersetLetter}
            </AppText>
          ) : null}
          <AppText variant="headline">{e.name}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${e.name}`} onPress={openMenu} style={styles.iconButton}>
          <Icon name="ellipsis-horizontal" color="textSecondary" />
        </Pressable>
      </View>
      <TextInput
        value={e.notes}
        onChangeText={(t) => store.setNotes(e.key, t)}
        placeholder="Nota para este ejercicio (se verá al entrenar)"
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={`Nota de ${e.name}`}
        multiline
        maxFontSizeMultiplier={1.4}
        style={styles.note}
      />
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
              <SetBadge setType={s.setType} number={number} onPress={() => chooseSetType(s.key, s.setType)} />
            </View>
            {weightLabel ? (
              <SetCell
                accessibilityLabel={`Peso objetivo serie ${number}`}
                value={s.weight}
                onChangeText={(weight) => store.updateSet(e.key, s.key, { weight })}
                maxDecimals={2}
                placeholder="–"
              />
            ) : null}
            <SetCell
              accessibilityLabel={isDuration ? `Segundos objetivo serie ${number}` : `Repeticiones objetivo serie ${number}`}
              value={isDuration ? s.duration : s.reps}
              onChangeText={(t) => store.updateSet(e.key, s.key, isDuration ? { duration: t } : { reps: t })}
              maxDecimals={0}
              placeholder="–"
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Borrar serie" onPress={() => store.removeSet(e.key, s.key)} style={styles.colAction}>
              <Icon name="close" size={20} color="textSecondary" />
            </Pressable>
          </View>
        );
      })}
      <Button title="Añadir serie" icon="add" variant="ghost" compact onPress={() => store.addSet(e.key)} />
      <AppText variant="caption" color="textTertiary">
        Toca el número de serie para cambiar su tipo: calentamiento (W), drop set (D) o al fallo (F).
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  empty: { paddingVertical: spacing.lg },
  card: { gap: spacing.xs },
  superset: { borderLeftWidth: 4, borderLeftColor: colors.info },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  note: {
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontSize: 15,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  colSet: { width: 44, alignItems: 'center' },
  colAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
