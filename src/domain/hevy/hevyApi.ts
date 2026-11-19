import { SET_TYPES, type SetType } from '../enums';
import type { HevyExercise, HevyWorkout } from './hevyTypes';

/**
 * Entrenos tal y como los da la API de Hevy (solo con Hevy Pro):
 * GET https://api.hevyapp.com/v1/workouts → { page, page_count, workouts }.
 * Se valida campo a campo: lo que no encaja se descarta sin romper la importación.
 */
export type HevyApiPage = { page: number; pageCount: number; workouts: HevyWorkout[]; updatedAt: number[] };

function obj(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function n(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function s(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function setType(value: unknown): SetType {
  return typeof value === 'string' && (SET_TYPES as readonly string[]).includes(value) ? (value as SetType) : 'normal';
}

export function parseHevyApiWorkout(raw: unknown): HevyWorkout | null {
  const w = obj(raw);
  if (!w) return null;
  const startedAt = Date.parse(s(w.start_time) ?? '');
  const endedAt = Date.parse(s(w.end_time) ?? '');
  if (!Number.isFinite(startedAt)) return null;
  const exercises: HevyExercise[] = [];
  for (const rawExercise of Array.isArray(w.exercises) ? w.exercises : []) {
    const e = obj(rawExercise);
    const title = s(e?.title);
    if (!e || !title) continue;
    const sets = (Array.isArray(e.sets) ? e.sets : []).flatMap((rawSet) => {
      const set = obj(rawSet);
      if (!set) return [];
      const duration = n(set.duration_seconds);
      const result = {
        type: setType(set.type),
        weightKg: n(set.weight_kg),
        reps: n(set.reps),
        distanceM: n(set.distance_meters),
        durationS: duration !== null && duration > 0 ? Math.round(duration) : null,
        rpe: n(set.rpe),
      };
      const empty = result.reps === null && result.durationS === null && result.distanceM === null && result.weightKg === null;
      return empty ? [] : [result];
    });
    if (sets.length === 0) continue;
    const superset = n(e.superset_id);
    exercises.push({
      title: title.replace(/\s+/g, ' '),
      templateId: s(e.exercise_template_id),
      notes: s(e.notes),
      supersetKey: superset === null ? null : `${startedAt}-${superset}`,
      sets,
    });
  }
  if (exercises.length === 0) return null;
  return {
    title: s(w.title) ?? 'Entreno',
    startedAt,
    endedAt: Number.isFinite(endedAt) ? Math.max(startedAt, endedAt) : startedAt,
    description: s(w.description),
    exercises,
  };
}

export function parseHevyApiPage(raw: unknown): HevyApiPage {
  const page = obj(raw);
  if (!page || !Array.isArray(page.workouts)) throw new Error('Respuesta de Hevy inesperada');
  const workouts: HevyWorkout[] = [];
  const updatedAt: number[] = [];
  for (const rawWorkout of page.workouts) {
    const workout = parseHevyApiWorkout(rawWorkout);
    const updated = Date.parse(s(obj(rawWorkout)?.updated_at) ?? '');
    updatedAt.push(Number.isFinite(updated) ? updated : 0);
    if (workout) workouts.push(workout);
  }
  return { page: n(page.page) ?? 1, pageCount: n(page.page_count) ?? 1, workouts, updatedAt };
}
