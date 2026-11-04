import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getRepositories } from '@/data/repositories';
import { ageFromBirthYear, calorieTarget, macroTargets, type CalorieTarget, type MacroTargets } from '@/domain/calorieGoal';
import type { AiProvider, Profile, ProfileInput } from '@/domain/types';
import { getApiKey, maskKey, setApiKey } from '@/lib/secrets';

export const profileKeys = {
  profile: ['profile'] as const,
  apiKey: (provider: AiProvider) => ['apiKey', provider] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile,
    queryFn: () => getRepositories().profile.get(),
  });
}

export function useSaveProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ProfileInput) => getRepositories().profile.save(input),
    onSuccess: (saved) => {
      client.setQueryData(profileKeys.profile, saved);
    },
  });
}

export type ProfileTargets = CalorieTarget & { macros: MacroTargets; age: number };

export function targetsForProfile(p: Profile): ProfileTargets {
  const age = ageFromBirthYear(p.birthYear);
  const target = calorieTarget({
    sex: p.sex,
    weightKg: p.weightKg,
    heightCm: p.heightCm,
    age,
    activityLevel: p.activityLevel,
    goal: p.goal,
    goalRateKgWeek: p.goalRateKgWeek,
  });
  return { ...target, age, macros: macroTargets(target.target, p.weightKg) };
}

/** Estado de la clave: enmascarada ("••••1234") o null si no hay. Nunca expone la clave. */
export function useApiKeyStatus(provider: AiProvider) {
  return useQuery({
    queryKey: profileKeys.apiKey(provider),
    queryFn: async () => {
      const key = await getApiKey(provider);
      return key ? maskKey(key) : null;
    },
  });
}

export function useSaveApiKey(provider: AiProvider) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => setApiKey(provider, key),
    onSuccess: () => client.invalidateQueries({ queryKey: profileKeys.apiKey(provider) }),
  });
}
