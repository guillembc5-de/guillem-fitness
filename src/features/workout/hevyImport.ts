import type { Repositories } from '@/data/repositories';
import { seedExerciseId } from '@/data/seed/exercises';
import { guessExercise, hevyLibrarySlug } from '@/domain/hevy/hevyExercises';
import { hevyExternalIds, hevySignature } from '@/domain/hevy/hevyKey';
import type { HevyParseResult, HevySet, HevyWorkout } from '@/domain/hevy/hevyTypes';
import { normalizeSearch } from '@/domain/text';
import type { Exercise, ImportedWorkout } from '@/domain/workoutTypes';

/**
 * Importar entrenos de Hevy, del archivo o de la API, en dos pasos:
 * 1. previewHevyImport: qué entrenos son nuevos, cuáles cambiaron y qué
 *    ejercicios habrá que crear (nada se guarda).
 * 2. runHevyImport: los guarda como entrenos terminados de la app, con sus
 *    series, kilos, repeticiones, tipo de serie, RPE, notas, superseries y cardio.
 * Así cuentan en Calorías, en el historial y en los récords igual que los tuyos.
 */

type Repos = Pick<Repositories, 'exercises' | 'routines' | 'workouts' | 'profile'>;

export type HevyItemStatus = 'new' | 'updated' | 'same' | 'deleted';

export type HevyPreview = {
  items: { workout: HevyWorkout; externalId: string; signature: string; status: HevyItemStatus }[];
  counts: Record<HevyItemStatus, number>;
  /** Primer y último entreno del archivo. */
  from: number | null;
  to: number | null;
  /** Ejercicios de Hevy que la app no tiene: se crearán con su mismo nombre. */
  newExercises: string[];
  skippedRows: number;
};

export type HevyImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  createdExercises: string[];
  /** Rutinas que se han puesto como tu último entreno de Hevy. */
  routinesUpdated: string[];
};

type Resolver = (title: string, templateId: string | null) => Exercise | null;

async function buildResolver(repos: Repos): Promise<Resolver> {
  const exercises = await repos.exercises.list();
  const byId = new Map(exercises.map((e) => [e.id, e] as const));
  // Si un nombre se repite, gana la biblioteca sobre los ejercicios propios.
  const byName = new Map<string, Exercise>();
  for (const e of [...exercises].sort((a, b) => Number(b.isCustom) - Number(a.isCustom))) byName.set(e.searchName, e);
  return (title, templateId) => {
    const slug = hevyLibrarySlug(title, templateId);
    if (slug) {
      const found = byId.get(seedExerciseId(slug));
      if (found) return found;
    }
    return byName.get(normalizeSearch(title)) ?? null;
  };
}

export async function previewHevyImport(parsed: HevyParseResult, repos: Repos): Promise<HevyPreview> {
  const ids = hevyExternalIds(parsed.workouts);
  const states = await repos.workouts.externalStates('hevy:');
  const resolve = await buildResolver(repos);
  const counts: Record<HevyItemStatus, number> = { new: 0, updated: 0, same: 0, deleted: 0 };
  const items = parsed.workouts.map((workout, i) => {
    const externalId = ids[i] ?? '';
    const signature = hevySignature(workout);
    const state = states.get(externalId);
    const status: HevyItemStatus = !state ? 'new' : state.deleted ? 'deleted' : state.signature === signature ? 'same' : 'updated';
    counts[status] += 1;
    return { workout, externalId, signature, status };
  });
  const missing = new Map<string, string>();
  for (const w of parsed.workouts) {
    for (const e of w.exercises) {
      if (!resolve(e.title, e.templateId)) missing.set(normalizeSearch(e.title), e.title);
    }
  }
  const times = parsed.workouts.map((w) => w.startedAt);
  return {
    items,
    counts,
    from: times.length > 0 ? Math.min(...times) : null,
    to: times.length > 0 ? Math.max(...times) : null,
    newExercises: [...missing.values()].sort((a, b) => a.localeCompare(b, 'es')),
    skippedRows: parsed.skippedRows,
  };
}

export async function runHevyImport(preview: HevyPreview, options: { updateRoutines: boolean }, repos: Repos): Promise<HevyImportResult> {
  const resolveKnown = await buildResolver(repos);
  const profile = await repos.profile.get();
  const defaultRest = profile?.defaultRestSeconds ?? 150;

  // 1. Ejercicios que la app no tiene: se crean con el nombre de Hevy.
  const created = new Map<string, Exercise>();
  const setsByTitle = new Map<string, HevySet[]>();
  for (const { workout } of preview.items) {
    for (const e of workout.exercises) {
      const key = normalizeSearch(e.title);
      setsByTitle.set(key, [...(setsByTitle.get(key) ?? []), ...e.sets]);
    }
  }
  for (const { workout } of preview.items) {
    for (const e of workout.exercises) {
      const key = normalizeSearch(e.title);
      if (resolveKnown(e.title, e.templateId) || created.has(key)) continue;
      const guess = guessExercise(e.title, setsByTitle.get(key) ?? e.sets);
      created.set(key, await repos.exercises.create({ name: e.title, ...guess, defaultRestSeconds: null, notes: null }));
    }
  }
  const resolve = (title: string, templateId: string | null): Exercise | null =>
    resolveKnown(title, templateId) ?? created.get(normalizeSearch(title)) ?? null;

  // 2. Rutina de cada entreno: la tuya que se llame igual (con sus descansos).
  const routines = await repos.routines.list();
  const routineByName = new Map(routines.map((r) => [normalizeSearch(r.name), r] as const));
  const restCache = new Map<string, Map<string, number>>();
  const routineRest = async (routineId: string): Promise<Map<string, number>> => {
    const cached = restCache.get(routineId);
    if (cached) return cached;
    const detail = await repos.routines.get(routineId);
    const map = new Map<string, number>();
    for (const e of detail?.exercises ?? []) if (e.restSeconds !== null) map.set(e.exercise.id, e.restSeconds);
    restCache.set(routineId, map);
    return map;
  };

  // 3. Solo se reescriben los nuevos y los que cambiaron en Hevy.
  const toSave: ImportedWorkout[] = [];
  for (const item of preview.items) {
    if (item.status === 'same' || item.status === 'deleted') continue;
    const w = item.workout;
    const routine = routineByName.get(normalizeSearch(w.title)) ?? null;
    const rests = routine ? await routineRest(routine.id) : new Map<string, number>();
    const exercises: ImportedWorkout['exercises'] = [];
    for (const e of w.exercises) {
      const exercise = resolve(e.title, e.templateId);
      if (!exercise) continue;
      exercises.push({
        exerciseId: exercise.id,
        nameSnapshot: e.title,
        restSeconds: rests.get(exercise.id) ?? exercise.defaultRestSeconds ?? defaultRest,
        notes: e.notes,
        supersetId: e.supersetKey ? `${item.externalId}|${e.supersetKey}` : null,
        sets: e.sets.map((s) => ({
          setType: s.type,
          weightKg: s.weightKg,
          reps: s.reps !== null ? Math.round(s.reps) : null,
          durationS: s.durationS,
          distanceM: s.distanceM,
          rpe: s.rpe,
        })),
      });
    }
    if (exercises.length === 0) continue;
    toSave.push({
      externalId: item.externalId,
      signature: item.signature,
      name: w.title,
      startedAt: w.startedAt,
      endedAt: w.endedAt,
      notes: w.description,
      routineId: routine?.id ?? null,
      exercises,
    });
  }
  const counts = await repos.workouts.importExternal(toSave);

  // 4. Como en Hevy: cada rutina queda como tu último entreno con ella.
  const routinesUpdated: string[] = [];
  if (options.updateRoutines) {
    const states = await repos.workouts.externalStates('hevy:');
    const latest = new Map<string, { externalId: string; startedAt: number; changed: boolean }>();
    for (const { workout, externalId, status } of preview.items) {
      const key = normalizeSearch(workout.title);
      const current = latest.get(key);
      if (routineByName.has(key) && (!current || workout.startedAt > current.startedAt)) {
        latest.set(key, { externalId, startedAt: workout.startedAt, changed: status === 'new' || status === 'updated' });
      }
    }
    // Solo si ese último entreno acaba de entrar o de cambiar: reimportar no toca nada.
    for (const [key, { externalId, changed }] of latest) {
      const routine = routineByName.get(key);
      const state = states.get(externalId);
      if (!routine || !state || state.deleted || !changed) continue;
      await repos.routines.saveFromWorkout(state.id, routine.id, routine.name);
      routinesUpdated.push(routine.name);
    }
  }

  return { ...counts, createdExercises: [...created.values()].map((e) => e.name), routinesUpdated };
}
