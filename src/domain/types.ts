/**
 * Tipos de dominio. Las pantallas y los repositorios hablan en estos tipos,
 * nunca en filas de base de datos, para poder cambiar el almacenamiento
 * (por ejemplo, a Supabase) sin tocar la interfaz.
 */

/** Metadatos comunes a todas las entidades, preparados para sincronizar. */
export type SyncMeta = {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
};

export const SEXES = ['male', 'female'] as const;
export type Sex = (typeof SEXES)[number];

export const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'high', 'very_high'] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const GOALS = ['lose', 'maintain', 'gain'] as const;
export type Goal = (typeof GOALS)[number];

export const WEIGHT_UNITS = ['kg', 'lb'] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

export const AI_PROVIDERS = ['gemini', 'claude'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export type Profile = SyncMeta & {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  /** Ritmo en kg por semana (positivo). Se ignora si el objetivo es mantener. */
  goalRateKgWeek: number;
  stepGoal: number;
  weightUnit: WeightUnit;
  defaultRestSeconds: number;
  aiProvider: AiProvider;
  geminiModel: string;
  claudeModel: string;
  onboardingCompletedAt: number | null;
};

export type ProfileInput = Omit<Profile, keyof SyncMeta>;
