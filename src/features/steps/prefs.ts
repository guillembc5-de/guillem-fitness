import Storage from 'expo-sqlite/kv-store';

/**
 * Preferencias de pasos de ESTE móvil (qué permisos se han pedido y si
 * prefieres solo el sensor). Son ajustes del dispositivo, no datos tuyos,
 * así que no van en las tablas sincronizables.
 */
const KEYS = {
  setupDone: 'steps.setupDone',
  sensorOnly: 'steps.sensorOnly',
} as const;

export type StepPrefs = { setupDone: boolean; sensorOnly: boolean };

export function getStepPrefs(): StepPrefs {
  return {
    setupDone: Storage.getItemSync(KEYS.setupDone) === '1',
    sensorOnly: Storage.getItemSync(KEYS.sensorOnly) === '1',
  };
}

export function setStepPrefs(prefs: Partial<StepPrefs>): void {
  if (prefs.setupDone !== undefined) Storage.setItemSync(KEYS.setupDone, prefs.setupDone ? '1' : '0');
  if (prefs.sensorOnly !== undefined) Storage.setItemSync(KEYS.sensorOnly, prefs.sensorOnly ? '1' : '0');
}
