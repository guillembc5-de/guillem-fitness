import Storage from 'expo-sqlite/kv-store';
import { z } from 'zod';
import { create } from 'zustand';

import { DEFAULT_BAR_KG, DEFAULT_PLATES_KG } from '@/domain/plates';

/**
 * Ajustes del registro de entrenos (como los de Hevy). Son preferencias de
 * este móvil, así que se guardan aparte de tus datos.
 */
const SettingsSchema = z.object({
  /** Columna RPE en cada serie. */
  rpe: z.boolean(),
  /** Pantalla encendida durante el entreno. */
  keepAwake: z.boolean(),
  /** «Anterior»: la última vez en cualquier entreno o solo en la misma rutina. */
  previousFrom: z.enum(['any', 'routine']),
  /** Aviso y vibración al batir un récord. */
  prAlerts: z.boolean(),
  /** Calculadora de discos. */
  barKg: z.number().positive(),
  plates: z.array(z.number().positive()).min(1),
});

export type WorkoutSettings = z.infer<typeof SettingsSchema>;

export const DEFAULT_WORKOUT_SETTINGS: WorkoutSettings = {
  rpe: false,
  keepAwake: true,
  previousFrom: 'any',
  prAlerts: true,
  barKg: DEFAULT_BAR_KG,
  plates: [...DEFAULT_PLATES_KG],
};

const KEY = 'workout.settings';

function read(): WorkoutSettings {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return DEFAULT_WORKOUT_SETTINGS;
    const parsed = SettingsSchema.partial().safeParse(JSON.parse(raw));
    return parsed.success ? { ...DEFAULT_WORKOUT_SETTINGS, ...parsed.data } : DEFAULT_WORKOUT_SETTINGS;
  } catch {
    return DEFAULT_WORKOUT_SETTINGS;
  }
}

type Store = WorkoutSettings & { update: (patch: Partial<WorkoutSettings>) => void };

export const useWorkoutSettings = create<Store>((set, get) => ({
  ...read(),
  update: (patch) => {
    set(patch);
    const { update: _update, ...current } = get();
    Storage.setItemSync(KEY, JSON.stringify(current));
  },
}));

export function getWorkoutSettings(): WorkoutSettings {
  const { update: _update, ...current } = useWorkoutSettings.getState();
  return current;
}
