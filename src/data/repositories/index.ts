import { db } from '../db/client';
import type { Repositories } from './interfaces';
import { SqliteActivityRepository } from './sqlite/activityRepository';
import { SqliteDataRepository } from './sqlite/dataRepository';
import { SqliteExerciseRepository } from './sqlite/exerciseRepository';
import { SqliteFoodMemoryRepository } from './sqlite/foodMemoryRepository';
import { SqliteMealRepository, SqlitePendingPhotoRepository } from './sqlite/mealRepository';
import { SqliteProfileRepository } from './sqlite/profileRepository';
import { SqliteRoutineRepository } from './sqlite/routineRepository';
import { SqliteStepDayRepository } from './sqlite/stepDayRepository';
import { SqliteWorkoutRepository } from './sqlite/workoutRepository';

export type * from './interfaces';

let instance: Repositories | null = null;

/**
 * Punto único donde se elige la implementación de los repositorios.
 * Para pasar a la nube se cambia aquí y en ningún otro sitio.
 */
export function getRepositories(): Repositories {
  instance ??= {
    data: new SqliteDataRepository(db),
    profile: new SqliteProfileRepository(db),
    exercises: new SqliteExerciseRepository(db),
    routines: new SqliteRoutineRepository(db),
    workouts: new SqliteWorkoutRepository(db),
    stepDays: new SqliteStepDayRepository(db),
    activity: new SqliteActivityRepository(db),
    meals: new SqliteMealRepository(db),
    pendingPhotos: new SqlitePendingPhotoRepository(db),
    foodMemory: new SqliteFoodMemoryRepository(db),
  };
  return instance;
}
