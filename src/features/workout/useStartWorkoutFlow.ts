import { router } from 'expo-router';
import { Alert } from 'react-native';

import { getRepositories } from '@/data/repositories';
import { useProfile } from '@/features/profile/queries';

import { useDeleteWorkout, useRepeatWorkout, useStartWorkout } from './queries';
import { cancelRestNotification, ensureNotificationPermission } from './restTimer';
import { getWorkoutSettings } from './settings';

/**
 * Empezar un entreno desde cualquier sitio (rutina, vacío o repitiendo uno anterior):
 * - si ya hay uno en curso, pregunta si reanudarlo o descartarlo;
 * - pide permiso de notificaciones la primera vez (para avisar del fin del descanso);
 * - abre el entreno activo.
 */
export function useStartWorkoutFlow() {
  const profile = useProfile();
  const start = useStartWorkout();
  const repeat = useRepeatWorkout();
  const discard = useDeleteWorkout();

  const guard = async (launch: () => Promise<unknown>) => {
    const go = async () => {
      await ensureNotificationPermission();
      await launch();
      router.push('/entreno-activo');
    };
    const active = await getRepositories().workouts.getActive();
    if (!active) {
      await go();
      return;
    }
    Alert.alert('Ya tienes un entreno en curso', `«${active.name}» sigue abierto.`, [
      { text: 'Reanudar ese', onPress: () => router.push('/entreno-activo') },
      {
        text: 'Descartarlo y empezar',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await cancelRestNotification(active.restNotificationId);
            await discard.mutateAsync(active.id);
            await go();
          })();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const startWorkout = (routineId: string | null, name: string) =>
    guard(() =>
      start.mutateAsync({
        routineId,
        name,
        defaultRestSeconds: profile.data?.defaultRestSeconds ?? 150,
        previousFrom: getWorkoutSettings().previousFrom,
      }),
    );

  /** Empieza un entreno nuevo con los mismos ejercicios y pesos que uno anterior. */
  const repeatWorkout = (workoutId: string) => guard(() => repeat.mutateAsync(workoutId));

  return { startWorkout, repeatWorkout, starting: start.isPending || repeat.isPending };
}
