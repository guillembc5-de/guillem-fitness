import { ageFromBirthYear, birthYearFromAge } from '@/domain/calorieGoal';
import { fromDisplayWeight, toDisplayWeight } from '@/domain/format';
import { parseDecimal, toInputText } from '@/domain/parseNumber';
import type { ActivityLevel, AiProvider, Goal, Profile, ProfileInput, Sex, WeightUnit } from '@/domain/types';

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';
export const DEFAULT_CLAUDE_MODEL = 'claude-haiku-5-5';

export const LOSE_RATES = [0.25, 0.5, 0.75, 1] as const;
export const GAIN_RATES = [0.25, 0.5] as const;
export const REST_OPTIONS = [60, 90, 120, 150, 180] as const;

/** Estado editable del formulario: los números van como texto mientras se escriben. */
export type ProfileDraft = {
  sex: Sex;
  age: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
  goal: Goal;
  goalRateKgWeek: number;
  stepGoal: string;
  weightUnit: WeightUnit;
  defaultRestSeconds: number;
  aiProvider: AiProvider;
  geminiModel: string;
  claudeModel: string;
};

export type DraftField = 'age' | 'heightCm' | 'weightKg' | 'stepGoal';
export type DraftErrors = Partial<Record<DraftField, string>>;

export function emptyDraft(): ProfileDraft {
  return {
    sex: 'male',
    age: '',
    heightCm: '',
    weightKg: '',
    activityLevel: 'light',
    goal: 'maintain',
    goalRateKgWeek: 0.5,
    stepGoal: '10000',
    weightUnit: 'kg',
    defaultRestSeconds: 150,
    aiProvider: 'gemini',
    geminiModel: DEFAULT_GEMINI_MODEL,
    claudeModel: DEFAULT_CLAUDE_MODEL,
  };
}

export function draftFromProfile(p: Profile): ProfileDraft {
  return {
    sex: p.sex,
    age: String(ageFromBirthYear(p.birthYear)),
    heightCm: toInputText(p.heightCm, 0),
    weightKg: toInputText(toDisplayWeight(p.weightKg, p.weightUnit), 1),
    activityLevel: p.activityLevel,
    goal: p.goal,
    goalRateKgWeek: p.goalRateKgWeek,
    stepGoal: String(p.stepGoal),
    weightUnit: p.weightUnit,
    defaultRestSeconds: p.defaultRestSeconds,
    aiProvider: p.aiProvider,
    geminiModel: p.geminiModel,
    claudeModel: p.claudeModel,
  };
}

type Range = { min: number; max: number; message: string };

const RANGES: Record<DraftField, Range> = {
  age: { min: 14, max: 100, message: 'Edad entre 14 y 100 años' },
  heightCm: { min: 120, max: 230, message: 'Altura entre 120 y 230 cm' },
  weightKg: { min: 30, max: 300, message: 'Peso entre 30 y 300 kg' },
  stepGoal: { min: 1000, max: 100000, message: 'Objetivo entre 1.000 y 100.000 pasos' },
};

export type BodyValues = { age: number; heightCm: number; weightKg: number };

/** Valida un subconjunto de campos (el onboarding valida paso a paso). */
/** Valor del campo en unidades internas (el peso se escribe en la unidad elegida y se guarda en kg). */
function fieldValue(draft: ProfileDraft, field: DraftField): number | null {
  const value = parseDecimal(draft[field]);
  if (value === null) return null;
  return field === 'weightKg' ? fromDisplayWeight(value, draft.weightUnit) : value;
}

export function validateFields(draft: ProfileDraft, fields: readonly DraftField[]): DraftErrors {
  const errors: DraftErrors = {};
  for (const field of fields) {
    const value = fieldValue(draft, field);
    const range = RANGES[field];
    if (value === null) errors[field] = 'Campo obligatorio';
    else if (value < range.min || value > range.max) errors[field] = range.message;
  }
  return errors;
}

/** Datos corporales si son válidos (para calcular el objetivo en vivo). */
export function bodyValues(draft: ProfileDraft): BodyValues | null {
  const errors = validateFields(draft, ['age', 'heightCm', 'weightKg']);
  if (Object.keys(errors).length > 0) return null;
  return {
    age: fieldValue(draft, 'age') ?? 0,
    heightCm: fieldValue(draft, 'heightCm') ?? 0,
    weightKg: fieldValue(draft, 'weightKg') ?? 0,
  };
}

export const ALL_FIELDS: readonly DraftField[] = ['age', 'heightCm', 'weightKg', 'stepGoal'];

export function draftToInput(draft: ProfileDraft, onboardingCompletedAt: number | null): ProfileInput {
  const body = bodyValues(draft);
  const stepGoal = parseDecimal(draft.stepGoal);
  if (!body || stepGoal === null) throw new Error('Perfil incompleto');
  return {
    sex: draft.sex,
    birthYear: birthYearFromAge(Math.round(body.age)),
    heightCm: Math.round(body.heightCm),
    weightKg: Math.round(body.weightKg * 10) / 10,
    activityLevel: draft.activityLevel,
    goal: draft.goal,
    goalRateKgWeek: draft.goalRateKgWeek,
    stepGoal: Math.round(stepGoal),
    weightUnit: draft.weightUnit,
    defaultRestSeconds: draft.defaultRestSeconds,
    aiProvider: draft.aiProvider,
    geminiModel: draft.geminiModel.trim() || DEFAULT_GEMINI_MODEL,
    claudeModel: draft.claudeModel.trim() || DEFAULT_CLAUDE_MODEL,
    onboardingCompletedAt,
  };
}

/** Ajusta el ritmo si deja de ser válido al cambiar de objetivo. */
export function normalizeRate(goal: Goal, rate: number): number {
  if (goal === 'gain' && !GAIN_RATES.some((r) => r === rate)) return 0.25;
  if (goal === 'lose' && !LOSE_RATES.some((r) => r === rate)) return 0.5;
  return rate;
}
