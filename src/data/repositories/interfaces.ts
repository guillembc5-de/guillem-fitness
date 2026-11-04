import type { BackupFile, ImportResult } from '@/data/backup/backup';
import type { DemoCounts } from '@/data/seed/demoData';
import type { StepSource } from '@/domain/enums';
import type { LocalDate } from '@/domain/localDay';
import type { DaySummary, Meal, MealDraft, PendingPhoto, PendingPhotoInput, RecentFood } from '@/domain/nutritionTypes';
import type { IncomingStepDay, StepContext, StepDay } from '@/domain/stepTypes';
import type { Profile, ProfileInput } from '@/domain/types';
import type { ExerciseBests } from '@/domain/workout';
import type {
  Exercise,
  ExerciseHistorySet,
  ExerciseInput,
  RoutineDetail,
  RoutineDraft,
  RoutineSummary,
  SetPatch,
  WorkoutDetail,
  WorkoutSet,
  WorkoutSummary,
} from '@/domain/workoutTypes';

/**
 * Contratos de acceso a datos. Las pantallas solo conocen estas interfaces.
 * Hoy las implementa SQLite; mañana podría hacerlo Supabase o una capa de
 * sincronización sin tocar ninguna pantalla.
 */

export interface ProfileRepository {
  /** Perfil actual, o null si aún no se ha hecho el onboarding. */
  get(): Promise<Profile | null>;
  /** Crea el perfil o actualiza el existente. */
  save(input: ProfileInput): Promise<Profile>;
}

export interface ExerciseRepository {
  /** Biblioteca (sin borrados), ordenada por nombre. */
  list(): Promise<Exercise[]>;
  /** Incluye ejercicios borrados, para el historial. */
  get(id: string): Promise<Exercise | null>;
  create(input: ExerciseInput): Promise<Exercise>;
  update(id: string, input: ExerciseInput): Promise<void>;
  setDefaultRest(id: string, seconds: number | null): Promise<void>;
  /** Borrado suave: lo quita de la biblioteca y las rutinas; el historial se conserva. */
  softDelete(id: string): Promise<void>;
  /** Series completadas en entrenos terminados, de la más reciente a la más antigua. */
  history(exerciseId: string): Promise<ExerciseHistorySet[]>;
}

export interface RoutineRepository {
  list(): Promise<RoutineSummary[]>;
  get(id: string): Promise<RoutineDetail | null>;
  /** Crea (id null) o sustituye el contenido de una rutina. Devuelve su id. */
  save(id: string | null, draft: RoutineDraft): Promise<string>;
  duplicate(id: string): Promise<string>;
  softDelete(id: string): Promise<void>;
  reorder(orderedIds: readonly string[]): Promise<void>;
}

export type StartWorkoutParams = {
  routineId: string | null;
  name: string;
  defaultRestSeconds: number;
};

export interface WorkoutRepository {
  /** Entreno en curso (sin terminar), si lo hay. */
  getActive(): Promise<WorkoutDetail | null>;
  get(id: string): Promise<WorkoutDetail | null>;
  /** Entrenos terminados, del más reciente al más antiguo. */
  list(): Promise<WorkoutSummary[]>;
  /** Empieza un entreno (vacío o desde una rutina). Devuelve su id. */
  start(params: StartWorkoutParams): Promise<string>;
  addExercise(workoutId: string, exerciseId: string, restSeconds: number): Promise<void>;
  removeExercise(workoutExerciseId: string): Promise<void>;
  setExerciseRest(workoutExerciseId: string, seconds: number): Promise<void>;
  addSet(workoutExerciseId: string): Promise<void>;
  removeSet(setId: string): Promise<void>;
  updateSet(setId: string, patch: SetPatch): Promise<void>;
  completeSet(setId: string, values: SetPatch): Promise<void>;
  uncompleteSet(setId: string): Promise<void>;
  setRest(workoutId: string, restEndsAt: number | null, notificationId: string | null): Promise<void>;
  /** Termina el entreno: descarta series sin completar y ejercicios vacíos. */
  finish(workoutId: string): Promise<void>;
  softDelete(workoutId: string): Promise<void>;
  /** Series del último entreno terminado con ese ejercicio («anterior»). */
  lastSessionSets(exerciseId: string, excludeWorkoutId: string | null): Promise<WorkoutSet[]>;
  /**
   * Mejores marcas históricas por ejercicio, sin contar el entreno indicado.
   * Con `beforeStartedAt`, solo cuenta entrenos anteriores a esa fecha
   * (para ver los récords que batió un entreno antiguo).
   */
  historyBests(
    exerciseIds: readonly string[],
    excludeWorkoutId: string | null,
    beforeStartedAt?: number,
  ): Promise<Record<string, ExerciseBests>>;
}

export interface StepDayRepository {
  /** Días con datos entre dos fechas locales (incluidas). */
  range(from: LocalDate, to: LocalDate): Promise<StepDay[]>;
  get(localDate: LocalDate): Promise<StepDay | null>;
  /** Último día guardado desde una fuente (para sincronizar solo lo nuevo). */
  lastDateFrom(source: StepSource): Promise<LocalDate | null>;
  /** Guarda días aplicando la regla de una sola fuente. Devuelve cuántos cambian. */
  saveDays(days: readonly IncomingStepDay[], ctx: StepContext): Promise<number>;
}

export interface MealRepository {
  /** Comidas de un día local con sus alimentos, por hora. */
  byDate(localDate: LocalDate): Promise<Meal[]>;
  get(id: string): Promise<Meal | null>;
  create(draft: MealDraft): Promise<string>;
  /** Sustituye los alimentos y datos de la comida. */
  update(id: string, draft: MealDraft): Promise<void>;
  softDelete(id: string): Promise<void>;
  /** Totales por día (más reciente primero), solo días con comidas. */
  daySummaries(from: LocalDate, to: LocalDate): Promise<DaySummary[]>;
  /** Alimentos usados recientemente (sin repetir nombre). */
  recentFoods(limit: number): Promise<RecentFood[]>;
}

export interface PendingPhotoRepository {
  list(): Promise<PendingPhoto[]>;
  get(id: string): Promise<PendingPhoto | null>;
  create(input: PendingPhotoInput): Promise<string>;
  markFailed(id: string, error: string): Promise<void>;
  /** Ya analizada o pasada a mano: deja de estar pendiente. */
  resolve(id: string): Promise<void>;
}

/** Copias de seguridad y datos de prueba (afectan a todas las tablas). */
export interface DataRepository {
  exportAll(): Promise<BackupFile>;
  /** Fusiona por id; gana el cambio más reciente. Todo o nada. */
  importAll(data: unknown): Promise<ImportResult>;
  generateDemo(onProgress?: (progress: number) => void): Promise<DemoCounts>;
  countDemo(): Promise<DemoCounts>;
  clearDemo(): Promise<DemoCounts>;
}

export type Repositories = {
  data: DataRepository;
  profile: ProfileRepository;
  exercises: ExerciseRepository;
  routines: RoutineRepository;
  workouts: WorkoutRepository;
  stepDays: StepDayRepository;
  meals: MealRepository;
  pendingPhotos: PendingPhotoRepository;
};
