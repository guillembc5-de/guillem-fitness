import type { IconName } from '@/design';

/**
 * Nombre e icono de los tipos de entreno de Salud (HKWorkoutActivityType)
 * más habituales. El resto se muestra como «Entreno».
 */
const TYPES: Record<number, { label: string; icon: IconName }> = {
  11: { label: 'Entrenamiento cruzado', icon: 'barbell-outline' },
  13: { label: 'Bicicleta', icon: 'bicycle-outline' },
  16: { label: 'Elíptica', icon: 'fitness-outline' },
  20: { label: 'Fuerza funcional', icon: 'barbell-outline' },
  24: { label: 'Senderismo', icon: 'trail-sign-outline' },
  33: { label: 'Recuperación', icon: 'leaf-outline' },
  35: { label: 'Remo', icon: 'boat-outline' },
  37: { label: 'Correr', icon: 'walk-outline' },
  41: { label: 'Fútbol', icon: 'football-outline' },
  44: { label: 'Escaleras', icon: 'trending-up-outline' },
  46: { label: 'Natación', icon: 'water-outline' },
  48: { label: 'Tenis', icon: 'tennisball-outline' },
  50: { label: 'Fuerza tradicional', icon: 'barbell-outline' },
  52: { label: 'Caminar', icon: 'walk-outline' },
  57: { label: 'Yoga', icon: 'body-outline' },
  59: { label: 'Core', icon: 'body-outline' },
  62: { label: 'Flexibilidad', icon: 'body-outline' },
  63: { label: 'HIIT', icon: 'flash-outline' },
  64: { label: 'Comba', icon: 'fitness-outline' },
  66: { label: 'Pilates', icon: 'body-outline' },
  73: { label: 'Cardio mixto', icon: 'heart-outline' },
  79: { label: 'Pickleball', icon: 'tennisball-outline' },
  80: { label: 'Enfriamiento', icon: 'snow-outline' },
};

export function workoutTypeLabel(type: number): string {
  return TYPES[type]?.label ?? 'Entreno';
}

export function workoutTypeIcon(type: number): IconName {
  return TYPES[type]?.icon ?? 'stopwatch-outline';
}
