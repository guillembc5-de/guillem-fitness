import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, EmptyState, ErrorState, Icon, LoadingState, SegmentedControl, colors, radii, spacing } from '@/design';
import { formatNumber, toDisplayWeight } from '@/domain/format';
import type { WorkoutSummary } from '@/domain/workoutTypes';
import { useProfile } from '@/features/profile/queries';
import { formatMonth, formatWorkoutDate, formatWorkoutDuration } from '@/features/workout/format';
import { WorkoutCalendar, WorkoutStatsView } from '@/features/workout/HistoryViews';
import { useWorkouts } from '@/features/workout/queries';

type View_ = 'list' | 'calendar' | 'stats';

const VIEWS = [
  { value: 'list' as const, label: 'Lista' },
  { value: 'calendar' as const, label: 'Calendario' },
  { value: 'stats' as const, label: 'Estadísticas' },
];

type Item = { type: 'month'; key: string; label: string; count: number } | { type: 'workout'; key: string; workout: WorkoutSummary };

export default function HistoryScreen() {
  const workouts = useWorkouts();
  const profile = useProfile();
  const unit = profile.data?.weightUnit ?? 'kg';
  const [view, setView] = useState<View_>('list');

  const items = useMemo<Item[]>(() => {
    const result: Item[] = [];
    let currentMonth = '';
    let header: Extract<Item, { type: 'month' }> | null = null;
    for (const w of workouts.data ?? []) {
      const month = w.localDate.slice(0, 7);
      if (month !== currentMonth) {
        currentMonth = month;
        header = { type: 'month', key: month, label: formatMonth(w.startedAt), count: 0 };
        result.push(header);
      }
      if (header) header.count += 1;
      result.push({ type: 'workout', key: w.id, workout: w });
    }
    return result;
  }, [workouts.data]);

  if (workouts.isPending) return <LoadingState />;
  if (workouts.isError) return <ErrorState message={workouts.error.message} onRetry={() => void workouts.refetch()} />;
  if (items.length === 0) {
    return (
      <View style={styles.root}>
        <EmptyState icon="time-outline" title="Aún no hay entrenos" message="Cuando termines tu primer entreno aparecerá aquí." />
      </View>
    );
  }

  const switcher = (
    <View style={styles.switcher}>
      <SegmentedControl accessibilityLabel="Vista del historial" options={VIEWS} value={view} onChange={setView} />
    </View>
  );

  if (view !== 'list') {
    return (
      <View style={styles.root}>
        {switcher}
        <ScrollView contentContainerStyle={styles.scroll}>
          {view === 'calendar' ? <WorkoutCalendar workouts={workouts.data ?? []} /> : <WorkoutStatsView workouts={workouts.data ?? []} unit={unit} />}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {switcher}
      <FlashList
        data={items}
        keyExtractor={(i) => i.key}
        getItemType={(i) => i.type}
        contentContainerStyle={styles.list}
        renderItem={({ item }) =>
          item.type === 'month' ? (
            <AppText variant="overline" color="textSecondary" accessibilityRole="header" style={styles.month}>
              {item.label} · {item.count} {item.count === 1 ? 'entreno' : 'entrenos'}
            </AppText>
          ) : (
            <WorkoutRow workout={item.workout} unit={unit} />
          )
        }
      />
    </View>
  );
}

function WorkoutRow({ workout: w, unit }: { workout: WorkoutSummary; unit: 'kg' | 'lb' }) {
  const duration = w.endedAt ? formatWorkoutDuration(w.startedAt, w.endedAt) : '';
  const volume = `${formatNumber(toDisplayWeight(w.volume, unit))} ${unit}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${w.name}, ${formatWorkoutDate(w.startedAt)}. ${duration}, ${w.setCount} series, volumen ${volume}`}
      onPress={() => router.push({ pathname: '/entreno/historial/[id]', params: { id: w.id } })}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.flex}>
        <AppText variant="headline">{w.name}</AppText>
        <AppText variant="caption" color="textSecondary">
          {formatWorkoutDate(w.startedAt)}
        </AppText>
        <AppText variant="caption" color="textSecondary">
          {duration} · {w.exerciseCount} ejercicios · {w.setCount} series · {volume}
        </AppText>
      </View>
      <Icon name="chevron-forward" size={18} color="textTertiary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  switcher: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  month: { paddingTop: spacing.lg, paddingBottom: spacing.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.7 },
  flex: { flex: 1, gap: 2 },
});
