import type { ActivityLevel, AiProvider, Goal, Sex } from '@/domain/types';

export const SEX_LABELS: Record<Sex, string> = {
  male: 'Hombre',
  female: 'Mujer',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { title: string; description: string }> = {
  sedentary: { title: 'Sentado casi todo el día', description: 'Oficina, estudio, conducir.' },
  light: { title: 'De pie a ratos', description: 'Clases, tareas de casa, algo de movimiento.' },
  moderate: { title: 'De pie casi todo el día', description: 'Hostelería, tienda, enfermería.' },
  high: { title: 'Trabajo físico', description: 'Almacén, reparto, mantenimiento.' },
  very_high: { title: 'Trabajo físico duro', description: 'Construcción, campo, cargar peso.' },
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
