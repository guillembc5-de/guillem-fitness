import { randomUUID } from 'expo-crypto';

/** UUID v4 para cualquier entidad nueva. */
export function newId(): string {
  return randomUUID();
}

/** Reloj único de la app (facilita los tests). */
export function now(): number {
  return Date.now();
}
