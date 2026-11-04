import { router } from 'expo-router';
import { Alert } from 'react-native';

import { getRepositories } from '@/data/repositories';
import { useProfile } from '@/features/profile/queries';

import { useDeleteWorkout, useStartWorkout } from './queries';
import { cancelRestNotification, ensureNotificationPermission } from './restTimer';

/**
 * Empezar un entreno desde cualquier sitio:
 * - si ya hay uno en curso, pregunta si reanudarlo o descartarlo;
 * - pide permiso de notificaciones la primera vez (para avisar del fin del descanso);
 * - abre el entreno activo.
 */
export function useStartWorkoutFlow() {
  const profile = useProfile();
  const start = useStartWorkout();
  const discard = useDeleteWorkout();

  const launch = async (routineId: string | null, name: string) => {
    await ensureNotificationPermission();
    await start.mutateAsync({ routineId, name, defaultRestSeconds: profile.data?.defaultRestSeconds ?? 150 });
    router.push('/entreno-activo');
  };

  const startWorkout = async (routineId: string | null, name: string) => {
    const active = await getRepositories().workouts.getActive();
    if (!active) {
      await launch(routineId, name);
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
            await launch(routineId, name);
          })();
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return { startWorkout, starting: start.isPending };
}
