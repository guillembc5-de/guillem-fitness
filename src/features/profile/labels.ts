import type { ActivityLevel, AiProvider, Goal, Sex } from '@/domain/types';

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Hombre',
  female: 'Mujer',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { title: string; description: string }> = {
  sedentary: { title: 'Sedentario', description: 'Trabajo sentado y sin entreno.' },
  light: { title: 'Ligero', description: 'Gimnasio 1–4 días por semana.' },
  moderate: { title: 'Moderado', description: 'Gimnasio 5–6 días o deporte intenso.' },
  high: { title: 'Alto', description: 'Entreno diario intenso.' },
  very_high: { title: 'Muy alto', description: 'Trabajo físico y entreno diario.' },
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Perder',
  maintain: 'Mantener',
  gain: 'Ganar',
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Gemini',
  claude: 'Claude',
};
