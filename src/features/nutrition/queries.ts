import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { getRepositories } from '@/data/repositories';
import type { LocalDate } from '@/domain/localDay';
import type { LearnEntry } from '@/domain/foodMemory';
import type { MealDraft, PendingPhotoInput } from '@/domain/nutritionTypes';

export const nutritionKeys = {
  day: (date: LocalDate) => ['meals', date] as const,
  meal: (id: string) => ['meal', id] as const,
  summaries: (from: LocalDate, to: LocalDate) => ['mealSummaries', from, to] as const,
  recent: ['recentFoods'] as const,
  pending: ['pendingPhotos'] as const,
  memory: ['foodMemory'] as const,
};

const repos = () => getRepositories();

export function useMealsByDate(date: LocalDate) {
  return useQuery({ queryKey: nutritionKeys.day(date), queryFn: () => repos().meals.byDate(date) });
}

export function useMeal(id: string | null) {
  return useQuery({
    queryKey: nutritionKeys.meal(id ?? ''),
    queryFn: () => (id ? repos().meals.get(id) : Promise.resolve(null)),
    enabled: id !== null,
  });
}

export function useDaySummaries(from: LocalDate, to: LocalDate) {
  return useQuery({ queryKey: nutritionKeys.summaries(from, to), queryFn: () => repos().meals.daySummaries(from, to) });
}

export function useRecentFoods() {
  return useQuery({ queryKey: nutritionKeys.recent, queryFn: () => repos().meals.recentFoods(12) });
}

export function usePendingPhotos() {
  return useQuery({ queryKey: nutritionKeys.pending, queryFn: () => repos().pendingPhotos.list() });
}

function invalidateMeals(client: QueryClient) {
  void client.invalidateQueries({ queryKey: ['meals'] });
  void client.invalidateQueries({ queryKey: ['meal'] });
  void client.invalidateQueries({ queryKey: ['mealSummaries'] });
  void client.invalidateQueries({ queryKey: nutritionKeys.recent });
}

export function useSaveMeal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, draft, pendingId }: { id: string | null; draft: MealDraft; pendingId: string | null }) => {
      if (id) await repos().meals.update(id, draft);
      else await repos().meals.create(draft);
      // Si venía de una foto pendiente, deja de estarlo.
      if (pendingId) await repos().pendingPhotos.resolve(pendingId);
    },
    onSuccess: () => {
      invalidateMeals(client);
      void client.invalidateQueries({ queryKey: nutritionKeys.pending });
    },
  });
}

/** Lo que la app ha aprendido de tus comidas. */
export function useFoodMemory() {
  return useQuery({ queryKey: nutritionKeys.memory, queryFn: () => repos().foodMemory.list() });
}

export function useLearnFoods() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entries: readonly LearnEntry[]) => repos().foodMemory.learn(entries),
    onSuccess: () => client.invalidateQueries({ queryKey: nutritionKeys.memory }),
  });
}

export function useClearFoodMemory() {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => repos().foodMemory.clear(), onSuccess: () => client.invalidateQueries({ queryKey: nutritionKeys.memory }) });
}

export function useDeleteMeal() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().meals.softDelete(id), onSuccess: () => invalidateMeals(client) });
}

export function useSavePending() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, existingId }: { input: PendingPhotoInput; existingId: string | null }) => {
      if (existingId) await repos().pendingPhotos.markFailed(existingId, input.lastError ?? 'Error');
      else await repos().pendingPhotos.create(input);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: nutritionKeys.pending }),
  });
}

export function useResolvePending() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos().pendingPhotos.resolve(id),
    onSuccess: () => client.invalidateQueries({ queryKey: nutritionKeys.pending }),
  });
}
