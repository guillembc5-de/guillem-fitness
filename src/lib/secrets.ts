import * as SecureStore from 'expo-secure-store';

import type { AiProvider } from '@/domain/types';

/**
 * Claves de API en el llavero del sistema (Keychain en iOS). Nunca en la base
 * de datos, en el código ni en git: una clave en el repositorio es una clave filtrada.
 */
const KEY_NAMES: Record<AiProvider, string> = {
  gemini: 'gf.apiKey.gemini',
  claude: 'gf.apiKey.claude',
};

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function getApiKey(provider: AiProvider): Promise<string | null> {
  return SecureStore.getItemAsync(KEY_NAMES[provider], OPTIONS);
}

export async function setApiKey(provider: AiProvider, key: string): Promise<void> {
  const trimmed = key.trim();
  if (trimmed === '') {
    await SecureStore.deleteItemAsync(KEY_NAMES[provider], OPTIONS);
    return;
  }
  await SecureStore.setItemAsync(KEY_NAMES[provider], trimmed, OPTIONS);
}

export async function deleteApiKey(provider: AiProvider): Promise<void> {
  await SecureStore.deleteItemAsync(KEY_NAMES[provider], OPTIONS);
}

/** "••••1234": se muestra en Perfil sin revelar la clave. */
export function maskKey(key: string): string {
  return `••••${key.slice(-4)}`;
}
