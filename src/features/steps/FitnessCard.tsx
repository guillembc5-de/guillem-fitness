import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, Stat, spacing } from '@/design';
import type { ActivityDay, ExternalWorkout } from '@/domain/fitnessTypes';
import { formatDuration, formatNumber } from '@/domain/format';
import type { LocalDate } from '@/domain/localDay';

import { workoutTypeIcon, workoutTypeLabel } from './fitnessLabels';
import { useActivityDays, useExternalWorkouts } from './fitnessQueries';

function minutesText(seconds: number): string {
  return seconds >= 3600 ? formatDuration(seconds) : `${formatNumber(Math.round(seconds / 60))} min`;
}

/** Un entreno del Watch: tipo, hora, duración, kcal y distancia. */
export function ExternalWorkoutRow({ workout: w }: { workout: ExternalWorkout }) {
  const time = new Date(w.startedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const details = [
    minutesText(w.durationS),
    w.kcal !== null ? `${formatNumber(w.kcal)} kcal` : null,
    w.distanceM !== null ? `${formatNumber(w.distanceM / 1000, { maxDecimals: 2 })} km` : null,
  ].filter((p): p is string => p !== null);
  return (
    <View style={styles.workout} accessible accessibilityLabel={`${workoutTypeLabel(w.activityType)} a las ${time}: ${details.join(', ')}`}>
      <Icon name={workoutTypeIcon(w.activityType)} color="info" />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{workoutTypeLabel(w.activityType)}</AppText>
        <AppText variant="caption" color="textSecondary">
          {time} · {details.join(' · ')}
          {w.sourceName ? ` · ${w.sourceName}` : ''}
        </AppText>
      </View>
    </View>
  );
}

/** Contenido de Fitness de un día (sirve en la tarjeta y en el detalle del calendario). */
export function FitnessDetails({ day, workouts }: { day: ActivityDay | null; workouts: readonly ExternalWorkout[] }) {
  return (
    <>
      {day ? (
        <View style={styles.stats}>
          <Stat label="Energía activa" value={day.activeKcal !== null ? formatNumber(day.activeKcal) : '—'} unit="kcal" color="accentText" />
          <Stat label="Ejercicio" value={day.exerciseMin !== null ? formatNumber(day.exerciseMin) : '—'} unit="min" color="success" />
        </View>
      ) : null}
      {workouts.map((w) => (
        <ExternalWorkoutRow key={w.id} workout={w} />
      ))}
    </>
  );
}

/**
 * Anillos de Fitness y entrenos del Watch de un día. Si aún no llega nada,
 * explica cómo traerlos (Atajo o Salud directo).
 */
export function FitnessCard({ date }: { date: LocalDate }) {
  const days = useActivityDays(date, date);
  const workouts = useExternalWorkouts(date, date);
  const day = days.data?.[0] ?? null;
  const list = workouts.data ?? [];

  if (!days.data || !workouts.data) return null;

  if (!day && list.length === 0) {
    return (
      <Pressable accessibilityRole="button" onPress={() => router.push('/perfil/salud')}>
        <Card style={styles.empty}>
          <Icon name="fitness-outline" color="textSecondary" />
          <AppText variant="body" color="textSecondary" style={styles.flex}>
            Trae de Fitness tu energía activa y tus minutos de ejercicio (Perfil → Salud con Atajos).
          </AppText>
          <Icon name="chevron-forward" size={18} color="textTertiary" />
        </Card>
      </Pressable>
    );
  }

  return (
    <Card style={styles.card}>
      <AppText variant="overline" color="textSecondary">
        Fitness
      </AppText>
      <FitnessDetails day={day} workouts={list} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.md },
  workout: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
});
