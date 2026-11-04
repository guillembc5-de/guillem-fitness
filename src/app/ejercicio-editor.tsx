import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, LoadingState, Screen, SectionHeader, TextField, showActionSheet, spacing } from '@/design';
import { EQUIPMENT, MUSCLE_GROUPS, TRACKING_TYPES, type Equipment, type MuscleGroup, type TrackingType } from '@/domain/enums';
import { formatDuration } from '@/domain/format';
import { REST_CHOICES } from '@/features/workout/components';
import { EQUIPMENT_LABELS, MUSCLE_LABELS, TRACKING_LABELS } from '@/features/workout/labels';
import { useCreateExercise, useExercise, useUpdateExercise } from '@/features/workout/queries';

/** Crear un ejercicio propio o editar uno propio existente. */
export default function ExerciseEditorScreen() {
  const { id, name: suggested } = useLocalSearchParams<{ id?: string; name?: string }>();
  const existing = useExercise(id ?? '');
  if (id && existing.isPending) return <LoadingState />;
  return <ExerciseForm id={id ?? null} initial={existing.data ?? null} suggestedName={suggested ?? ''} />;
}

type Initial = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  trackingType: TrackingType;
  defaultRestSeconds: number | null;
  notes: string | null;
} | null;

function ExerciseForm({ id, initial, suggestedName }: { id: string | null; initial: Initial; suggestedName: string }) {
  const [name, setNameRaw] = useState(initial?.name ?? suggestedName);
  const [muscle, setMuscleRaw] = useState<MuscleGroup | null>(initial?.muscleGroup ?? null);
  const [equipment, setEquipmentRaw] = useState<Equipment | null>(initial?.equipment ?? null);
  const [tracking, setTracking] = useState<TrackingType>(initial?.trackingType ?? 'weight_reps');
  const [rest, setRest] = useState<number | null>(initial?.defaultRestSeconds ?? null);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateExercise();
  const update = useUpdateExercise();

  // Al corregir un campo desaparece el aviso de error.
  const setName = (v: string) => {
    setError(null);
    setNameRaw(v);
  };
  const setMuscle = (v: MuscleGroup) => {
    setError(null);
    setMuscleRaw(v);
  };
  const setEquipment = (v: Equipment) => {
    setError(null);
    setEquipmentRaw(v);
  };

  const onSave = () => {
    if (name.trim() === '') return setError('Ponle un nombre');
    if (!muscle) return setError('Elige el grupo muscular');
    if (!equipment) return setError('Elige el material');
    const input = { name, muscleGroup: muscle, equipment, trackingType: tracking, defaultRestSeconds: rest, notes: initial?.notes ?? null };
    if (id) update.mutate({ id, input }, { onSuccess: () => router.back() });
    else create.mutate(input, { onSuccess: () => router.back() });
  };

  const chooseRest = () =>
    showActionSheet('Descanso por defecto', [
      { label: 'El de tu perfil', selected: rest === null, onPress: () => setRest(null) },
      ...REST_CHOICES.map((s) => ({ label: formatDuration(s), selected: rest === s, onPress: () => setRest(s) })),
    ]);

  const failure = create.error ?? update.error;

  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          {error || failure ? (
            <AppText variant="caption" color="accentText" accessibilityRole="alert">
              {error ?? `No se pudo guardar: ${failure?.message ?? ''}`}
            </AppText>
          ) : null}
          <Button title={id ? 'Guardar cambios' : 'Crear ejercicio'} onPress={onSave} loading={create.isPending || update.isPending} />
        </View>
      }
    >
      <TextField label="Nombre" value={name} onChangeText={setName} placeholder="Por ejemplo: Remo Gironda (polea)" />

      <SectionHeader title="Grupo muscular" />
      <View style={styles.wrap}>
        {MUSCLE_GROUPS.map((m) => (
          <Chip key={m} label={MUSCLE_LABELS[m]} selected={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </View>

      <SectionHeader title="Material" />
      <View style={styles.wrap}>
        {EQUIPMENT.map((eq) => (
          <Chip key={eq} label={EQUIPMENT_LABELS[eq]} selected={equipment === eq} onPress={() => setEquipment(eq)} />
        ))}
      </View>

      <SectionHeader title="Cómo se registra" />
      <View style={styles.wrap}>
        {TRACKING_TYPES.map((t) => (
          <Chip key={t} label={TRACKING_LABELS[t]} selected={tracking === t} onPress={() => setTracking(t)} />
        ))}
      </View>

      <SectionHeader title="Descanso" />
      <Button title={`Descanso por defecto: ${rest ? formatDuration(rest) : 'el de tu perfil'}`} variant="secondary" onPress={chooseRest} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  footer: { gap: spacing.xs },
});
