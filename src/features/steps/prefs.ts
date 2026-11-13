import Storage from 'expo-sqlite/kv-store';

/**
 * Preferencias de pasos de ESTE móvil (qué permisos se han pedido y si
 * prefieres solo el sensor). Son ajustes del dispositivo, no datos tuyos,
 * así que no van en las tablas sincronizables.
 */
const KEYS = {
  setupDone: 'steps.setupDone',
  sensorOnly: 'steps.sensorOnly',
  fitnessAsked: 'steps.fitnessAsked',
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

/** Si ya se pidió a Salud el permiso de Fitness (energía, minutos y entrenos). */
export function getFitnessAsked(): boolean {
  return Storage.getItemSync(KEYS.fitnessAsked) === '1';
}

export function setFitnessAsked(): void {
  Storage.setItemSync(KEYS.fitnessAsked, '1');
}

/** Última vez que llegaron pasos de Salud por un Atajo (para mostrarlo en Perfil). */
export type LastHealthLink = { at: number; days: number; lastDate: string | null };

const LAST_LINK_KEY = 'steps.healthLink.last';

export function getLastHealthLink(): LastHealthLink | null {
  try {
    const raw = Storage.getItemSync(LAST_LINK_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { at, days, lastDate } = parsed as Record<string, unknown>;
    if (typeof at !== 'number' || typeof days !== 'number') return null;
    return { at, days, lastDate: typeof lastDate === 'string' ? lastDate : null };
  } catch {
    return null;
  }
}

export function setLastHealthLink(value: LastHealthLink): void {
  Storage.setItemSync(LAST_LINK_KEY, JSON.stringify(value));
}
