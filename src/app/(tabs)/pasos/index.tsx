import { useIsFocused } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BarChart, Card, LoadingState, ProgressRing, Screen, SegmentedControl, Stat, colors, spacing, type Bar } from '@/design';
import { formatNumber } from '@/domain/format';
import { addDays, startOfWeek, todayLocalDate, type LocalDate } from '@/domain/localDay';
import { monthDates, streak, weekDates } from '@/domain/steps';
import type { StepDay } from '@/domain/stepTypes';
import { useProfile } from '@/features/profile/queries';
import { DayDetailSheet, MonthCalendar, PeriodHeader } from '@/features/steps/components';
import { FitnessCard } from '@/features/steps/FitnessCard';
import { formatMonthTitle, formatWeekRange, SOURCE_LABELS, WEEKDAY_INITIALS } from '@/features/steps/labels';
import { PermissionBanner, SensorOnlyNote, StepsIntro } from '@/features/steps/PermissionCard';
import { useRecentStepDays, useStepDays, useStepsSync } from '@/features/steps/queries';
import { useNow } from '@/lib/useNow';

type View_ = 'week' | 'month' | 'calendar';

const VIEWS = [
  { value: 'week' as const, label: 'Semana' },
  { value: 'month' as const, label: 'Mes' },
  { value: 'calendar' as const, label: 'Calendario' },
];

export default function PasosScreen() {
  const focused = useIsFocused();
  // Con la pantalla abierta, los pasos de hoy se actualizan cada minuto.
  const sync = useStepsSync(focused, true);
  const profile = useProfile();
  const nowMs = useNow(60_000);
  const today = todayLocalDate(nowMs);
  const goal = profile.data?.stepGoal ?? 10000;

  const recent = useRecentStepDays(today);
  const days = useMemo(() => new Map((recent.data ?? []).map((d) => [d.localDate, d] as const)), [recent.data]);
  const todayDay = days.get(today) ?? null;
  const currentStreak = useMemo(
    () => streak((recent.data ?? []).map((d) => ({ localDate: d.localDate, steps: d.steps, goal: d.goalSnapshot })), today),
    [recent.data, today],
  );

  const [view, setView] = useState<View_>('week');

  if (sync.isPending && !sync.data) return <LoadingState />;

  if (sync.data && !sync.data.setupDone) {
    return (
      <Screen title="Pasos">
        <StepsIntro />
      </Screen>
    );
  }

  const steps = todayDay?.steps ?? 0;
  const done = steps >= goal;
  const status = sync.data;

  return (
    <Screen title="Pasos">
      <View style={styles.ringWrap}>
        <ProgressRing
          progress={steps / goal}
          color={done ? colors.success : colors.accent}
          accessibilityLabel={`Hoy: ${formatNumber(steps)} de ${formatNumber(goal)} pasos`}
        >
          <AppText variant="display" style={styles.ringNumber} adjustsFontSizeToFit numberOfLines={1}>
            {formatNumber(steps)}
          </AppText>
          <AppText variant="body" color="textSecondary">
            de {formatNumber(goal)}
          </AppText>
        </ProgressRing>
      </View>

      <Card style={styles.stats}>
        <Stat label="Distancia" value={formatNumber((todayDay?.distanceM ?? 0) / 1000, { maxDecimals: 1 })} unit="km" />
        <Stat label="Calorías" value={formatNumber(todayDay?.kcal ?? 0)} unit="kcal" />
        <Stat label="Racha" value={`🔥 ${currentStreak}`} unit={currentStreak === 1 ? 'día' : 'días'} />
      </Card>

      <FitnessCard date={today} />

      {status ? <PermissionBanner reason={status.reason} detail={status.healthError} /> : null}

      <SegmentedControl accessibilityLabel="Vista" options={VIEWS} value={view} onChange={setView} />

      {view === 'week' ? <WeekView today={today} goal={goal} /> : null}
      {view === 'month' ? <MonthBars today={today} goal={goal} /> : null}
      {view === 'calendar' ? <CalendarView today={today} goal={goal} /> : null}

      <AppText variant="caption" color="textTertiary" align="center">
        {status?.source ? `Fuente: ${SOURCE_LABELS[status.source]}` : 'Sin fuente de pasos'}
        {status?.source === 'pedometer' ? ' · solo recuerda 7 días; la app guarda cada día' : ''}
      </AppText>
      {status?.reason === 'sensor_only' ? <SensorOnlyNote /> : null}
    </Screen>
  );
}

function barsFor(dates: readonly LocalDate[], byDate: ReadonlyMap<LocalDate, StepDay>, goal: number, today: LocalDate, label: (d: LocalDate, i: number) => string): Bar[] {
  return dates.map((d, i) => {
    const day = byDate.get(d);
    const g = day?.goalSnapshot ?? goal;
    const value = d > today ? null : (day?.steps ?? 0);
    return {
      key: d,
      value,
      label: label(d, i),
      detail: `${Number(d.slice(8))}/${Number(d.slice(5, 7))}: ${value === null ? 'aún no ha llegado' : `${formatNumber(value)} pasos`}`,
      color: value !== null && value >= g ? colors.success : d === today ? colors.accent : undefined,
      highlighted: d === today,
    };
  });
}

function PeriodSummary({ days, goal, count }: { days: readonly StepDay[]; goal: number; count: number }) {
  const total = days.reduce((s, d) => s + d.steps, 0);
  const met = days.filter((d) => d.steps >= (d.goalSnapshot || goal)).length;
  return (
    <View style={styles.summary}>
      <Stat label="Total" value={formatNumber(total)} />
      <Stat label="Media diaria" value={formatNumber(count > 0 ? total / count : 0)} />
      <Stat label="Cumplidos" value={`${met}/${count}`} color={met > 0 ? 'success' : 'text'} />
    </View>
  );
}

function WeekView({ today, goal }: { today: LocalDate; goal: number }) {
  const [monday, setMonday] = useState(() => startOfWeek(today));
  const dates = weekDates(monday);
  const sunday = dates[6] ?? monday;
  const data = useStepDays(monday, sunday);
  const byDate = new Map((data.data ?? []).map((d) => [d.localDate, d] as const));
  const elapsed = dates.filter((d) => d <= today).length;
  return (
    <Card style={styles.period}>
      <PeriodHeader
        title={formatWeekRange(monday, sunday)}
        onPrev={() => setMonday(addDays(monday, -7))}
        onNext={() => setMonday(addDays(monday, 7))}
        canNext={addDays(monday, 7) <= today}
      />
      <BarChart
        bars={barsFor(dates, byDate, goal, today, (_d, i) => WEEKDAY_INITIALS[i] ?? '')}
        goal={goal}
        accessibilityLabel={`Pasos de la semana ${formatWeekRange(monday, sunday)}`}
      />
      <PeriodSummary days={data.data ?? []} goal={goal} count={elapsed} />
    </Card>
  );
}

function MonthBars({ today, goal }: { today: LocalDate; goal: number }) {
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const dates = monthDates(ym.y, ym.m);
  const first = dates[0] ?? today;
  const last = dates[dates.length - 1] ?? today;
  const data = useStepDays(first, last);
  const byDate = new Map((data.data ?? []).map((d) => [d.localDate, d] as const));
  const elapsed = dates.filter((d) => d <= today).length;
  const move = (delta: number) => setYm(({ y, m }) => ({ y: m + delta > 12 ? y + 1 : m + delta < 1 ? y - 1 : y, m: ((m + delta + 11) % 12) + 1 }));
  return (
    <Card style={styles.period}>
      <PeriodHeader title={formatMonthTitle(ym.y, ym.m)} onPrev={() => move(-1)} onNext={() => move(1)} canNext={last < today} />
      <BarChart
        bars={barsFor(dates, byDate, goal, today, (d) => String(Number(d.slice(8))))}
        goal={goal}
        labelEvery={5}
        accessibilityLabel={`Pasos de ${formatMonthTitle(ym.y, ym.m)}`}
      />
      <PeriodSummary days={data.data ?? []} goal={goal} count={elapsed} />
    </Card>
  );
}

function CalendarView({ today, goal }: { today: LocalDate; goal: number }) {
  const [ym, setYm] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState<LocalDate | null>(null);
  const dates = monthDates(ym.y, ym.m);
  const first = dates[0] ?? today;
  const last = dates[dates.length - 1] ?? today;
  const data = useStepDays(first, last);
  const byDate = new Map((data.data ?? []).map((d) => [d.localDate, d] as const));
  const move = (delta: number) => setYm(({ y, m }) => ({ y: m + delta > 12 ? y + 1 : m + delta < 1 ? y - 1 : y, m: ((m + delta + 11) % 12) + 1 }));
  return (
    <Card>
      <MonthCalendar
        year={ym.y}
        month={ym.m}
        days={byDate}
        today={today}
        defaultGoal={goal}
        onPrev={() => move(-1)}
        onNext={() => move(1)}
        canNext={last < today}
        onSelectDay={setSelected}
      />
      <DayDetailSheet date={selected} day={selected ? (byDate.get(selected) ?? null) : null} defaultGoal={goal} onClose={() => setSelected(null)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  ringWrap: { alignItems: 'center', paddingVertical: spacing.sm },
  ringNumber: { maxWidth: 160 },
  stats: { flexDirection: 'row', gap: spacing.sm },
  period: { gap: spacing.md },
  summary: { flexDirection: 'row', gap: spacing.sm },
});
