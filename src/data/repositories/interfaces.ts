import type { BackupFile, ImportResult } from '@/data/backup/backup';
import type { DemoCounts } from '@/data/seed/demoData';
import type { StepSource } from '@/domain/enums';
import type { ActivityDay, ExternalWorkout, IncomingActivityDay, IncomingExternalWorkout } from '@/domain/fitnessTypes';
import type { FoodMemory, LearnEntry } from '@/domain/foodMemory';
import type { LocalDate } from '@/domain/localDay';
import type { DaySummary, Meal, MealDraft, PendingPhoto, PendingPhotoInput, RecentFood } from '@/domain/nutritionTypes';
import type { IncomingStepDay, StepContext, StepDay } from '@/domain/stepTypes';
import type { Profile, ProfileInput } from '@/domain/types';
import type { ExerciseBests } from '@/domain/workout';
import type {
  Exercise,
  ExerciseHistorySet,
  ExerciseInput,
  MuscleSetCount,
  RoutineDetail,
  RoutineDraft,
  RoutineFolder,
  RoutineSummary,
  SetPatch,
  WorkoutDetail,
  WorkoutDetailsPatch,
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
  /** Crea (id null, en la carpeta indicada) o sustituye el contenido de una rutina. Devuelve su id. */
  save(id: string | null, draft: RoutineDraft, folderId?: string | null): Promise<string>;
  duplicate(id: string): Promise<string>;
  softDelete(id: string): Promise<void>;
  reorder(orderedIds: readonly string[]): Promise<void>;
  listFolders(): Promise<RoutineFolder[]>;
  createFolder(name: string): Promise<string>;
  renameFolder(id: string, name: string): Promise<void>;
  /** Borra la carpeta; sus rutinas pasan a «sin carpeta». */
  deleteFolder(id: string): Promise<void>;
  moveToFolder(routineId: string, folderId: string | null): Promise<void>;
  /** Guarda un entreno como rutina (actualiza la rutina indicada o crea una nueva). Devuelve su id. */
  saveFromWorkout(workoutId: string, routineId: string | null, name: string): Promise<string>;
}

/** De dónde sale «anterior»: la última vez en cualquier entreno o en esta misma rutina. */
export type PreviousFrom = 'any' | 'routine';

export type StartWorkoutParams = {
  routineId: string | null;
  name: string;
  defaultRestSeconds: number;
  previousFrom?: PreviousFrom;
};

export interface WorkoutRepository {
  /** Entreno en curso (sin terminar), si lo hay. */
  getActive(): Promise<WorkoutDetail | null>;
  get(id: string): Promise<WorkoutDetail | null>;
  /** Entrenos terminados, del más reciente al más antiguo. */
  list(): Promise<WorkoutSummary[]>;
  /** Empieza un entreno (vacío o desde una rutina). Devuelve su id. */
  start(params: StartWorkoutParams): Promise<string>;
  /** Empieza un entreno nuevo copiando uno anterior. Devuelve su id. */
  repeat(workoutId: string): Promise<string>;
  addExercise(workoutId: string, exerciseId: string, restSeconds: number): Promise<void>;
  removeExercise(workoutExerciseId: string): Promise<void>;
  setExerciseRest(workoutExerciseId: string, seconds: number): Promise<void>;
  setExerciseNotes(workoutExerciseId: string, notes: string | null): Promise<void>;
  moveExercise(workoutExerciseId: string, delta: -1 | 1): Promise<void>;
  /** Pone los ejercicios del entreno en este orden (los que falten se quedan al final). */
  reorderExercises(workoutId: string, orderedIds: readonly string[]): Promise<void>;
  /** Cambia el ejercicio conservando las series (las pendientes se rellenan con «anterior»). */
  replaceExercise(workoutExerciseId: string, exerciseId: string): Promise<void>;
  /** Une el ejercicio a la superserie de otro (o crea una nueva con los dos). */
  joinSuperset(workoutExerciseId: string, withWorkoutExerciseId: string): Promise<void>;
  leaveSuperset(workoutExerciseId: string): Promise<void>;
  addSet(workoutExerciseId: string): Promise<void>;
  /** Añade series de calentamiento delante de las que ya hay. */
  addWarmupSets(workoutExerciseId: string, sets: readonly { weightKg: number; reps: number }[]): Promise<void>;
  removeSet(setId: string): Promise<void>;
  updateSet(setId: string, patch: SetPatch): Promise<void>;
  completeSet(setId: string, values: SetPatch): Promise<void>;
  uncompleteSet(setId: string): Promise<void>;
  setRest(workoutId: string, restEndsAt: number | null, notificationId: string | null): Promise<void>;
  /** Termina el entreno: descarta series sin completar y ejercicios vacíos. */
  finish(workoutId: string): Promise<void>;
  /** Cierra la edición de un entreno terminado (descarta series sin marcar). */
  saveEdits(workoutId: string): Promise<void>;
  /** Nombre, nota, fecha y duración de un entreno terminado. */
  updateDetails(workoutId: string, patch: WorkoutDetailsPatch): Promise<void>;
  softDelete(workoutId: string): Promise<void>;
  /** Series del último entreno terminado con ese ejercicio («anterior»), opcionalmente de una rutina. */
  lastSessionSets(exerciseId: string, excludeWorkoutId: string | null, routineId?: string | null): Promise<WorkoutSet[]>;
  /** Series de trabajo por grupo muscular desde una fecha (estadísticas). */
  muscleSets(fromMs: number): Promise<MuscleSetCount[]>;
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

/** Datos de la app Fitness: anillos por día y entrenos del Watch. */
export interface ActivityRepository {
  range(from: LocalDate, to: LocalDate): Promise<ActivityDay[]>;
  /** Lo último que llega manda; lo que no viene no se toca. Devuelve cuántos días cambian. */
  saveDays(days: readonly IncomingActivityDay[]): Promise<number>;
  workouts(from: LocalDate, to: LocalDate): Promise<ExternalWorkout[]>;
  /** Guarda entrenos sin duplicarlos (por su id de Salud). */
  saveWorkouts(list: readonly IncomingExternalWorkout[]): Promise<number>;
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
  /** Comidas con foto (la galería de platos), de la más reciente a la más antigua. */
  withPhotos(): Promise<Meal[]>;
}

export interface PendingPhotoRepository {
  list(): Promise<PendingPhoto[]>;
  get(id: string): Promise<PendingPhoto | null>;
  create(input: PendingPhotoInput): Promise<string>;
  markFailed(id: string, error: string): Promise<void>;
  /** Ya analizada o pasada a mano: deja de estar pendiente. */
  resolve(id: string): Promise<void>;
}

/** Lo que la app aprende de tus comidas para mejorar el análisis de fotos. */
export interface FoodMemoryRepository {
  list(): Promise<FoodMemory[]>;
  learn(entries: readonly LearnEntry[]): Promise<void>;
  /** Olvida todo lo aprendido. Devuelve cuántos alimentos había. */
  clear(): Promise<number>;
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
  activity: ActivityRepository;
  meals: MealRepository;
  pendingPhotos: PendingPhotoRepository;
  foodMemory: FoodMemoryRepository;
};
