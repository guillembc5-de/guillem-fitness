import { create } from 'zustand';

import type { SetType, TrackingType } from '@/domain/enums';
import { fromDisplayWeight, toDisplayWeight } from '@/domain/format';
import { parseDecimal, toInputText } from '@/domain/parseNumber';
import type { WeightUnit } from '@/domain/types';
import type { Exercise, RoutineDetail, RoutineDraft } from '@/domain/workoutTypes';
import { newId } from '@/lib/ids';

/**
 * Borrador del editor de rutinas. Vive fuera de la pantalla para que el
 * selector de ejercicios (otra pantalla) pueda añadir o sustituir ejercicios.
 */

/** En cardio (distancia y tiempo) «distance» va en km y «duration» en minutos. */
export type DraftSet = { key: string; setType: SetType; weight: string; reps: string; duration: string; distance: string };

export type DraftExercise = {
  key: string;
  exerciseId: string;
  name: string;
  trackingType: TrackingType;
  restSeconds: number | null;
  notes: string;
  supersetId: string | null;
  sets: DraftSet[];
};

type State = {
  routineId: string | null;
  name: string;
  exercises: DraftExercise[];
  dirty: boolean;
  /** Ejercicio que se está sustituyendo desde el selector (null = se añaden). */
  replacingKey: string | null;
  load: (routine: RoutineDetail | null, unit: WeightUnit) => void;
  setName: (name: string) => void;
  addExercises: (list: readonly Exercise[]) => void;
  startReplacing: (key: string | null) => void;
  replaceExercise: (key: string, exercise: Exercise) => void;
  removeExercise: (key: string) => void;
  moveExercise: (key: string, delta: -1 | 1) => void;
  reorderExercises: (keys: readonly string[]) => void;
  setRest: (key: string, seconds: number | null) => void;
  setNotes: (key: string, notes: string) => void;
  joinSuperset: (key: string, withKey: string) => void;
  leaveSuperset: (key: string) => void;
  addSet: (exerciseKey: string) => void;
  removeSet: (exerciseKey: string, setKey: string) => void;
  updateSet: (exerciseKey: string, setKey: string, patch: Partial<Omit<DraftSet, 'key'>>) => void;
};

let counter = 0;
const key = () => `k${++counter}`;

function emptySet(): DraftSet {
  return { key: key(), setType: 'normal', weight: '', reps: '', duration: '', distance: '' };
}

/** Si una superserie se queda con un solo ejercicio, deja de serlo. */
function dropLonelySupersets(list: DraftExercise[]): DraftExercise[] {
  const counts = new Map<string, number>();
  for (const e of list) if (e.supersetId) counts.set(e.supersetId, (counts.get(e.supersetId) ?? 0) + 1);
  return list.map((e) => (e.supersetId && (counts.get(e.supersetId) ?? 0) < 2 ? { ...e, supersetId: null } : e));
}

export const useRoutineDraft = create<State>((set) => ({
  routineId: null,
  name: '',
  exercises: [],
  dirty: false,
  replacingKey: null,
  load: (routine, unit) =>
    set({
      routineId: routine?.id ?? null,
      name: routine?.name ?? '',
      dirty: false,
      replacingKey: null,
      exercises: (routine?.exercises ?? []).map((e) => ({
        key: key(),
        exerciseId: e.exercise.id,
        name: e.exercise.name,
        trackingType: e.exercise.trackingType,
        restSeconds: e.restSeconds,
        notes: e.notes ?? '',
        supersetId: e.supersetId,
        sets: e.sets.map((s) => ({
          key: key(),
          setType: s.setType,
          weight: s.targetWeightKg !== null ? toInputText(toDisplayWeight(s.targetWeightKg, unit), 2) : '',
          reps: s.targetReps !== null ? String(s.targetReps) : '',
          duration:
            s.targetDurationS === null
              ? ''
              : e.exercise.trackingType === 'distance_duration'
                ? toInputText(s.targetDurationS / 60, 1)
                : String(s.targetDurationS),
          distance: s.targetDistanceM !== null ? toInputText(s.targetDistanceM / 1000, 2) : '',
        })),
      })),
    }),
  setName: (name) => set({ name, dirty: true }),
  addExercises: (list) =>
    set((st) => ({
      dirty: true,
      exercises: [
        ...st.exercises,
        ...list.map((e) => ({
          key: key(),
          exerciseId: e.id,
          name: e.name,
          trackingType: e.trackingType,
          restSeconds: null,
          notes: '',
          supersetId: null,
          sets: [emptySet(), emptySet(), emptySet()],
        })),
      ],
    })),
  startReplacing: (k) => set({ replacingKey: k }),
  replaceExercise: (k, e) =>
    set((st) => ({
      dirty: true,
      replacingKey: null,
      exercises: st.exercises.map((x) =>
        x.key === k
          ? {
              ...x,
              exerciseId: e.id,
              name: e.name,
              trackingType: e.trackingType,
              // Otro tipo de registro (p. ej. de peso a tiempo): los objetivos ya no sirven.
              sets: x.trackingType === e.trackingType ? x.sets : x.sets.map((s) => ({ ...s, weight: '', reps: '', duration: '', distance: '' })),
            }
          : x,
      ),
    })),
  removeExercise: (k) => set((st) => ({ dirty: true, exercises: dropLonelySupersets(st.exercises.filter((e) => e.key !== k)) })),
  moveExercise: (k, delta) =>
    set((st) => {
      const i = st.exercises.findIndex((e) => e.key === k);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= st.exercises.length) return st;
      const next = [...st.exercises];
      const a = next[i];
      const b = next[j];
      if (!a || !b) return st;
      next[i] = b;
      next[j] = a;
      return { dirty: true, exercises: next };
    }),
  reorderExercises: (keys) =>
    set((st) => {
      const byKey = new Map(st.exercises.map((e) => [e.key, e]));
      const first = keys.flatMap((k) => {
        const e = byKey.get(k);
        byKey.delete(k);
        return e ? [e] : [];
      });
      return { dirty: true, exercises: [...first, ...byKey.values()] };
    }),
  setRest: (k, seconds) =>
    set((st) => ({ dirty: true, exercises: st.exercises.map((e) => (e.key === k ? { ...e, restSeconds: seconds } : e)) })),
  setNotes: (k, notes) => set((st) => ({ dirty: true, exercises: st.exercises.map((e) => (e.key === k ? { ...e, notes } : e)) })),
  joinSuperset: (k, withKey) =>
    set((st) => {
      const target = st.exercises.find((e) => e.key === withKey);
      const moving = st.exercises.find((e) => e.key === k);
      if (!target || !moving) return st;
      const supersetId = target.supersetId ?? newId();
      // Se coloca justo después del último ejercicio del grupo.
      const others = st.exercises
        .filter((e) => e.key !== k)
        .map((e) => (e.key === withKey ? { ...e, supersetId } : e));
      const lastIndex = Math.max(...others.map((e, i) => (e.supersetId === supersetId ? i : -1)));
      others.splice(lastIndex + 1, 0, { ...moving, supersetId });
      return { dirty: true, exercises: dropLonelySupersets(others) };
    }),
  leaveSuperset: (k) =>
    set((st) => ({
      dirty: true,
      exercises: dropLonelySupersets(st.exercises.map((e) => (e.key === k ? { ...e, supersetId: null } : e))),
    })),
  addSet: (k) =>
    set((st) => ({
      dirty: true,
      exercises: st.exercises.map((e) => {
        if (e.key !== k) return e;
        const last = e.sets[e.sets.length - 1];
        return { ...e, sets: [...e.sets, last ? { ...last, key: key(), setType: 'normal' } : emptySet()] };
      }),
    })),
  removeSet: (k, sk) =>
    set((st) => ({
      dirty: true,
      exercises: st.exercises.map((e) => (e.key === k ? { ...e, sets: e.sets.filter((s) => s.key !== sk) } : e)),
    })),
  updateSet: (k, sk, patch) =>
    set((st) => ({
      dirty: true,
      exercises: st.exercises.map((e) =>
        e.key === k ? { ...e, sets: e.sets.map((s) => (s.key === sk ? { ...s, ...patch } : s)) } : e,
      ),
    })),
}));

/** Convierte el borrador en el formato que guarda el repositorio. */
export function toRoutineDraft(name: string, exercises: readonly DraftExercise[], unit: WeightUnit): RoutineDraft {
  return {
    name: name.trim(),
    notes: null,
    exercises: exercises.map((e) => ({
      exerciseId: e.exerciseId,
      restSeconds: e.restSeconds,
      notes: e.notes.trim() || null,
      supersetId: e.supersetId,
      sets: e.sets.map((s) => {
        const reps = parseDecimal(s.reps);
        const duration = parseDecimal(s.duration);
        const weight = parseDecimal(s.weight);
        const distance = parseDecimal(s.distance);
        const cardio = e.trackingType === 'distance_duration';
        return {
          setType: s.setType,
          targetWeightKg: weight !== null ? fromDisplayWeight(weight, unit) : null,
          targetReps: reps !== null ? Math.round(reps) : null,
          targetDurationS: duration !== null ? Math.round(cardio ? duration * 60 : duration) : null,
          targetDistanceM: cardio && distance !== null ? Math.round(distance * 1000) : null,
        };
      }),
    })),
  };
}
