import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, EmptyState, ErrorState, Icon, LoadingState, colors, radii, spacing } from '@/design';
import { formatNumber } from '@/domain/format';
import { addDays, todayLocalDate } from '@/domain/localDay';
import type { DaySummary } from '@/domain/nutritionTypes';
import { targetsForProfile, useProfile } from '@/features/profile/queries';
import { useDaySummaries } from '@/features/nutrition/queries';
import { formatLongDay } from '@/features/steps/labels';

/** Historial por días: lo comido frente al objetivo. */
export default function CaloriesHistoryScreen() {
  const today = todayLocalDate();
  const summaries = useDaySummaries(addDays(today, -730), today);
  const profile = useProfile();
  const target = profile.data ? targetsForProfile(profile.data).target : 0;

  if (summaries.isPending) return <LoadingState />;
  if (summaries.isError) return <ErrorState message={summaries.error.message} onRetry={() => void summaries.refetch()} />;
  if ((summaries.data ?? []).length === 0) {
    return (
      <View style={styles.root}>
        <EmptyState icon="calendar-outline" title="Aún no hay comidas" message="Los días en que registres comidas aparecerán aquí." />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlashList
        data={summaries.data ?? []}
        keyExtractor={(d) => d.localDate}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <DayRow day={item} target={target} />}
      />
    </View>
  );
}

function DayRow({ day, target }: { day: DaySummary; target: number }) {
  const pct = target > 0 ? Math.min(1, day.kcal / target) : 0;
  const label = formatLongDay(day.localDate);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${formatNumber(day.kcal)} de ${formatNumber(target)} kilocalorías`}
      onPress={() => router.push({ pathname: '/calorias/dia/[fecha]', params: { fecha: day.localDate } })}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.flex}>
        <AppText variant="bodyStrong" style={styles.capitalize}>
          {label}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {formatNumber(day.kcal)} de {formatNumber(target)} kcal · P {formatNumber(day.protein)} · H {formatNumber(day.carbs)} · G{' '}
          {formatNumber(day.fat)} g
        </AppText>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct * 100}%` }]} />
        </View>
      </View>
      <Icon name="chevron-forward" size={18} color="textTertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: spacing.xxs },
  capitalize: { textTransform: 'capitalize' },
  track: { height: 4, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden', marginTop: spacing.xxs },
  fill: { height: '100%', backgroundColor: colors.success },
});
