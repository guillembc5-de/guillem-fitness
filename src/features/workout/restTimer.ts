import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Temporizador de descanso.
 * - El fin del descanso se guarda como marca de tiempo (workout.restEndsAt):
 *   la cuenta atrás se calcula con `fin − ahora`, así que no se para en
 *   segundo plano ni al cerrar la app.
 * - Al empezar el descanso se programa una notificación local para ese
 *   instante: avisa con sonido y vibración aunque el móvil esté bloqueado.
 */

const CHANNEL_ID = 'rest-timer';

let configured = false;

export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: false,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Descanso entre series',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 400, 200, 400],
      sound: 'default',
    });
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermission(): Promise<PermissionState> {
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

/** Pide permiso solo si aún no se ha preguntado. */
export async function ensureNotificationPermission(): Promise<PermissionState> {
  const current = await getNotificationPermission();
  if (current !== 'undetermined') return current;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted ? 'granted' : 'denied';
}

/** Programa el aviso de fin de descanso. Devuelve su id, o null si no hay permiso. */
export async function scheduleRestEnd(endsAt: number, nextExercise: string): Promise<string | null> {
  try {
    if ((await getNotificationPermission()) !== 'granted') return null;
    if (endsAt <= Date.now()) return null;
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Descanso terminado',
        body: `A por la siguiente serie: ${nextExercise}`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt, channelId: CHANNEL_ID },
    });
  } catch {
    // Sin notificación el temporizador sigue funcionando dentro de la app.
    return null;
  }
}

export async function cancelRestNotification(id: string | null): Promise<void> {
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Ya disparada o inexistente: nada que hacer.
  }
}

export function hapticRestDone(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticSetDone(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Récord personal: doble vibración de éxito. */
export function hapticRecord(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 250);
}

export function hapticWarning(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Segundos que quedan de descanso (0 si ya terminó). */
export function restRemainingSeconds(restEndsAt: number | null, nowMs: number): number {
  if (restEndsAt === null) return 0;
  return Math.max(0, Math.ceil((restEndsAt - nowMs) / 1000));
}
