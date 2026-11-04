import { QueryClient } from '@tanstack/react-query';

/**
 * Caché entre pantallas y repositorios. Los datos son locales, así que:
 * - networkMode 'always': nunca se pausa por estar sin conexión.
 * - staleTime infinito: solo se recarga cuando una mutación invalida la clave.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { networkMode: 'always', staleTime: Infinity, retry: false },
    mutations: { networkMode: 'always', retry: false },
  },
});
