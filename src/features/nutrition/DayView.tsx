import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Card, ErrorState, Icon, LoadingState, Screen, colors, radii, spacing } from '@/design';
import { formatNumber, formatSigned } from '@/domain/format';
import type { LocalDate } from '@/domain/localDay';
import { dailyBalance, itemTotals, sumTotals } from '@/domain/nutrition';
import type { Meal } from '@/domain/nutritionTypes';
import { workoutsKcal } from '@/domain/exerciseKcal';
import { targetsForProfile, useProfile } from '@/features/profile/queries';
import { useActivityDays } from '@/features/steps/fitnessQueries';
import { useStepDays } from '@/features/steps/queries';
import { useWorkouts } from '@/features/workout/queries';

import { MEAL_LABELS, MEAL_ORDER } from './labels';
import { useMealsByDate, usePendingPhotos } from './queries';
import { useAddMeal } from './useAddMeal';

type Props = {
  date: LocalDate;
  /** Título grande (pestaña) o cabecera nativa (día del historial). */
  title?: string;
  headerRight?: ReactNode;
  showPending?: boolean;
};

/** Resumen de un día: balance, macros y comidas agrupadas. */
export function DayView({ date, title, headerRight, showPending = false }: Props) {
  const profile = useProfile();
  const meals = useMealsByDate(date);
  const steps = useStepDays(date, date);
  const activity = useActivityDays(date, date);
  const workouts = useWorkouts();
  const pending = usePendingPhotos();
  const insets = useSafeAreaInsets();
  const { open } = useAddMeal(date);

  if (meals.isPending || !profile.data) return <LoadingState />;
  if (meals.isError) return <ErrorState message={meals.error.message} onRetry={() => void meals.refetch()} />;

  const targets = targetsForProfile(profile.data);
  const totals = sumTotals((meals.data ?? []).flatMap((m) => m.items.map(itemTotals)));
  const dayWorkouts = (workouts.data ?? []).filter((w) => w.localDate === date);
  const balance = dailyBalance(
    targets.target,
    totals.kcal,
    steps.data?.[0]?.kcal ?? 0,
    workoutsKcal(dayWorkouts, profile.data.weightKg),
    activity.data?.[0]?.activeKcal ?? null,
  );
  const over = balance.remaining < 0;
  const pendingCount = showPending ? (pending.data?.length ?? 0) : 0;

  return (
    <View style={styles.root}>
      <Screen title={title} headerRight={headerRight} edges={title ? ['top'] : []}>
        <Card style={styles.summary}>
          <View
            style={styles.remaining}
            accessible
            accessibilityLabel={`${over ? 'Te has pasado' : 'Te quedan'} ${formatNumber(Math.abs(balance.remaining))} kilocalorías`}
          >
            <AppText variant="caption" color="textSecondary">
              {over ? 'Te has pasado' : 'Te quedan'}
            </AppText>
            <View style={styles.bigRow}>
              <AppText variant="numberXL">{formatNumber(Math.abs(balance.remaining))}</AppText>
              <AppText variant="body" color="textSecondary">
                kcal
              </AppText>
            </View>
          </View>
          <View style={styles.breakdown}>
            <Line label="Objetivo" value={formatNumber(balance.target)} />
            <Line label="Comido" value={formatSigned(balance.eaten)} color="success" />
            {balance.usesFitness ? (
              <Line label="Actividad (Fitness)" value={formatSigned(-balance.burned)} color="accentText" />
            ) : (
              <>
                <Line label="Pasos" value={formatSigned(-balance.steps)} color="accentText" />
                {dayWorkouts.length > 0 ? (
                  <Line label={dayWorkouts.length === 1 ? 'Entreno' : `Entrenos (${dayWorkouts.length})`} value={formatSigned(-balance.workouts)} color="accentText" />
                ) : null}
              </>
            )}
          </View>
          {balance.fitness !== null ? (
            <AppText variant="caption" color="textTertiary">
              {balance.usesFitness
                ? `Energía activa del Apple Watch. Ya incluye pasos y entrenos (la app estimaba ${formatNumber(balance.steps + balance.workouts)} kcal), así que no se suman.`
                : `Fitness marca ${formatNumber(balance.fitness)} kcal activas, menos que la estimación de pasos y entrenos: se usa la estimación.`}
            </AppText>
          ) : null}
        </Card>

        <Card style={styles.macros}>
          <MacroBar label="Proteína" value={totals.protein} target={targets.macros.proteinG} />
          <MacroBar label="Hidratos" value={totals.carbs} target={targets.macros.carbsG} />
          <MacroBar label="Grasa" value={totals.fat} target={targets.macros.fatG} />
        </Card>

        {pendingCount > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/calorias/pendientes')}>
            <Card style={styles.pending}>
              <Icon name="time-outline" color="warmup" />
              <AppText variant="bodyStrong" style={styles.flex}>
                {pendingCount === 1 ? '1 foto pendiente de analizar' : `${pendingCount} fotos pendientes de analizar`}
              </AppText>
              <Icon name="chevron-forward" size={18} color="textTertiary" />
            </Card>
          </Pressable>
        ) : null}

        {MEAL_ORDER.map((type) => {
          const ofType = (meals.data ?? []).filter((m) => m.mealType === type);
          const kcal = sumTotals(ofType.flatMap((m) => m.items.map(itemTotals))).kcal;
          return (
            <Card key={type} padded={false} style={styles.mealCard}>
              <View style={styles.mealHeader}>
                <AppText variant="headline" style={styles.flex}>
                  {MEAL_LABELS[type]}
                </AppText>
                {kcal > 0 ? (
                  <AppText variant="number" color="textSecondary">
                    {formatNumber(kcal)} kcal
                  </AppText>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Añadir a ${MEAL_LABELS[type].toLowerCase()}`}
                  onPress={() => open(type)}
                  style={styles.addButton}
                >
                  <Icon name="add-circle-outline" size={28} />
                </Pressable>
              </View>
              {ofType.map((m) => (
                <MealRow key={m.id} meal={m} />
              ))}
            </Card>
          );
        })}
        <View style={{ height: 72 }} />
      </Screen>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Añadir comida"
        accessibilityHint="Hacer foto, elegir de la galería o añadir a mano"
        onPress={() => open()}
        style={({ pressed }) => [styles.fab, { bottom: spacing.lg + (title ? 0 : insets.bottom) }, pressed ? styles.fabPressed : null]}
      >
        <Icon name="camera" size={28} color="onAccent" />
      </Pressable>
    </View>
  );
}

function MealRow({ meal }: { meal: Meal }) {
  const time = new Date(meal.eatenAt);
  const label = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Editar esta comida"
      onPress={() => router.push({ pathname: '/comida', params: { mode: 'edit', mealId: meal.id, date: meal.localDate } })}
      style={({ pressed }) => [styles.mealRow, pressed ? styles.pressed : null]}
    >
      {meal.items.map((i) => (
        <View key={i.id} style={styles.itemLine}>
          <AppText variant="body" style={styles.flex} numberOfLines={1}>
            {i.name}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {formatNumber(i.grams)} g · {formatNumber(itemTotals(i).kcal)} kcal
          </AppText>
        </View>
      ))}
      <AppText variant="caption" color="textTertiary">
        {label}
        {meal.source === 'photo' ? ' · foto' : ' · a mano'}
        {meal.items.some((i) => i.aiEstimated) ? ' · estimado por IA' : ''}
      </AppText>
    </Pressable>
  );
}

function Line({ label, value, color = 'text' }: { label: string; value: string; color?: 'text' | 'success' | 'accentText' }) {
  return (
    <View style={styles.line}>
      <AppText variant="body" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="number" color={color}>
        {value}
      </AppText>
    </View>
  );
}

function MacroBar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={styles.macro} accessible accessibilityLabel={`${label}: ${formatNumber(value)} de ${formatNumber(target)} gramos`}>
      <View style={styles.macroHead}>
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
        <AppText variant="caption" color="text" style={styles.tabular}>
          {formatNumber(value)} / {formatNumber(target)} g
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  summary: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  remaining: { flex: 1 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs },
  breakdown: { flex: 1, gap: spacing.xxs },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  macros: { gap: spacing.sm },
  macro: { gap: spacing.xxs },
  macroHead: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.text },
  tabular: { fontVariant: ['tabular-nums'] },
  pending: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.warmup },
  mealCard: { paddingBottom: spacing.xs },
  mealHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.xs, minHeight: 52 },
  addButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  mealRow: {
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceRaised },
  itemLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fab: {
    position: 'absolute',
    right: spacing.md,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: { backgroundColor: colors.accentPressed },
});
