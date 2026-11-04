import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, LoadingState, Screen, SectionHeader, spacing } from '@/design';
import {
  ActivityPicker,
  BodyFields,
  GoalFields,
  RestField,
  StepGoalField,
  TargetSummary,
  targetFromDraft,
  UnitField,
} from '@/features/profile/components';
import { ALL_FIELDS, bodyValues, draftFromProfile, draftToInput, validateFields, type DraftErrors, type ProfileDraft } from '@/features/profile/profileForm';
import { useProfile, useSaveProfile } from '@/features/profile/queries';
import type { Profile } from '@/domain/types';

export default function DatosScreen() {
  const profile = useProfile();
  if (!profile.data) return <LoadingState />;
  return <DatosForm profile={profile.data} />;
}

function DatosForm({ profile }: { profile: Profile }) {
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(profile));
  const [errors, setErrors] = useState<DraftErrors>({});
  const save = useSaveProfile();

  const update = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };

  const onSave = () => {
    const found = validateFields(draft, ALL_FIELDS);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    save.mutate(draftToInput(draft, profile.onboardingCompletedAt), { onSuccess: () => router.back() });
  };

  const target = targetFromDraft(draft);
  const body = bodyValues(draft);
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          {hasErrors ? (
            <AppText variant="caption" color="accentText" accessibilityRole="alert">
              Revisa los campos marcados.
            </AppText>
          ) : null}
          {save.isError ? (
            <AppText variant="caption" color="accentText" accessibilityRole="alert">
              No se pudo guardar: {save.error.message}
            </AppText>
          ) : null}
          <Button title="Guardar" onPress={onSave} loading={save.isPending} />
        </View>
      }
    >
      <SectionHeader title="Unidades" />
      <UnitField draft={draft} onChange={update} />

      <SectionHeader title="Cuerpo" />
      <BodyFields draft={draft} onChange={update} errors={errors} />

      <SectionHeader title="Actividad (sin contar caminar)" />
      <ActivityPicker value={draft.activityLevel} onChange={(activityLevel) => update({ activityLevel })} />

      <SectionHeader title="Objetivos" />
      <GoalFields draft={draft} onChange={update} />
      <StepGoalField draft={draft} onChange={update} errors={errors} />

      <SectionHeader title="Entreno" />
      <RestField draft={draft} onChange={update} />

      {target && body ? (
        <>
          <SectionHeader title="Resultado" />
          <TargetSummary target={target} weightKg={body.weightKg} activityLevel={draft.activityLevel} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.xs },
});
