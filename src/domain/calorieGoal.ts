import type { ActivityLevel, Goal, Sex } from './types';

/**
 * Factores de actividad de tu día a día SIN contar caminar ni el gimnasio:
 * las kcal de los pasos y de cada entreno se restan aparte en el contador de
 * calorías, así que incluirlas aquí las contaría dos veces.
 */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.3,
  moderate: 1.4,
  high: 1.55,
  very_high: 1.7,
};

/** kcal aproximadas por kg de grasa corporal. */
export const KCAL_PER_KG = 7700;

/** Mínimo diario por seguridad: no se propone comer menos aunque el cálculo lo diga. */
export const MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

export function ageFromBirthYear(birthYear: number, now: Date = new Date()): number {
  return now.getFullYear() - birthYear;
}

export function birthYearFromAge(age: number, now: Date = new Date()): number {
  return now.getFullYear() - age;
}

type BmrInput = { sex: Sex; weightKg: number; heightCm: number; age: number };

/** Metabolismo basal según Mifflin-St Jeor (kcal/día). */
export function bmrMifflinStJeor({ sex, weightKg, heightCm, age }: BmrInput): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export type CalorieTargetInput = BmrInput & {
  activityLevel: ActivityLevel;
  goal: Goal;
  goalRateKgWeek: number;
};

export type CalorieTarget = {
  bmr: number;
  /** Gasto diario sin caminar ni entrenar. */
  tdee: number;
  /** Déficit (negativo) o superávit (positivo) diario por el objetivo. */
  adjustment: number;
  /** Objetivo diario de kcal, redondeado a decenas. */
  target: number;
  /** true si el mínimo de seguridad ha subido el objetivo. */
  floorApplied: boolean;
};

export function dailyAdjustment(goal: Goal, goalRateKgWeek: number): number {
  if (goal === 'maintain') return 0;
  const perDay = (Math.abs(goalRateKgWeek) * KCAL_PER_KG) / 7;
  return goal === 'lose' ? -perDay : perDay;
}

export function calorieTarget(input: CalorieTargetInput): CalorieTarget {
  const bmr = bmrMifflinStJeor(input);
  const tdee = bmr * ACTIVITY_FACTORS[input.activityLevel];
  const adjustment = dailyAdjustment(input.goal, input.goalRateKgWeek);
  const raw = Math.round((tdee + adjustment) / 10) * 10;
  const floor = MIN_KCAL[input.sex];
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    adjustment: Math.round(adjustment),
    target: Math.max(raw, floor),
    floorApplied: raw < floor,
  };
}

export type MacroTargets = { proteinG: number; fatG: number; carbsG: number };

/** Proteína 1,8 g/kg, grasa 25 % de las kcal y el resto, hidratos. */
export function macroTargets(targetKcal: number, weightKg: number): MacroTargets {
  const proteinG = Math.round(1.8 * weightKg);
  const fatG = Math.round((targetKcal * 0.25) / 9);
  const carbsG = Math.max(0, Math.round((targetKcal - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, fatG, carbsG };
}
