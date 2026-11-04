import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, NumberField, SegmentedControl, colors, radii, spacing, type SegmentOption } from '@/design';
import { calorieTarget, macroTargets, type CalorieTarget } from '@/domain/calorieGoal';
import { formatDuration, formatNumber, formatSigned } from '@/domain/format';
import { ACTIVITY_LEVELS, type ActivityLevel, type Goal, type Sex, type WeightUnit } from '@/domain/types';

import { ACTIVITY_LABELS, GOAL_LABELS, SEX_LABELS } from './labels';
import {
  bodyValues,
  GAIN_RATES,
  LOSE_RATES,
  normalizeRate,
  REST_OPTIONS,
  type DraftErrors,
  type ProfileDraft,
} from './profileForm';

type DraftProps = {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors?: DraftErrors;
};

const SEX_OPTIONS: SegmentOption<Sex>[] = [
  { value: 'male', label: SEX_LABELS.male },
  { value: 'female', label: SEX_LABELS.female },
];

const UNIT_OPTIONS: SegmentOption<WeightUnit>[] = [
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
];

export function BodyFields({ draft, onChange, errors = {} }: DraftProps) {
  return (
    <View style={styles.stack}>
      <SegmentedControl accessibilityLabel="Sexo" options={SEX_OPTIONS} value={draft.sex} onChange={(sex) => onChange({ sex })} />
      <NumberField label="Edad" unit="años" maxDecimals={0} value={draft.age} onChangeText={(age) => onChange({ age })} error={errors.age} />
      <NumberField
        label="Altura"
        unit="cm"
        maxDecimals={0}
        value={draft.heightCm}
        onChangeText={(heightCm) => onChange({ heightCm })}
        error={errors.heightCm}
      />
      <NumberField
        label="Peso"
        unit={draft.weightUnit}
        maxDecimals={1}
        value={draft.weightKg}
        onChangeText={(weightKg) => onChange({ weightKg })}
        error={errors.weightKg}
        hint="Puedes usar coma: 80,5"
      />
    </View>
  );
}

export function UnitField({ draft, onChange }: DraftProps) {
  return (
    <SegmentedControl
      accessibilityLabel="Unidad de peso"
      options={UNIT_OPTIONS}
      value={draft.weightUnit}
      onChange={(weightUnit) => onChange({ weightUnit })}
    />
  );
}

export function ActivityPicker({ value, onChange }: { value: ActivityLevel; onChange: (v: ActivityLevel) => void }) {
  return (
    <View style={styles.stack} accessibilityRole="radiogroup" accessibilityLabel="Nivel de actividad">
      {ACTIVITY_LEVELS.map((level) => {
        const selected = level === value;
        const { title, description } = ACTIVITY_LABELS[level];
        return (
          <Pressable
            key={level}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, selected }}
            accessibilityLabel={`${title}. ${description}`}
            onPress={() => onChange(level)}
            style={[styles.option, selected ? styles.optionSelected : null]}
          >
            <View style={styles.optionTexts}>
              <AppText variant="headline">{title}</AppText>
              <AppText variant="caption" color="textSecondary">
                {description}
              </AppText>
            </View>
            <Icon name={selected ? 'checkmark-circle' : 'ellipse-outline'} color={selected ? 'text' : 'textTertiary'} />
          </Pressable>
        );
      })}
    </View>
  );
}

const GOAL_OPTIONS: SegmentOption<Goal>[] = [
  { value: 'lose', label: GOAL_LABELS.lose },
  { value: 'maintain', label: GOAL_LABELS.maintain },
  { value: 'gain', label: GOAL_LABELS.gain },
];

function rateOptions(goal: Goal): SegmentOption<number>[] {
  const rates = goal === 'gain' ? GAIN_RATES : LOSE_RATES;
  return rates.map((r) => ({
    value: r,
    label: formatNumber(r, { maxDecimals: 2 }),
    accessibilityLabel: `${formatNumber(r, { maxDecimals: 2 })} kilos por semana`,
  }));
}

export function GoalFields({ draft, onChange }: DraftProps) {
  return (
    <View style={styles.stack}>
      <SegmentedControl
        accessibilityLabel="Objetivo"
        options={GOAL_OPTIONS}
        value={draft.goal}
        onChange={(goal) => onChange({ goal, goalRateKgWeek: normalizeRate(goal, draft.goalRateKgWeek) })}
      />
      {draft.goal !== 'maintain' ? (
        <View style={styles.smallStack}>
          <AppText variant="caption" color="textSecondary">
            Ritmo (kg por semana)
          </AppText>
          <SegmentedControl
            accessibilityLabel="Ritmo en kilos por semana"
            options={rateOptions(draft.goal)}
            value={draft.goalRateKgWeek}
            onChange={(goalRateKgWeek) => onChange({ goalRateKgWeek })}
          />
        </View>
      ) : null}
    </View>
  );
}

export function StepGoalField({ draft, onChange, errors = {} }: DraftProps) {
  return (
    <NumberField
      label="Objetivo diario de pasos"
      unit="pasos"
      maxDecimals={0}
      value={draft.stepGoal}
      onChangeText={(stepGoal) => onChange({ stepGoal })}
      error={errors.stepGoal}
    />
  );
}

const REST_SEGMENTS: SegmentOption<number>[] = REST_OPTIONS.map((s) => ({
  value: s,
  label: formatDuration(s),
  accessibilityLabel: `${formatDuration(s)} minutos`,
}));

export function RestField({ draft, onChange }: DraftProps) {
  return (
    <View style={styles.smallStack}>
      <AppText variant="caption" color="textSecondary">
        Descanso por defecto entre series
      </AppText>
      <SegmentedControl
        accessibilityLabel="Descanso por defecto"
        options={REST_SEGMENTS}
        value={draft.defaultRestSeconds}
        onChange={(defaultRestSeconds) => onChange({ defaultRestSeconds })}
      />
    </View>
  );
}

/** Objetivo calculado a partir del borrador, o null si faltan datos. */
export function targetFromDraft(draft: ProfileDraft): CalorieTarget | null {
  const body = bodyValues(draft);
  if (!body) return null;
  return calorieTarget({
    sex: draft.sex,
    ...body,
    activityLevel: draft.activityLevel,
    goal: draft.goal,
    goalRateKgWeek: draft.goalRateKgWeek,
  });
}

type SummaryProps = {
  target: CalorieTarget;
  weightKg: number;
  activityLevel: ActivityLevel;
};

/** Tarjeta con el objetivo diario y cómo se calcula. */
export function TargetSummary({ target, weightKg, activityLevel }: SummaryProps) {
  const macros = macroTargets(target.target, weightKg);
  return (
    <Card style={styles.summary}>
      <AppText variant="caption" color="textSecondary">
        Objetivo diario
      </AppText>
      <View style={styles.bigRow} accessible accessibilityLabel={`Objetivo diario: ${formatNumber(target.target)} kilocalorías`}>
        <AppText variant="numberXL">{formatNumber(target.target)}</AppText>
        <AppText variant="body" color="textSecondary">
          kcal
        </AppText>
      </View>
      <View style={styles.breakdown}>
        <BreakdownRow label="Metabolismo basal" value={formatNumber(target.bmr)} />
        <BreakdownRow label={`Actividad (${ACTIVITY_LABELS[activityLevel].title.toLowerCase()})`} value={formatSigned(target.tdee - target.bmr)} />
        {target.adjustment !== 0 ? <BreakdownRow label="Objetivo" value={formatSigned(target.adjustment)} /> : null}
      </View>
      {target.floorApplied ? (
        <AppText variant="caption" color="warmup">
          Ajustado al mínimo de seguridad. Comer menos no es recomendable sin supervisión.
        </AppText>
      ) : null}
      <View style={styles.macros}>
        <Macro label="Proteína" grams={macros.proteinG} />
        <Macro label="Hidratos" grams={macros.carbsG} />
        <Macro label="Grasa" grams={macros.fatG} />
      </View>
      <AppText variant="caption" color="textTertiary">
        Las kcal que gastas caminando se restan aparte, cada día, en Calorías.
      </AppText>
    </Card>
  );
}

function BreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.breakdownRow}>
      <AppText variant="body" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="number">{value}</AppText>
    </View>
  );
}

function Macro({ label, grams }: { label: string; grams: number }) {
  return (
    <View style={styles.macro} accessible accessibilityLabel={`${label}: ${grams} gramos`}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="headline" style={styles.tabular}>
        {formatNumber(grams)} g
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  smallStack: { gap: spacing.xs },
  option: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  optionSelected: { borderColor: colors.text },
  optionTexts: { flex: 1, gap: 2 },
  summary: { gap: spacing.sm },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  breakdown: { gap: spacing.xxs },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macros: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  macro: { flex: 1, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
});
