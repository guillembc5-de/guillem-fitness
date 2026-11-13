import { useQuery } from '@tanstack/react-query';

import { getRepositories } from '@/data/repositories';
import type { LocalDate } from '@/domain/localDay';

export const fitnessKeys = {
  all: ['fitness'] as const,
  days: (from: LocalDate, to: LocalDate) => ['fitness', 'days', from, to] as const,
  workouts: (from: LocalDate, to: LocalDate) => ['fitness', 'workouts', from, to] as const,
};

/** Anillos de Fitness (energía activa y minutos de ejercicio) por día. */
export function useActivityDays(from: LocalDate, to: LocalDate, enabled = true) {
  return useQuery({
    queryKey: fitnessKeys.days(from, to),
    queryFn: () => getRepositories().activity.range(from, to),
    enabled,
  });
}

/** Entrenos del Apple Watch (y otras apps) guardados en Salud. */
export function useExternalWorkouts(from: LocalDate, to: LocalDate, enabled = true) {
  return useQuery({
    queryKey: fitnessKeys.workouts(from, to),
    queryFn: () => getRepositories().activity.workouts(from, to),
    enabled,
  });
}
