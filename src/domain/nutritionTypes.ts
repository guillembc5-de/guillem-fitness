import type { MealSource, MealType, PendingStatus } from './enums';
import type { LocalDate } from './localDay';
import type { Per100 } from './nutrition';
import type { AiProvider, SyncMeta } from './types';

export type FoodItem = SyncMeta &
  Per100 & {
    mealId: string;
    name: string;
    grams: number;
    /** true si lo estimó la IA (aunque luego lo corrigieras). */
    aiEstimated: boolean;
    position: number;
  };

export type Meal = SyncMeta & {
  localDate: LocalDate;
  mealType: MealType;
  eatenAt: number;
  source: MealSource;
  photoUri: string | null;
  aiProvider: AiProvider | null;
  isDemo: boolean;
  items: FoodItem[];
};

export type FoodDraft = Per100 & { name: string; grams: number; aiEstimated: boolean };

export type MealDraft = {
  localDate: LocalDate;
  mealType: MealType;
  eatenAt: number;
  source: MealSource;
  photoUri: string | null;
  aiProvider: AiProvider | null;
  items: FoodDraft[];
};

export type PendingPhoto = SyncMeta & {
  photoUri: string;
  mealType: MealType;
  localDate: LocalDate;
  capturedAt: number;
  status: PendingStatus;
  attempts: number;
  lastError: string | null;
};

export type PendingPhotoInput = Pick<PendingPhoto, 'photoUri' | 'mealType' | 'localDate' | 'capturedAt' | 'lastError'>;

export type DaySummary = {
  localDate: LocalDate;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
};

/** Alimento usado antes, para rellenar rápido la entrada manual. */
export type RecentFood = Per100 & { name: string; grams: number };
