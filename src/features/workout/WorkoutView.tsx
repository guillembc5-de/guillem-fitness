import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, Stat, colors, spacing } from '@/design';
import { formatNumber, toDisplayWeight } from '@/domain/format';
import { supersetLetters } from '@/domain/supersets';
import type { WeightUnit } from '@/domain/types';
import { setNumbers, totalVolume } from '@/domain/workout';
import type { WorkoutDetail } from '@/domain/workoutTypes';

import { SET_TYPE_COLORS } from './components';
import { formatSetShort, formatWorkoutDuration } from './format';
import { setLabel } from './labels';
import { recordKindsText, type SessionRecord } from './sessionRecords';

/** Cifras principales de un entreno terminado. */
export function WorkoutStats({ workout, unit, recordCount }: { workout: WorkoutDetail; unit: WeightUnit; recordCount: number }) {
  const sets = workout.exercises.flatMap((e) => e.sets);
  const volume = toDisplayWeight(totalVolume(sets), unit);
  return (
    <Card style={styles.stats}>
      <Stat label="Duración" value={workout.endedAt ? formatWorkoutDuration(workout.startedAt, workout.endedAt) : '–'} />
      <Stat label="Volumen" value={formatNumber(volume)} unit={unit} />
      <Stat label="Series" value={String(sets.filter((s) => s.completedAt !== null).length)} />
      <Stat label="Récords" value={String(recordCount)} color={recordCount > 0 ? 'accentText' : 'text'} />
    </Card>
  );
}

export function RecordList({ records, unit, trackingOf }: { records: readonly SessionRecord[]; unit: WeightUnit; trackingOf: (name: string) => Parameters<typeof formatSetShort>[0] }) {
  if (records.length === 0) return null;
  return (
    <Card style={styles.records}>
      <AppText variant="overline" color="accentText">
        Récords personales
      </AppText>
      {records.map((r, i) => (
        <View key={i} style={styles.recordRow}>
          <Icon name="trophy" size={20} color="accentText" />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">
              {r.exerciseName} · {formatSetShort(trackingOf(r.exerciseName), r.set, unit)}
            </AppText>
            <AppText variant="caption" color="textSecondary">
              {recordKindsText(r.kinds)}
            </AppText>
          </View>
        </View>
      ))}
    </Card>
  );
}

/** Ejercicios y series de un entreno, solo lectura. */
export function WorkoutExercisesList({ workout, unit, records }: { workout: WorkoutDetail; unit: WeightUnit; records: readonly SessionRecord[] }) {
  const recordSetIds = new Set(records.map((r) => r.set.id));
  const letters = supersetLetters(workout.exercises);
  return (
    <>
      {workout.notes ? (
        <Card>
          <AppText variant="body" color="textSecondary">
            {workout.notes}
          </AppText>
        </Card>
      ) : null}
      {workout.exercises.map((we) => {
        const numbers = setNumbers(we.sets);
        const letter = we.supersetId ? letters.get(we.supersetId) : undefined;
        return (
          <Card key={we.id} style={[styles.exercise, letter ? styles.superset : null]}>
            {letter ? (
              <AppText variant="overline" color="info">
                Superserie {letter}
              </AppText>
            ) : null}
            <AppText variant="headline">{we.exerciseNameSnapshot}</AppText>
            {we.notes ? (
              <AppText variant="caption" color="textSecondary">
                {we.notes}
              </AppText>
            ) : null}
            {we.sets.map((s, i) => {
              const isRecord = recordSetIds.has(s.id);
              return (
                <View key={s.id} style={styles.setLine}>
                  <AppText variant="number" color={s.setType === 'normal' ? 'textSecondary' : SET_TYPE_COLORS[s.setType]} style={styles.setNum}>
                    {setLabel(s.setType, numbers[i] ?? 0)}
                  </AppText>
                  <AppText variant="number" style={styles.flex}>
                    {formatSetShort(we.trackingType, s, unit)}
                    {s.rpe !== null ? ` @ ${formatNumber(s.rpe, { maxDecimals: 1 })}` : ''}
                  </AppText>
                  {isRecord ? <Icon name="trophy" size={18} color="accentText" /> : null}
                </View>
              );
            })}
          </Card>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  records: { gap: spacing.sm, borderWidth: 1, borderColor: colors.accent },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  exercise: { gap: spacing.xxs },
  superset: { borderLeftWidth: 4, borderLeftColor: colors.info },
  setLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  setNum: { width: 24 },
});
