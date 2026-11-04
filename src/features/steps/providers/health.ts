// Versión por defecto (web y tipos). En iPhone Metro usa health.ios.ts y en
// Android health.android.ts.
import type { StepsProvider } from './types';

export const healthProvider: StepsProvider | null = null;

export const HEALTH_APP_NAME = 'Salud';

export function openHealthSettings(): void {
  // Sin app de salud en esta plataforma.
}
