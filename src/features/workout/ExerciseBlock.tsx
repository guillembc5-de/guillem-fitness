import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText, Button, Card, Icon, colors, radii, showActionSheet, showReorderSheet, spacing } from '@/design';
import { SET_TYPES, type SetType } from '@/domain/enums';
import { formatDuration, formatNumber } from '@/domain/format';
import { matchPreviousSets, recordsInSession, setNumbers, type ExerciseBests } from '@/domain/workout';
import { warmupSets } from '@/domain/warmup';
import type { WeightUnit } from '@/domain/types';
import type { SetPatch, WorkoutExercise, WorkoutSet } from '@/domain/workoutTypes';

import { RestLabel, REST_CHOICES, RPE_CHOICES, RPE_HINTS } from './components';
import { SET_TYPE_LABELS, SET_TYPE_LETTERS } from './labels';
import type { useWorkoutActions } from './queries';
import { SetHeader, SetRow } from './SetRow';
import { useWorkoutSettings } from './settings';

type Actions = ReturnType<typeof useWorkoutActions>;

type Props = {
  we: WorkoutExercise;
  /** Todos los ejercicios del entreno (para superseries y mover). */
  siblings: readonly WorkoutExercise[];
  index: number;
  unit: WeightUnit;
  previous: readonly WorkoutSet[];
  bests: ExerciseBests;
  supersetLetter: string | null;
  /** En vivo hay descansos; editando un entreno pasado, no. */
  live: boolean;
  actions: Actions;
  onComplete: (we: WorkoutExercise, setId: string, values: SetPatch) => void;
};

const WEIGHTED = new Set(['weight_reps', 'added_weight_reps']);

/** Un ejercicio del entreno con sus series, notas y su menú «⋯». */
function ExerciseBlockImpl({ we, siblings, unit, previous, bests, supersetLetter, live, actions, onComplete }: Props) {
  const showRpe = useWorkoutSettings((s) => s.rpe);
  const barKg = useWorkoutSettings((s) => s.barKg);
  const matched = matchPreviousSets(we.sets, previous);
  const records = recordsInSession(we.sets, bests);
  const numbers = setNumbers(we.sets);
  const firstWorking = we.sets.find((s) => s.setType !== 'warmup' && (s.weightKg ?? 0) > 0);

  const chooseRest = () =>
    showActionSheet(
      'Descanso entre series',
      REST_CHOICES.map((s) => ({ label: formatDuration(s), selected: we.restSeconds === s, onPress: () => actions.setExerciseRest.mutate({ workoutExerciseId: we.id, seconds: s }) })),
    );

  const chooseSupersetPartner = () => {
    const others = siblings.filter((s) => s.id !== we.id);
    showActionSheet(
      'Superserie con…',
      others.map((o) => ({ label: o.exerciseNameSnapshot, onPress: () => actions.joinSuperset.mutate({ workoutExerciseId: we.id, withId: o.id }) })),
    );
  };

  const addWarmups = () => {
    if (!firstWorking?.weightKg) return;
    const sets = warmupSets(firstWorking.weightKg, we.equipment === 'barbell' ? barKg : 0);
    if (sets.length === 0) {
      Alert.alert('Sin calentamiento', 'Con este peso no hace falta calentar con series más ligeras.');
      return;
    }
    actions.addWarmups.mutate({ workoutExerciseId: we.id, sets });
  };

  const reorder = () =>
    showReorderSheet(
      'Reordenar ejercicios',
      siblings.map((s) => ({ key: s.id, label: s.exerciseNameSnapshot, caption: `${s.sets.length} ${s.sets.length === 1 ? 'serie' : 'series'}` })),
      (orderedIds) => actions.reorderExercises.mutate({ workoutId: we.workoutId, orderedIds }),
    );

  // Mismo orden que el menú de Hevy; lo propio de esta app va antes de «Eliminar».
  const openMenu = () =>
    showActionSheet(null, [
      { label: 'Reordenar ejercicios', icon: 'swap-vertical', disabled: siblings.length < 2, onPress: reorder },
      { label: 'Reemplazar ejercicio', icon: 'sync', onPress: () => router.push({ pathname: '/elegir-ejercicio', params: { target: 'replace', weId: we.id } }) },
      we.supersetId
        ? { label: 'Quitar de la superserie', icon: 'remove', onPress: () => actions.leaveSuperset.mutate(we.id) }
        : { label: 'Agregar a superserie', icon: 'add', disabled: siblings.length < 2, onPress: chooseSupersetPartner },
      ...(WEIGHTED.has(we.trackingType) && firstWorking ? [{ label: 'Añadir series de calentamiento', icon: 'flame-outline' as const, onPress: addWarmups }] : []),
      ...(we.equipment === 'barbell'
        ? [
            {
              label: 'Calculadora de discos',
              icon: 'barbell-outline' as const,
              onPress: () => router.push({ pathname: '/discos', params: { kg: String(firstWorking?.weightKg ?? '') } }),
            },
          ]
        : []),
      ...(live ? [{ label: `Descanso: ${formatDuration(we.restSeconds)}`, icon: 'timer-outline' as const, onPress: chooseRest }] : []),
      {
        label: 'Eliminar ejercicio',
        icon: 'close',
        destructive: true,
        onPress: () =>
          Alert.alert('¿Eliminar el ejercicio?', 'Se borrarán sus series de este entreno.', [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => actions.removeExercise.mutate(we.id) },
          ]),
      },
    ]);

  const onSetMenu = (set: WorkoutSet, number: number) =>
    showActionSheet(`Serie ${SET_TYPE_LETTERS[set.setType] ?? number}`, [
      ...SET_TYPES.map((t: SetType) => ({
        label: `${SET_TYPE_LABELS[t]}${SET_TYPE_LETTERS[t] ? ` (${SET_TYPE_LETTERS[t]})` : ''}`,
        selected: set.setType === t,
        onPress: () => actions.updateSet.mutate({ setId: set.id, patch: { setType: t } }),
      })),
      { label: 'Borrar serie', destructive: true, onPress: () => actions.removeSet.mutate(set.id) },
    ]);

  const onRpe = (set: WorkoutSet) =>
    showActionSheet('RPE: esfuerzo de la serie', [
      ...RPE_CHOICES.map((r) => ({
        label: `${formatNumber(r, { maxDecimals: 1 })}${RPE_HINTS[r] ? ` · ${RPE_HINTS[r]}` : ''}`,
        selected: set.rpe === r,
        onPress: () => actions.updateSet.mutate({ setId: set.id, patch: { rpe: r } }),
      })),
      ...(set.rpe !== null ? [{ label: 'Quitar RPE', onPress: () => actions.updateSet.mutate({ setId: set.id, patch: { rpe: null } }) }] : []),
    ]);

  return (
    <Card style={[styles.block, supersetLetter ? styles.superset : null]} padded={false}>
      <View style={styles.header}>
        <View style={styles.flex}>
          {supersetLetter ? (
            <AppText variant="overline" color="info">
              Superserie {supersetLetter}
            </AppText>
          ) : null}
          <AppText variant="headline">{we.exerciseNameSnapshot}</AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Opciones de ${we.exerciseNameSnapshot}`} onPress={openMenu} style={styles.iconButton}>
          <Icon name="ellipsis-vertical" color="textSecondary" />
        </Pressable>
      </View>

      {we.exerciseNote ? (
        <View style={styles.pinned}>
          <Icon name="pin" size={16} color="warmup" />
          <AppText variant="caption" color="textSecondary" style={styles.flex}>
            {we.exerciseNote}
          </AppText>
        </View>
      ) : null}
      <NoteField key={we.id} value={we.notes} onSave={(notes) => actions.setNotes.mutate({ workoutExerciseId: we.id, notes })} />

      {live ? (
        <View style={styles.padded}>
          <RestLabel seconds={we.restSeconds} onPress={chooseRest} />
        </View>
      ) : null}
      <SetHeader tracking={we.trackingType} unit={unit} showRpe={showRpe} />
      {we.sets.map((s, i) => (
        <SetRow
          key={s.id}
          set={s}
          number={numbers[i] ?? 0}
          tracking={we.trackingType}
          unit={unit}
          previous={matched[i] ?? null}
          records={records[i] ?? []}
          showRpe={showRpe}
          onUpdate={(setId, patch) => actions.updateSet.mutate({ setId, patch })}
          onComplete={(setId, values) => onComplete(we, setId, values)}
          onUncomplete={(setId) => actions.uncompleteSet.mutate(setId)}
          onMenu={onSetMenu}
          onRpe={onRpe}
        />
      ))}
      <Button title="Añadir serie" icon="add" variant="ghost" compact onPress={() => actions.addSet.mutate(we.id)} />
    </Card>
  );
}

export const ExerciseBlock = memo(ExerciseBlockImpl);

/** Nota del ejercicio en este entreno: se guarda al salir del campo. */
function NoteField({ value, onSave }: { value: string | null; onSave: (notes: string | null) => void }) {
  const [text, setText] = useState(value ?? '');
  return (
    <TextInput
      value={text}
      onChangeText={setText}
      onEndEditing={() => {
        if (text.trim() !== (value ?? '')) onSave(text.trim() || null);
      }}
      placeholder="Añadir nota"
      placeholderTextColor={colors.textTertiary}
      accessibilityLabel="Nota del ejercicio"
      multiline
      maxFontSizeMultiplier={1.4}
      style={styles.note}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { paddingVertical: spacing.sm, gap: spacing.xxs },
  superset: { borderLeftWidth: 4, borderLeftColor: colors.info },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.md, paddingRight: spacing.xs },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  padded: { paddingHorizontal: spacing.md },
  pinned: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xxs, paddingHorizontal: spacing.md },
  note: {
    marginHorizontal: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
    color: colors.text,
    fontSize: 15,
  },
});
