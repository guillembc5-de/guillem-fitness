import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { getRepositories, type StartWorkoutParams } from '@/data/repositories';
import type { ExerciseInput, RoutineDraft, SetPatch, WorkoutDetailsPatch } from '@/domain/workoutTypes';

export const workoutKeys = {
  routines: ['routines'] as const,
  folders: ['routineFolders'] as const,
  muscleSets: (fromMs: number) => ['muscleSets', fromMs] as const,
  routine: (id: string) => ['routine', id] as const,
  exercises: ['exercises'] as const,
  exercise: (id: string) => ['exercise', id] as const,
  exerciseHistory: (id: string) => ['exerciseHistory', id] as const,
  active: ['activeWorkout'] as const,
  workouts: ['workouts'] as const,
  workout: (id: string) => ['workout', id] as const,
  previous: (workoutId: string, exerciseIds: readonly string[]) => ['previousSets', workoutId, ...exerciseIds] as const,
  bests: (workoutId: string, exerciseIds: readonly string[], before: number | null) =>
    ['bests', workoutId, before, ...exerciseIds] as const,
};

const repos = () => getRepositories();

// ---------- Rutinas ----------

export function useRoutines() {
  return useQuery({ queryKey: workoutKeys.routines, queryFn: () => repos().routines.list() });
}

export function useRoutine(id: string) {
  return useQuery({ queryKey: workoutKeys.routine(id), queryFn: () => repos().routines.get(id) });
}

function invalidateRoutines(client: QueryClient) {
  void client.invalidateQueries({ queryKey: workoutKeys.routines });
  void client.invalidateQueries({ queryKey: workoutKeys.folders });
  void client.invalidateQueries({ queryKey: ['routine'] });
}

export function useRoutineFolders() {
  return useQuery({ queryKey: workoutKeys.folders, queryFn: () => repos().routines.listFolders() });
}

export function useFolderActions() {
  const client = useQueryClient();
  const done = () => invalidateRoutines(client);
  return {
    create: useMutation({ mutationFn: (name: string) => repos().routines.createFolder(name), onSuccess: done }),
    rename: useMutation({ mutationFn: (a: { id: string; name: string }) => repos().routines.renameFolder(a.id, a.name), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => repos().routines.deleteFolder(id), onSuccess: done }),
    move: useMutation({
      mutationFn: (a: { routineId: string; folderId: string | null }) => repos().routines.moveToFolder(a.routineId, a.folderId),
      onSuccess: done,
    }),
  };
}

/** Guarda un entreno como rutina nueva o actualiza la suya. */
export function useSaveWorkoutAsRoutine() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (a: { workoutId: string; routineId: string | null; name: string }) =>
      repos().routines.saveFromWorkout(a.workoutId, a.routineId, a.name),
    onSuccess: () => invalidateRoutines(client),
  });
}

export function useSaveRoutine() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, draft }: { id: string | null; draft: RoutineDraft }) => repos().routines.save(id, draft),
    onSuccess: () => invalidateRoutines(client),
  });
}

export function useDuplicateRoutine() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().routines.duplicate(id), onSuccess: () => invalidateRoutines(client) });
}

export function useDeleteRoutine() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().routines.softDelete(id), onSuccess: () => invalidateRoutines(client) });
}

export function useReorderRoutines() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => repos().routines.reorder(ids),
    onSuccess: () => invalidateRoutines(client),
  });
}

// ---------- Ejercicios ----------

export function useExercises() {
  return useQuery({ queryKey: workoutKeys.exercises, queryFn: () => repos().exercises.list() });
}

export function useExercise(id: string) {
  return useQuery({ queryKey: workoutKeys.exercise(id), queryFn: () => repos().exercises.get(id) });
}

export function useExerciseHistory(id: string) {
  return useQuery({ queryKey: workoutKeys.exerciseHistory(id), queryFn: () => repos().exercises.history(id) });
}

function invalidateExercises(client: QueryClient) {
  void client.invalidateQueries({ queryKey: workoutKeys.exercises });
  void client.invalidateQueries({ queryKey: ['exercise'] });
  invalidateRoutines(client);
}

export function useCreateExercise() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (input: ExerciseInput) => repos().exercises.create(input), onSuccess: () => invalidateExercises(client) });
}

export function useUpdateExercise() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExerciseInput }) => repos().exercises.update(id, input),
    onSuccess: () => invalidateExercises(client),
  });
}

export function useSetExerciseRest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, seconds }: { id: string; seconds: number | null }) => repos().exercises.setDefaultRest(id, seconds),
    onSuccess: () => invalidateExercises(client),
  });
}

export function useDeleteExercise() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().exercises.softDelete(id), onSuccess: () => invalidateExercises(client) });
}

// ---------- Entrenos ----------

export function useActiveWorkout() {
  return useQuery({ queryKey: workoutKeys.active, queryFn: () => repos().workouts.getActive() });
}

export function useWorkouts() {
  return useQuery({ queryKey: workoutKeys.workouts, queryFn: () => repos().workouts.list() });
}

export function useWorkout(id: string) {
  return useQuery({ queryKey: workoutKeys.workout(id), queryFn: () => repos().workouts.get(id) });
}

/** Lo que hiciste la última vez en cada ejercicio del entreno. */
export function usePreviousSets(workoutId: string, exerciseIds: readonly string[], routineId: string | null = null) {
  return useQuery({
    queryKey: [...workoutKeys.previous(workoutId, exerciseIds), routineId],
    queryFn: async () => {
      const entries = await Promise.all(
        exerciseIds.map(async (id) => [id, await repos().workouts.lastSessionSets(id, workoutId, routineId)] as const),
      );
      return Object.fromEntries(entries);
    },
  });
}

/**
 * Mejores marcas anteriores a este entreno, para detectar récords.
 * `beforeStartedAt`: para entrenos ya terminados, solo cuenta los anteriores.
 */
export function useHistoryBests(workoutId: string, exerciseIds: readonly string[], beforeStartedAt?: number) {
  return useQuery({
    queryKey: workoutKeys.bests(workoutId, exerciseIds, beforeStartedAt ?? null),
    queryFn: () => repos().workouts.historyBests(exerciseIds, workoutId, beforeStartedAt),
  });
}

/** Series por músculo desde una fecha (estadísticas). */
export function useMuscleSets(fromMs: number) {
  return useQuery({ queryKey: workoutKeys.muscleSets(fromMs), queryFn: () => repos().workouts.muscleSets(fromMs) });
}

function invalidateWorkouts(client: QueryClient) {
  void client.invalidateQueries({ queryKey: workoutKeys.active });
  void client.invalidateQueries({ queryKey: ['muscleSets'] });
  void client.invalidateQueries({ queryKey: workoutKeys.workouts });
  void client.invalidateQueries({ queryKey: ['workout'] });
  void client.invalidateQueries({ queryKey: ['exerciseHistory'] });
  void client.invalidateQueries({ queryKey: ['previousSets'] });
  void client.invalidateQueries({ queryKey: ['bests'] });
}

export function useStartWorkout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (params: StartWorkoutParams) => repos().workouts.start(params),
    onSuccess: () => invalidateWorkouts(client),
  });
}

export function useFinishWorkout() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().workouts.finish(id), onSuccess: () => invalidateWorkouts(client) });
}

export function useRepeatWorkout() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().workouts.repeat(id), onSuccess: () => invalidateWorkouts(client) });
}

export function useSaveWorkoutEdits() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().workouts.saveEdits(id), onSuccess: () => invalidateWorkouts(client) });
}

export function useUpdateWorkoutDetails() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (a: { id: string; patch: WorkoutDetailsPatch }) => repos().workouts.updateDetails(a.id, a.patch),
    onSuccess: () => invalidateWorkouts(client),
  });
}

export function useDeleteWorkout() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (id: string) => repos().workouts.softDelete(id), onSuccess: () => invalidateWorkouts(client) });
}

/** Cambios dentro de un entreno (el activo o uno que se está editando). */
function useActiveMutation<T>(fn: (args: T) => Promise<void>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: workoutKeys.active });
      void client.invalidateQueries({ queryKey: ['workout'] });
    },
  });
}

export function useWorkoutActions() {
  const w = () => repos().workouts;
  return {
    addExercise: useActiveMutation((a: { workoutId: string; exerciseId: string; restSeconds: number }) =>
      w().addExercise(a.workoutId, a.exerciseId, a.restSeconds),
    ),
    removeExercise: useActiveMutation((id: string) => w().removeExercise(id)),
    setExerciseRest: useActiveMutation((a: { workoutExerciseId: string; seconds: number }) => w().setExerciseRest(a.workoutExerciseId, a.seconds)),
    setNotes: useActiveMutation((a: { workoutExerciseId: string; notes: string | null }) => w().setExerciseNotes(a.workoutExerciseId, a.notes)),
    moveExercise: useActiveMutation((a: { workoutExerciseId: string; delta: -1 | 1 }) => w().moveExercise(a.workoutExerciseId, a.delta)),
    reorderExercises: useActiveMutation((a: { workoutId: string; orderedIds: readonly string[] }) => w().reorderExercises(a.workoutId, a.orderedIds)),
    replaceExercise: useActiveMutation((a: { workoutExerciseId: string; exerciseId: string }) => w().replaceExercise(a.workoutExerciseId, a.exerciseId)),
    joinSuperset: useActiveMutation((a: { workoutExerciseId: string; withId: string }) => w().joinSuperset(a.workoutExerciseId, a.withId)),
    leaveSuperset: useActiveMutation((workoutExerciseId: string) => w().leaveSuperset(workoutExerciseId)),
    addWarmups: useActiveMutation((a: { workoutExerciseId: string; sets: { weightKg: number; reps: number }[] }) =>
      w().addWarmupSets(a.workoutExerciseId, a.sets),
    ),
    addSet: useActiveMutation((workoutExerciseId: string) => w().addSet(workoutExerciseId)),
    removeSet: useActiveMutation((setId: string) => w().removeSet(setId)),
    updateSet: useActiveMutation((a: { setId: string; patch: SetPatch }) => w().updateSet(a.setId, a.patch)),
    completeSet: useActiveMutation((a: { setId: string; values: SetPatch }) => w().completeSet(a.setId, a.values)),
    uncompleteSet: useActiveMutation((setId: string) => w().uncompleteSet(setId)),
    setRest: useActiveMutation((a: { workoutId: string; restEndsAt: number | null; notificationId: string | null }) =>
      w().setRest(a.workoutId, a.restEndsAt, a.notificationId),
    ),
  };
}
