import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import type {
  Equipment,
  MealSource,
  MealType,
  MuscleGroup,
  PendingStatus,
  SetType,
  StepSource,
  TrackingType,
} from '@/domain/enums';
import type { ActivityLevel, AiProvider, Goal, Sex, WeightUnit } from '@/domain/types';

/**
 * Columnas comunes a TODAS las tablas, preparadas para sincronizar con la nube:
 * UUID, fechas de creación/actualización (epoch ms) y borrado suave.
 * Es una función para crear columnas nuevas en cada tabla.
 */
const meta = () => ({
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

/** Marca los datos de prueba para poder borrarlos sin tocar los reales. */
const demo = () => ({
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
});

export const profile = sqliteTable('profile', {
  ...meta(),
  sex: text('sex').$type<Sex>().notNull(),
  birthYear: integer('birth_year').notNull(),
  heightCm: real('height_cm').notNull(),
  weightKg: real('weight_kg').notNull(),
  activityLevel: text('activity_level').$type<ActivityLevel>().notNull(),
  goal: text('goal').$type<Goal>().notNull(),
  goalRateKgWeek: real('goal_rate_kg_week').notNull(),
  stepGoal: integer('step_goal').notNull(),
  weightUnit: text('weight_unit').$type<WeightUnit>().notNull(),
  defaultRestSeconds: integer('default_rest_seconds').notNull(),
  aiProvider: text('ai_provider').$type<AiProvider>().notNull(),
  geminiModel: text('gemini_model').notNull(),
  claudeModel: text('claude_model').notNull(),
  onboardingCompletedAt: integer('onboarding_completed_at'),
});

export const exercise = sqliteTable(
  'exercise',
  {
    ...meta(),
    name: text('name').notNull(),
    /** Nombre sin tildes ni mayúsculas, para buscar. */
    searchName: text('search_name').notNull(),
    muscleGroup: text('muscle_group').$type<MuscleGroup>().notNull(),
    /** JSON: MuscleGroup[] */
    secondaryMuscles: text('secondary_muscles').notNull().default('[]'),
    equipment: text('equipment').$type<Equipment>().notNull(),
    trackingType: text('tracking_type').$type<TrackingType>().notNull(),
    defaultRestSeconds: integer('default_rest_seconds'),
    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
    notes: text('notes'),
  },
  (t) => [index('exercise_search_idx').on(t.searchName), index('exercise_muscle_idx').on(t.muscleGroup)],
);

/** Carpetas para agrupar rutinas. */
export const routineFolder = sqliteTable('routine_folder', {
  ...meta(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
});

export const routine = sqliteTable('routine', {
  ...meta(),
  name: text('name').notNull(),
  position: integer('position').notNull(),
  notes: text('notes'),
  /** null = sin carpeta. */
  folderId: text('folder_id'),
});

export const routineExercise = sqliteTable(
  'routine_exercise',
  {
    ...meta(),
    routineId: text('routine_id')
      .notNull()
      .references(() => routine.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    position: integer('position').notNull(),
    /** Si es null se usa el del ejercicio y, si tampoco, el del perfil. */
    restSeconds: integer('rest_seconds'),
    notes: text('notes'),
    /** Ejercicios con el mismo valor forman una superserie. */
    supersetId: text('superset_id'),
  },
  (t) => [index('routine_exercise_routine_idx').on(t.routineId)],
);

export const routineSet = sqliteTable(
  'routine_set',
  {
    ...meta(),
    routineExerciseId: text('routine_exercise_id')
      .notNull()
      .references(() => routineExercise.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    setType: text('set_type').$type<SetType>().notNull().default('normal'),
    targetWeightKg: real('target_weight_kg'),
    targetReps: integer('target_reps'),
    targetDurationS: integer('target_duration_s'),
  },
  (t) => [index('routine_set_re_idx').on(t.routineExerciseId)],
);

export const workout = sqliteTable(
  'workout',
  {
    ...meta(),
    ...demo(),
    routineId: text('routine_id').references(() => routine.id),
    name: text('name').notNull(),
    startedAt: integer('started_at').notNull(),
    /** null = entreno en curso. */
    endedAt: integer('ended_at'),
    localDate: text('local_date').notNull(),
    /** Fin del descanso en curso (epoch ms). El temporizador se calcula con esto. */
    restEndsAt: integer('rest_ends_at'),
    restNotificationId: text('rest_notification_id'),
    notes: text('notes'),
  },
  (t) => [index('workout_started_idx').on(t.startedAt), index('workout_ended_idx').on(t.endedAt)],
);

export const workoutExercise = sqliteTable(
  'workout_exercise',
  {
    ...meta(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workout.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercise.id),
    /** Nombre en el momento del entreno: el historial sobrevive aunque se borre o renombre el ejercicio. */
    exerciseNameSnapshot: text('exercise_name_snapshot').notNull(),
    position: integer('position').notNull(),
    restSeconds: integer('rest_seconds').notNull(),
    notes: text('notes'),
    /** Ejercicios con el mismo valor forman una superserie. */
    supersetId: text('superset_id'),
  },
  (t) => [index('workout_exercise_workout_idx').on(t.workoutId), index('workout_exercise_exercise_idx').on(t.exerciseId)],
);

export const workoutSet = sqliteTable(
  'workout_set',
  {
    ...meta(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercise.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    setType: text('set_type').$type<SetType>().notNull().default('normal'),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    durationS: integer('duration_s'),
    /** Esfuerzo percibido (6–10), opcional. */
    rpe: real('rpe'),
    /** null = serie sin completar. */
    completedAt: integer('completed_at'),
  },
  (t) => [index('workout_set_we_idx').on(t.workoutExerciseId)],
);

export const stepDay = sqliteTable(
  'step_day',
  {
    ...meta(),
    ...demo(),
    localDate: text('local_date').notNull(),
    steps: integer('steps').notNull(),
    distanceM: real('distance_m').notNull(),
    kcal: real('kcal').notNull(),
    source: text('source').$type<StepSource>().notNull(),
    /** Objetivo vigente ese día: cambiarlo no recolorea el pasado. */
    goalSnapshot: integer('goal_snapshot').notNull(),
  },
  (t) => [uniqueIndex('step_day_date_idx').on(t.localDate)],
);

export const meal = sqliteTable(
  'meal',
  {
    ...meta(),
    ...demo(),
    localDate: text('local_date').notNull(),
    mealType: text('meal_type').$type<MealType>().notNull(),
    eatenAt: integer('eaten_at').notNull(),
    source: text('source').$type<MealSource>().notNull(),
    photoUri: text('photo_uri'),
    aiProvider: text('ai_provider').$type<AiProvider>(),
  },
  (t) => [index('meal_date_idx').on(t.localDate)],
);

export const foodItem = sqliteTable(
  'food_item',
  {
    ...meta(),
    mealId: text('meal_id')
      .notNull()
      .references(() => meal.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    grams: real('grams').notNull(),
    /** Valores por 100 g: al cambiar los gramos todo se recalcula exacto. */
    kcalPer100g: real('kcal_per_100g').notNull(),
    proteinPer100g: real('protein_per_100g').notNull(),
    carbsPer100g: real('carbs_per_100g').notNull(),
    fatPer100g: real('fat_per_100g').notNull(),
    aiEstimated: integer('ai_estimated', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull(),
  },
  (t) => [index('food_item_meal_idx').on(t.mealId)],
);

export const pendingPhoto = sqliteTable('pending_photo', {
  ...meta(),
  photoUri: text('photo_uri').notNull(),
  mealType: text('meal_type').$type<MealType>().notNull(),
  localDate: text('local_date').notNull(),
  capturedAt: integer('captured_at').notNull(),
  status: text('status').$type<PendingStatus>().notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
});

/**
 * Lo que la app aprende de tus comidas: los valores que confirmas o corriges
 * y cuánto se desvía la IA al estimar raciones. Mejora las siguientes fotos.
 */
export const foodMemory = sqliteTable(
  'food_memory',
  {
    ...meta(),
    name: text('name').notNull(),
    /** Nombre normalizado (sin tildes ni mayúsculas): una fila por alimento. */
    searchName: text('search_name').notNull(),
    /** JSON: string[] con otros nombres normalizados que la IA usó para este alimento. */
    aliases: text('aliases').notNull().default('[]'),
    /** Última ración confirmada. */
    grams: real('grams').notNull(),
    kcalPer100g: real('kcal_per_100g').notNull(),
    proteinPer100g: real('protein_per_100g').notNull(),
    carbsPer100g: real('carbs_per_100g').notNull(),
    fatPer100g: real('fat_per_100g').notNull(),
    timesConfirmed: integer('times_confirmed').notNull(),
    /** Suma de gramos que estimó la IA y de los que confirmaste, para calibrar raciones. */
    aiGramsTotal: real('ai_grams_total').notNull().default(0),
    finalGramsTotal: real('final_grams_total').notNull().default(0),
    aiSamples: integer('ai_samples').notNull().default(0),
    lastUsedAt: integer('last_used_at').notNull(),
  },
  (t) => [uniqueIndex('food_memory_search_idx').on(t.searchName)],
);

/**
 * Actividad del día según la app Fitness (Apple Watch o iPhone), leída de
 * Salud o enviada por el Atajo. Una fila por día; null = no llegó ese dato.
 */
export const activityDay = sqliteTable(
  'activity_day',
  {
    ...meta(),
    localDate: text('local_date').notNull(),
    /** Energía activa (kcal por encima del reposo), como el anillo Moverse. */
    activeKcal: real('active_kcal'),
    /** Minutos de ejercicio, como el anillo Ejercicio. */
    exerciseMin: integer('exercise_min'),
    /** healthkit (Salud directo) o shortcut (Atajo). */
    source: text('source').notNull(),
  },
  (t) => [uniqueIndex('activity_day_date_idx').on(t.localDate)],
);

/** Entrenos registrados en Salud por el Apple Watch u otras apps (correr, caminar, bici…). */
export const externalWorkout = sqliteTable(
  'external_workout',
  {
    ...meta(),
    /** uuid del entreno en Salud: evita duplicarlo al volver a leer. */
    externalId: text('external_id').notNull(),
    localDate: text('local_date').notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at').notNull(),
    /** HKWorkoutActivityType (número). */
    activityType: integer('activity_type').notNull(),
    durationS: integer('duration_s').notNull(),
    kcal: real('kcal'),
    distanceM: real('distance_m'),
    /** App que lo registró (por ejemplo, «Entrenamiento» del Watch). */
    sourceName: text('source_name'),
  },
  (t) => [uniqueIndex('external_workout_ext_idx').on(t.externalId), index('external_workout_date_idx').on(t.localDate)],
);
