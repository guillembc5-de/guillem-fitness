import { useEffect, useState } from 'react';

/**
 * Hora actual que se refresca cada `intervalMs`. Solo sirve para repintar:
 * los tiempos se calculan siempre con marcas de tiempo, nunca contando ticks.
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return nowMs;
}
