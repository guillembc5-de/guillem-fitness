import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, BarChart, Card, SegmentedControl, Stat, colors, radii, spacing, type Bar } from '@/design';
import { formatNumber, toDisplayWeight } from '@/domain/format';
import { todayLocalDate, type LocalDate } from '@/domain/localDay';
import { monthGrid } from '@/domain/steps';
import { weeklyStreak, weeklyTotals } from '@/domain/workoutStats';
import type { WeightUnit } from '@/domain/types';
import type { WorkoutSummary } from '@/domain/workoutTypes';
import { formatMonthTitle, WEEKDAY_INITIALS } from '@/features/steps/labels';
import { useNow } from '@/lib/useNow';

import { formatShortDate, formatWorkoutDuration } from './format';
import { MUSCLE_LABELS } from './labels';
import { useMuscleSets } from './queries';

/** Calendario del mes con los días entrenados marcados. */
export function WorkoutCalendar({ workouts }: { workouts: readonly WorkoutSummary[] }) {
  const nowMs = useNow(60_000);
  const today = todayLocalDate(nowMs);
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState<LocalDate | null>(null);
  const byDay = useMemo(() => {
    const map = new Map<LocalDate, WorkoutSummary[]>();
    for (const w of workouts) map.set(w.localDate, [...(map.get(w.localDate) ?? []), w]);
    return map;
  }, [workouts]);
  const cells = monthGrid(ym.y, ym.m);
  const prefix = `${ym.y}-${String(ym.m).padStart(2, '0')}`;
  const inMonth = workouts.filter((w) => w.localDate.startsWith(prefix)).length;
  const move = (delta: number) => {
    setSelected(null);
    setYm(({ y, m }) => ({ y: m + delta > 12 ? y + 1 : m + delta < 1 ? y - 1 : y, m: ((m + delta + 11) % 12) + 1 }));
  };
  const dayWorkouts = selected ? (byDay.get(selected) ?? []) : [];

  return (
    <Card style={styles.gap}>
      <View style={styles.monthHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes anterior" onPress={() => move(-1)} style={styles.navButton}>
          <AppText variant="headline">‹</AppText>
        </Pressable>
        <View style={styles.flex}>
          <AppText variant="headline" align="center">
            {formatMonthTitle(ym.y, ym.m)}
          </AppText>
          <AppText variant="caption" color="textSecondary" align="center">
            {inMonth} {inMonth === 1 ? 'entreno' : 'entrenos'}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Mes siguiente" onPress={() => move(1)} style={styles.navButton}>
          <AppText variant="headline">›</AppText>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAY_INITIALS.map((d) => (
          <AppText key={d} variant="overline" color="textSecondary" align="center" style={styles.cell}>
            {d}
          </AppText>
        ))}
        {cells.map((c) => {
          const trained = byDay.has(c.localDate);
          const isToday = c.localDate === today;
          return (
            <Pressable
              key={c.localDate}
              accessibilityRole="button"
              accessibilityLabel={`${Number(c.localDate.slice(8))}${trained ? ', entrenaste' : ''}`}
              disabled={!c.inMonth}
              onPress={() => setSelected(c.localDate)}
              style={[styles.cell, styles.day, trained ? styles.trained : null, isToday ? styles.today : null, selected === c.localDate ? styles.selected : null]}
            >
              <AppText variant="body" color={!c.inMonth ? 'textTertiary' : trained ? 'onAccent' : 'text'} align="center">
                {c.inMonth ? Number(c.localDate.slice(8)) : ''}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        dayWorkouts.length > 0 ? (
          dayWorkouts.map((w) => (
            <Pressable
              key={w.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/entreno/historial/[id]', params: { id: w.id } })}
              style={styles.dayRow}
            >
              <AppText variant="bodyStrong" style={styles.flex}>
                {w.name}
              </AppText>
              <AppText variant="caption" color="textSecondary">
                {w.endedAt ? formatWorkoutDuration(w.startedAt, w.endedAt) : ''} · {w.setCount} series
              </AppText>
            </Pressable>
          ))
        ) : (
          <AppText variant="caption" color="textSecondary" align="center">
            Sin entrenos ese día.
          </AppText>
        )
      ) : null}
    </Card>
  );
}

type Metric = 'workouts' | 'volume' | 'minutes';

const METRICS = [
  { value: 'workouts' as const, label: 'Entrenos' },
  { value: 'volume' as const, label: 'Volumen' },
  { value: 'minutes' as const, label: 'Duración' },
];

const DAY_MS = 86_400_000;

/** Estadísticas: últimas 12 semanas y series por músculo en los últimos 30 días. */
export function WorkoutStatsView({ workouts, unit }: { workouts: readonly WorkoutSummary[]; unit: WeightUnit }) {
  const nowMs = useNow(60_000);
  const [metric, setMetric] = useState<Metric>('workouts');
  // Redondeado al día para que la consulta no cambie cada minuto.
  const since = Math.floor((nowMs - 30 * DAY_MS) / DAY_MS) * DAY_MS;
  const muscles = useMuscleSets(since);
  const weeks = weeklyTotals(workouts, 12, nowMs);
  const streak = weeklyStreak(workouts.map((w) => w.localDate), nowMs);
  const last30 = workouts.filter((w) => w.startedAt >= since);

  const value = (w: (typeof weeks)[number]) => (metric === 'workouts' ? w.workouts : metric === 'volume' ? toDisplayWeight(w.volume, unit) : w.minutes);
  const bars: Bar[] = weeks.map((w, i) => ({
    key: w.weekStart,
    value: value(w),
    label: i % 3 === 0 ? formatShortDate(new Date(`${w.weekStart}T12:00:00`).getTime()) : '',
    detail: `Semana del ${formatShortDate(new Date(`${w.weekStart}T12:00:00`).getTime())}: ${formatNumber(value(w))} ${metric === 'workouts' ? 'entrenos' : metric === 'volume' ? unit : 'min'}`,
    color: i === weeks.length - 1 ? colors.accent : undefined,
    highlighted: i === weeks.length - 1,
  }));
  const maxSets = Math.max(1, ...(muscles.data ?? []).map((m) => m.sets));

  return (
    <View style={styles.gap}>
      <Card style={styles.stats}>
        <Stat label="Racha" value={`🔥 ${streak}`} unit={streak === 1 ? 'semana' : 'semanas'} />
        <Stat label="Últimos 30 días" value={String(last30.length)} unit="entrenos" />
        <Stat label="Total" value={String(workouts.length)} unit="entrenos" />
      </Card>
      <Card style={styles.gap}>
        <SegmentedControl accessibilityLabel="Dato de la gráfica" options={METRICS} value={metric} onChange={setMetric} />
        <BarChart bars={bars} accessibilityLabel="Últimas 12 semanas" />
      </Card>
      <Card style={styles.gap}>
        <AppText variant="overline" color="textSecondary">
          Series por músculo · últimos 30 días
        </AppText>
        {(muscles.data ?? []).length === 0 ? (
          <AppText variant="caption" color="textSecondary">
            Sin entrenos en los últimos 30 días.
          </AppText>
        ) : null}
        {(muscles.data ?? []).map((m) => (
          <View key={m.muscleGroup} style={styles.muscleRow} accessible accessibilityLabel={`${MUSCLE_LABELS[m.muscleGroup]}: ${m.sets} series`}>
            <AppText variant="body" style={styles.muscleName}>
              {MUSCLE_LABELS[m.muscleGroup]}
            </AppText>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(m.sets / maxSets) * 100}%` }]} />
            </View>
            <AppText variant="number" style={styles.muscleCount}>
              {m.sets}
            </AppText>
          </View>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.sm },
  monthHeader: { flexDirection: 'row', alignItems: 'center' },
  navButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  day: { height: 44, borderRadius: radii.pill },
  trained: { backgroundColor: colors.accent },
  today: { borderWidth: 1, borderColor: colors.textSecondary },
  selected: { borderWidth: 2, borderColor: colors.text },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  stats: { flexDirection: 'row' },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  muscleName: { width: 120 },
  muscleCount: { width: 32, textAlign: 'right' },
  track: { flex: 1, height: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.info },
});
