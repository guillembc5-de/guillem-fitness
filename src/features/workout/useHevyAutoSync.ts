import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { autoSyncHevy } from './hevySync';

/**
 * Con Hevy Pro (clave guardada en Perfil → Hevy), cada vez que abres la app o
 * vuelves a ella entran solos los entrenos nuevos de Hevy. Sin clave no hace
 * nada. Como mucho una vez cada 15 minutos.
 */
export function useHevyAutoSync(): void {
  const client = useQueryClient();
  useEffect(() => {
    const run = () =>
      void autoSyncHevy().then((r) => {
        if (r && r.inserted + r.updated > 0) void client.invalidateQueries();
      });
    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, [client]);
}
