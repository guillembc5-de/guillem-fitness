import type { MealType } from '@/domain/enums';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  snack: 'Merienda',
  dinner: 'Cena',
};

export const MEAL_ORDER: readonly MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
