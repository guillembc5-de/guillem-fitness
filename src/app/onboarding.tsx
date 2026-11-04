import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Icon, Screen, colors, spacing } from '@/design';
import {
  ActivityPicker,
  BodyFields,
  GoalFields,
  StepGoalField,
  TargetSummary,
  targetFromDraft,
  UnitField,
} from '@/features/profile/components';
import { bodyValues, draftToInput, emptyDraft, validateFields, type DraftErrors, type DraftField, type ProfileDraft } from '@/features/profile/profileForm';
import { useSaveProfile } from '@/features/profile/queries';
import { now } from '@/lib/ids';

const STEPS = ['welcome', 'body', 'activity', 'goal', 'summary'] as const;
type Step = (typeof STEPS)[number];

/** Campos que hay que validar antes de salir de cada paso. */
const FIELDS_BY_STEP: Record<Step, readonly DraftField[]> = {
  welcome: [],
  body: ['age', 'heightCm', 'weightKg'],
  activity: [],
  goal: ['stepGoal'],
  summary: [],
};

/**
 * Onboarding del primer arranque. Pide los datos una sola vez; después se
 * cambian desde Perfil. Los permisos (Salud, notificaciones) se piden más
 * tarde, en el momento en que hacen falta, para que se entienda el porqué.
 */
export default function OnboardingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const save = useSaveProfile();

  const step = STEPS[stepIndex] ?? 'welcome';
  const update = (patch: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors({});
  };

  const next = () => {
    const stepErrors = validateFields(draft, FIELDS_BY_STEP[step]);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    if (step === 'summary') {
      save.mutate(draftToInput(draft, now()));
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  const target = targetFromDraft(draft);
  const body = bodyValues(draft);

  const footer = (
    <View style={styles.footer}>
      {save.isError ? (
        <AppText variant="caption" color="accentText" accessibilityRole="alert">
          No se pudo guardar: {save.error.message}
        </AppText>
      ) : null}
      <Button
        title={step === 'welcome' ? 'Empezar' : step === 'summary' ? 'Empezar a usar GF' : 'Siguiente'}
        onPress={next}
        loading={save.isPending}
      />
    </View>
  );

  return (
    <Screen footer={footer}>
      {stepIndex > 0 ? (
        <View style={styles.topBar}>
          <Pressable
            onPress={back}
            accessibilityRole="button"
            accessibilityLabel="Atrás"
            hitSlop={8}
            style={styles.backButton}
          >
            <Icon name="chevron-back" />
          </Pressable>
          <Progress current={stepIndex} total={STEPS.length - 1} />
        </View>
      ) : null}

      {step === 'welcome' ? (
        <View style={styles.welcome}>
          <View style={styles.logo}>
            <AppText variant="numberXL" color="onAccent">
              GF
            </AppText>
          </View>
          <AppText variant="title" align="center">
            Guillem Fitness
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            Tus entrenos, tus pasos y tus calorías. Todo se guarda en este móvil: sin cuentas y sin anuncios.
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            Necesito unos datos para calcular tu objetivo diario. Solo te los pido esta vez.
          </AppText>
        </View>
      ) : null}

      {step === 'body' ? (
        <>
          <StepTitle title="Sobre ti" subtitle="Para calcular tu metabolismo basal." />
          <UnitField draft={draft} onChange={update} />
          <BodyFields draft={draft} onChange={update} errors={errors} />
        </>
      ) : null}

      {step === 'activity' ? (
        <>
          <StepTitle
            title="Tu actividad"
            subtitle="Sin contar lo que caminas: los pasos se cuentan aparte, cada día, para no sumarlos dos veces."
          />
          <ActivityPicker value={draft.activityLevel} onChange={(activityLevel) => update({ activityLevel })} />
        </>
      ) : null}

      {step === 'goal' ? (
        <>
          <StepTitle title="Tu objetivo" />
          <GoalFields draft={draft} onChange={update} />
          <StepGoalField draft={draft} onChange={update} errors={errors} />
        </>
      ) : null}

      {step === 'summary' && target && body ? (
        <>
          <StepTitle title="Listo" subtitle="Puedes cambiar estos datos cuando quieras en Perfil." />
          <TargetSummary target={target} weightKg={body.weightKg} activityLevel={draft.activityLevel} />
        </>
      ) : null}
    </Screen>
  );
}

function StepTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.stepTitle}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" color="textSecondary">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.progress} accessible accessibilityLabel={`Paso ${current} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.progressBar, i < current ? styles.progressDone : null]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -spacing.sm },
  progress: { flex: 1, flexDirection: 'row', gap: spacing.xxs },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.surfaceRaised },
  progressDone: { backgroundColor: colors.accent },
  welcome: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xxl * 1.5 },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stepTitle: { gap: spacing.xs, paddingTop: spacing.sm },
  footer: { gap: spacing.xs },
});
