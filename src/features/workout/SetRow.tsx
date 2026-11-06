import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Icon, colors, radii, spacing } from '@/design';
import type { TrackingType } from '@/domain/enums';
import { formatDuration, formatNumber, fromDisplayWeight, toDisplayWeight } from '@/domain/format';
import { parseDecimal, toInputText } from '@/domain/parseNumber';
import type { WeightUnit } from '@/domain/types';
import type { RecordKind } from '@/domain/workout';
import type { SetPatch, WorkoutSet } from '@/domain/workoutTypes';

import { SetBadge, SetCell } from './components';
import { formatSetShort } from './format';
import { hapticSetDone, hapticWarning } from './restTimer';

type Props = {
  set: WorkoutSet;
  number: number;
  tracking: TrackingType;
  unit: WeightUnit;
  previous: WorkoutSet | null;
  records: readonly RecordKind[];
  showRpe: boolean;
  onUpdate: (setId: string, patch: SetPatch) => void;
  onComplete: (setId: string, values: SetPatch) => void;
  onUncomplete: (setId: string) => void;
  onMenu: (set: WorkoutSet, number: number) => void;
  onRpe: (set: WorkoutSet) => void;
};

function weightText(kg: number | null, unit: WeightUnit): string {
  return kg === null ? '' : toInputText(toDisplayWeight(kg, unit), 2);
}

/**
 * Fila de una serie. Los valores se editan en local y se guardan al salir del
 * campo o al marcar la serie (que los guarda todos).
 */
function SetRowImpl({ set, number, tracking, unit, previous, records, showRpe, onUpdate, onComplete, onUncomplete, onMenu, onRpe }: Props) {
  const [weight, setWeight] = useState(() => weightText(set.weightKg, unit));
  const [reps, setReps] = useState(() => (set.reps !== null ? String(set.reps) : ''));
  const [duration, setDuration] = useState(() => (set.durationS !== null ? String(set.durationS) : ''));

  // Si un valor cambia en la base de datos (copiar «anterior», guardar), se
  // actualiza solo ese campo; los demás conservan lo que estés escribiendo.
  const [synced, setSynced] = useState({ w: set.weightKg, r: set.reps, d: set.durationS, unit });
  if (synced.w !== set.weightKg || synced.unit !== unit) {
    setSynced((s) => ({ ...s, w: set.weightKg, unit }));
    setWeight(weightText(set.weightKg, unit));
  }
  if (synced.r !== set.reps) {
    setSynced((s) => ({ ...s, r: set.reps }));
    setReps(set.reps !== null ? String(set.reps) : '');
  }
  if (synced.d !== set.durationS) {
    setSynced((s) => ({ ...s, d: set.durationS }));
    setDuration(set.durationS !== null ? String(set.durationS) : '');
  }

  const hasWeight = tracking === 'weight_reps' || tracking === 'added_weight_reps';
  const isDuration = tracking === 'duration';
  const done = set.completedAt !== null;

  const values = (): SetPatch => {
    const w = parseDecimal(weight);
    const r = parseDecimal(reps);
    const d = parseDecimal(duration);
    return {
      weightKg: hasWeight ? (w !== null ? fromDisplayWeight(w, unit) : null) : null,
      reps: isDuration ? null : r !== null ? Math.round(r) : null,
      durationS: isDuration ? (d !== null ? Math.round(d) : null) : null,
    };
  };

  const commit = () => {
    const v = values();
    if (v.weightKg !== set.weightKg || v.reps !== set.reps || v.durationS !== set.durationS) onUpdate(set.id, v);
  };

  const copyPrevious = () => {
    if (!previous) return;
    onUpdate(set.id, { weightKg: previous.weightKg, reps: previous.reps, durationS: previous.durationS });
  };

  const toggle = () => {
    if (done) {
      onUncomplete(set.id);
      return;
    }
    let v = values();
    const missing = isDuration ? v.durationS === null : v.reps === null;
    if (missing && previous) v = { weightKg: previous.weightKg, reps: previous.reps, durationS: previous.durationS };
    if (isDuration ? v.durationS === null : v.reps === null) {
      hapticWarning();
      return;
    }
    if (hasWeight && v.weightKg === null && tracking === 'weight_reps') v = { ...v, weightKg: 0 };
    onComplete(set.id, v);
  };

  const isRecord = done && records.length > 0;

  return (
    <View style={[styles.row, done ? styles.rowDone : null]}>
      <View style={styles.colSet}>
        <SetBadge setType={set.setType} number={number} onPress={() => onMenu(set, number)} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previous ? `Anterior: ${formatSetShort(tracking, previous, unit)}. Toca para copiar` : 'Sin datos anteriores'}
        disabled={!previous}
        onPress={copyPrevious}
        style={styles.colPrev}
      >
        <AppText variant="caption" color="textSecondary" numberOfLines={1} align="center">
          {previous ? formatSetShort(tracking, previous, unit) : '–'}
        </AppText>
      </Pressable>
      {hasWeight ? (
        <SetCell
          accessibilityLabel={`Peso serie ${number}`}
          value={weight}
          onChangeText={setWeight}
          onEndEditing={commit}
          maxDecimals={2}
          placeholder={previous?.weightKg !== null && previous?.weightKg !== undefined ? weightText(previous.weightKg, unit) : '–'}
        />
      ) : null}
      {isDuration ? (
        <>
          <SetCell accessibilityLabel={`Segundos serie ${number}`} value={duration} onChangeText={setDuration} onEndEditing={commit} maxDecimals={0} placeholder="seg" />
          {!done ? (
            <InlineTimer
              onStop={(seconds) => {
                setDuration(String(seconds));
                onUpdate(set.id, { durationS: seconds });
              }}
            />
          ) : null}
        </>
      ) : (
        <SetCell
          accessibilityLabel={`Repeticiones serie ${number}`}
          value={reps}
          onChangeText={setReps}
          onEndEditing={commit}
          maxDecimals={0}
          placeholder={previous?.reps !== null && previous?.reps !== undefined ? String(previous.reps) : '–'}
        />
      )}
      {showRpe ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={set.rpe !== null ? `RPE ${formatNumber(set.rpe, { maxDecimals: 1 })}. Toca para cambiar` : 'Añadir RPE'}
          onPress={() => onRpe(set)}
          style={styles.colRpe}
        >
          <AppText variant="number" color={set.rpe !== null ? 'text' : 'textTertiary'} align="center">
            {set.rpe !== null ? formatNumber(set.rpe, { maxDecimals: 1 }) : '–'}
          </AppText>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={done ? `Serie ${number} hecha${isRecord ? ', récord personal' : ''}. Toca para desmarcar` : `Marcar serie ${number} como hecha`}
        onPress={toggle}
        style={[styles.check, done ? (isRecord ? styles.checkRecord : styles.checkDone) : null]}
        hitSlop={4}
      >
        {isRecord ? <Icon name="trophy" size={24} color="onAccent" /> : <Icon name="checkmark" size={28} color={done ? 'onAccent' : 'textSecondary'} />}
      </Pressable>
    </View>
  );
}

export const SetRow = memo(SetRowImpl);

/** Cronómetro de la serie (plancha, isométricos): al pararlo rellena los segundos. */
function InlineTimer({ onStop }: { onStop: (seconds: number) => void }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (interval.current) clearInterval(interval.current);
    },
    [],
  );

  const toggle = () => {
    if (startedAt === null) {
      const t = Date.now();
      setStartedAt(t);
      setNow(t);
      interval.current = setInterval(() => setNow(Date.now()), 250);
      hapticSetDone();
      return;
    }
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setStartedAt(null);
    hapticSetDone();
    onStop(seconds);
  };

  const running = startedAt !== null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={running ? `Cronómetro en marcha, ${Math.floor((now - startedAt) / 1000)} segundos. Toca para parar` : 'Empezar cronómetro'}
      onPress={toggle}
      style={[styles.timer, running ? styles.timerRunning : null]}
    >
      {running ? (
        <AppText variant="caption" color="onAccent" style={styles.tabular}>
          {formatDuration(Math.floor((now - startedAt) / 1000))}
        </AppText>
      ) : (
        <Icon name="stopwatch-outline" size={22} color="textSecondary" />
      )}
    </Pressable>
  );
}

export function SetHeader({ tracking, unit, showRpe }: { tracking: TrackingType; unit: WeightUnit; showRpe: boolean }) {
  const hasWeight = tracking === 'weight_reps' || tracking === 'added_weight_reps';
  const unitLabel = unit.toUpperCase();
  return (
    <View style={styles.header}>
      <AppText variant="overline" color="textSecondary" align="center" style={styles.colSet}>
        Serie
      </AppText>
      <AppText variant="overline" color="textSecondary" align="center" style={styles.colPrev}>
        Anterior
      </AppText>
      {hasWeight ? (
        <AppText variant="overline" color="textSecondary" align="center" style={styles.flex}>
          {tracking === 'added_weight_reps' ? `+${unitLabel}` : unitLabel}
        </AppText>
      ) : null}
      <AppText variant="overline" color="textSecondary" align="center" style={styles.flex}>
        {tracking === 'duration' ? 'Seg' : 'Reps'}
      </AppText>
      {tracking === 'duration' ? <View style={styles.timerSpace} /> : null}
      {showRpe ? (
        <AppText variant="overline" color="textSecondary" align="center" style={styles.colRpe}>
          RPE
        </AppText>
      ) : null}
      <View style={styles.checkSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 64,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.sm,
  },
  rowDone: { backgroundColor: colors.successSoft },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  colSet: { width: 44, alignItems: 'center' },
  colPrev: { flex: 1.3, minHeight: 44, justifyContent: 'center' },
  colRpe: { width: 44, minHeight: 44, justifyContent: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  timer: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised },
  timerRunning: { backgroundColor: colors.accent },
  timerSpace: { width: 44 },
  check: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.success },
  // Récord: el rojo se reserva para esto (y la acción principal).
  checkRecord: { backgroundColor: colors.accent },
  checkSpace: { width: 56 },
});
