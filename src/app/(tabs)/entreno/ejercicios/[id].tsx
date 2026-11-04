import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  LineChart,
  LoadingState,
  Screen,
  SectionHeader,
  SegmentedControl,
  showActionSheet,
  spacing,
} from '@/design';
import { formatDuration, formatNumber, formatWeight, toDisplayWeight } from '@/domain/format';
import { epley1RM, isWorkingSet, sessionPoints, type SessionPoint } from '@/domain/workout';
import type { ExerciseHistorySet } from '@/domain/workoutTypes';
import { useProfile } from '@/features/profile/queries';
import { REST_CHOICES } from '@/features/workout/components';
import { formatSetShort, formatShortDate, formatWorkoutDate } from '@/features/workout/format';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '@/features/workout/labels';
import { useDeleteExercise, useExercise, useExerciseHistory, useSetExerciseRest } from '@/features/workout/queries';
import { useNow } from '@/lib/useNow';

type Metric = 'maxWeight' | 'best1RM' | 'volume';
type Range = '3m' | '1y' | 'all';

const METRICS = [
  { value: 'maxWeight' as const, label: 'Peso máx.' },
  { value: 'best1RM' as const, label: '1RM' },
  { value: 'volume' as const, label: 'Volumen' },
];
const RANGES = [
  { value: '3m' as const, label: '3 meses' },
  { value: '1y' as const, label: '1 año' },
  { value: 'all' as const, label: 'Todo' },
];
const RANGE_MS: Record<Range, number> = { '3m': 92 * 86_400_000, '1y': 366 * 86_400_000, all: Infinity };

const HISTORY_PAGE = 20;

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(id);
  const history = useExerciseHistory(id);
  const profile = useProfile();
  const unit = profile.data?.weightUnit ?? 'kg';
  const setRest = useSetExerciseRest();
  const remove = useDeleteExercise();
  const [metric, setMetric] = useState<Metric>('maxWeight');
  const [range, setRange] = useState<Range>('3m');
  const [shown, setShown] = useState(HISTORY_PAGE);
  const nowMs = useNow(60_000);

  const sets = useMemo(() => history.data ?? [], [history.data]);
  const points = useMemo(() => sessionPoints(sets), [sets]);
  const records = useMemo(() => bestRecords(sets), [sets]);
  const sessions = useMemo(() => groupSessions(sets), [sets]);

  if (exercise.isPending || history.isPending) return <LoadingState />;
  const ex = exercise.data;
  if (!ex) return <ErrorState message="Este ejercicio no existe." />;
  if (history.isError) return <ErrorState message={history.error.message} onRetry={() => void history.refetch()} />;

  const cutoff = nowMs - RANGE_MS[range];
  const visible = points.filter((p) => p.startedAt >= cutoff);
  const chartPoints = visible.map((p) => ({ x: p.startedAt, y: metricValue(p, metric, unit) }));
  const isWeighted = ex.trackingType === 'weight_reps' || ex.trackingType === 'added_weight_reps';

  const openMenu = () =>
    showActionSheet(ex.name, [
      {
        label: `Descanso por defecto: ${ex.defaultRestSeconds ? formatDuration(ex.defaultRestSeconds) : 'el del perfil'}`,
        onPress: () =>
          showActionSheet('Descanso por defecto', [
            { label: 'El de tu perfil', selected: ex.defaultRestSeconds === null, onPress: () => setRest.mutate({ id: ex.id, seconds: null }) },
            ...REST_CHOICES.map((s) => ({
              label: formatDuration(s),
              selected: ex.defaultRestSeconds === s,
              onPress: () => setRest.mutate({ id: ex.id, seconds: s }),
            })),
          ]),
      },
      ...(ex.isCustom ? [{ label: 'Editar ejercicio', onPress: () => router.push({ pathname: '/ejercicio-editor', params: { id: ex.id } }) }] : []),
      ...(ex.deletedAt === null
        ? [
            {
              label: 'Borrar ejercicio',
              destructive: true,
              onPress: () =>
                Alert.alert(
                  '¿Borrar el ejercicio?',
                  'Desaparecerá de la biblioteca y de tus rutinas. Tus entrenos pasados, gráficas y récords se conservan.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Borrar', style: 'destructive', onPress: () => remove.mutate(ex.id, { onSuccess: () => router.back() }) },
                  ],
                ),
            },
          ]
        : []),
    ]);

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Opciones del ejercicio" onPress={openMenu} style={styles.iconButton}>
              <Icon name="ellipsis-horizontal" />
            </Pressable>
          ),
        }}
      />
      <View style={styles.title}>
        <AppText variant="title">{ex.name}</AppText>
        <AppText variant="body" color="textSecondary">
          {MUSCLE_LABELS[ex.muscleGroup]} · {EQUIPMENT_LABELS[ex.equipment]}
          {ex.deletedAt !== null ? ' · Borrado (solo historial)' : ''}
        </AppText>
      </View>

      {points.length === 0 ? (
        <EmptyState icon="stats-chart-outline" title="Aún sin historial" message="Cuando completes series de este ejercicio verás aquí tu progreso." />
      ) : (
        <>
          {isWeighted ? (
            <Card style={styles.records}>
              <AppText variant="overline" color="textSecondary">
                Récords personales
              </AppText>
              <View style={styles.recordGrid}>
                <Record label="Peso máximo" value={records.maxWeight ? formatWeight(records.maxWeight.weightKg ?? 0, unit) : '–'} detail={records.maxWeight} />
                <Record
                  label="1RM estimado"
                  value={records.best1RM ? formatWeight(epley1RM(records.best1RM.weightKg ?? 0, records.best1RM.reps ?? 0), unit) : '–'}
                  detail={records.best1RM}
                />
                <Record
                  label="Mejor serie"
                  value={records.bestVolume ? formatSetShort(ex.trackingType, records.bestVolume, unit) : '–'}
                  detail={records.bestVolume}
                />
                <Record label="Más reps" value={records.maxReps ? `${records.maxReps.reps ?? 0} reps` : '–'} detail={records.maxReps} />
              </View>
            </Card>
          ) : null}

          {isWeighted ? (
            <Card style={styles.chartCard}>
              <SegmentedControl accessibilityLabel="Métrica" options={METRICS} value={metric} onChange={setMetric} />
              {chartPoints.length > 0 ? (
                <LineChart
                  points={chartPoints}
                  formatX={(x) => formatShortDate(x)}
                  formatY={(y) => (metric === 'volume' ? `${formatNumber(y)} ${unit}` : `${formatNumber(y, { maxDecimals: 1 })} ${unit}`)}
                  accessibilityLabel={`Gráfica de ${METRICS.find((m) => m.value === metric)?.label ?? ''}, ${chartPoints.length} entrenos`}
                />
              ) : (
                <AppText variant="body" color="textSecondary" align="center" style={styles.noData}>
                  Sin entrenos en este periodo.
                </AppText>
              )}
              <SegmentedControl accessibilityLabel="Periodo" options={RANGES} value={range} onChange={setRange} />
            </Card>
          ) : null}

          <SectionHeader title={`Historial (${sessions.length} entrenos)`} />
          {sessions.slice(0, shown).map((s) => (
            <Card key={s.workoutId} style={styles.session}>
              <View style={styles.sessionHeader}>
                <AppText variant="bodyStrong">{s.workoutName}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {formatWorkoutDate(s.startedAt)}
                </AppText>
              </View>
              {s.sets.map((set, i) => (
                <View key={i} style={styles.setLine}>
                  <AppText variant="number" color={set.setType === 'warmup' ? 'warmup' : 'textSecondary'} style={styles.setNum}>
                    {set.setType === 'warmup' ? 'W' : String(i + 1 - s.sets.slice(0, i).filter((x) => x.setType === 'warmup').length)}
                  </AppText>
                  <AppText variant="number">{formatSetShort(ex.trackingType, set, unit)}</AppText>
                </View>
              ))}
            </Card>
          ))}
          {sessions.length > shown ? (
            <Button title="Ver más" variant="secondary" onPress={() => setShown((n) => n + HISTORY_PAGE)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Record({ label, value, detail }: { label: string; value: string; detail: ExerciseHistorySet | null }) {
  return (
    <View style={styles.record} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText variant="headline" color="accentText" style={styles.tabular}>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="caption" color="textTertiary">
          {formatShortDate(detail.startedAt)}
        </AppText>
      ) : null}
    </View>
  );
}

function metricValue(p: SessionPoint, metric: Metric, unit: 'kg' | 'lb'): number {
  return toDisplayWeight(p[metric], unit);
}

type Records = {
  maxWeight: ExerciseHistorySet | null;
  best1RM: ExerciseHistorySet | null;
  bestVolume: ExerciseHistorySet | null;
  maxReps: ExerciseHistorySet | null;
};

/** La serie concreta de cada récord (para mostrar cuándo fue). */
function bestRecords(sets: readonly ExerciseHistorySet[]): Records {
  const r: Records = { maxWeight: null, best1RM: null, bestVolume: null, maxReps: null };
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const w = s.weightKg ?? 0;
    const reps = s.reps ?? 0;
    if (w > 0 && (!r.maxWeight || w > (r.maxWeight.weightKg ?? 0))) r.maxWeight = s;
    if (w > 0 && (!r.best1RM || epley1RM(w, reps) > epley1RM(r.best1RM.weightKg ?? 0, r.best1RM.reps ?? 0))) r.best1RM = s;
    if (w > 0 && (!r.bestVolume || w * reps > (r.bestVolume.weightKg ?? 0) * (r.bestVolume.reps ?? 0))) r.bestVolume = s;
    if (!r.maxReps || reps > (r.maxReps.reps ?? 0)) r.maxReps = s;
  }
  return r;
}

type Session = { workoutId: string; workoutName: string; startedAt: number; sets: ExerciseHistorySet[] };

function groupSessions(sets: readonly ExerciseHistorySet[]): Session[] {
  const map = new Map<string, Session>();
  for (const s of sets) {
    const session = map.get(s.workoutId) ?? { workoutId: s.workoutId, workoutName: s.workoutName, startedAt: s.startedAt, sets: [] };
    session.sets.push(s);
    map.set(s.workoutId, session);
  }
  return [...map.values()];
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { gap: spacing.xxs },
  records: { gap: spacing.sm },
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  record: { width: '50%', gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  chartCard: { gap: spacing.md },
  noData: { paddingVertical: spacing.xl },
  session: { gap: spacing.xxs },
  sessionHeader: { gap: 2, marginBottom: spacing.xxs },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 24 },
  setNum: { width: 24 },
});
