import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getRepositories } from '@/data/repositories';
import { addDays, type LocalDate } from '@/domain/localDay';

import { setupSensorOnly, setupWithHealth, syncSteps } from './stepsService';

export const stepKeys = {
  sync: ['stepsSync'] as const,
  range: (from: LocalDate, to: LocalDate) => ['stepDays', from, to] as const,
  all: ['stepDays'] as const,
};

/**
 * Sincroniza los pasos al montarse y, con `live`, cada minuto mientras la
 * pantalla está abierta. Después refresca todas las consultas de pasos.
 */
export function useStepsSync(active: boolean, live = false) {
  const client = useQueryClient();
  return useQuery({
    queryKey: stepKeys.sync,
    queryFn: async () => {
      const status = await syncSteps();
      void client.invalidateQueries({ queryKey: stepKeys.all });
      return status;
    },
    enabled: active,
    staleTime: 30_000,
    refetchInterval: active && live ? 60_000 : false,
    refetchOnMount: 'always',
  });
}

export function useStepDays(from: LocalDate, to: LocalDate) {
  return useQuery({
    queryKey: stepKeys.range(from, to),
    queryFn: () => getRepositories().stepDays.range(from, to),
  });
}

/** Últimos ~400 días, para la racha. */
export function useRecentStepDays(today: LocalDate) {
  return useStepDays(addDays(today, -400), today);
}

export function useStepsSetup() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (mode: 'health' | 'sensor') => (mode === 'health' ? setupWithHealth() : setupSensorOnly()),
    onSuccess: () => client.invalidateQueries({ queryKey: stepKeys.sync }),
  });
}
