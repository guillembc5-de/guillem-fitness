import { create } from 'zustand';

import type { SetType, TrackingType } from '@/domain/enums';
import { fromDisplayWeight, toDisplayWeight } from '@/domain/format';
import { parseDecimal, toInputText } from '@/domain/parseNumber';
import type { WeightUnit } from '@/domain/types';
import type { Exercise, RoutineDetail, RoutineDraft } from '@/domain/workoutTypes';

/**
 * Borrador del editor de rutinas. Vive fuera de la pantalla para que el
 * selector de ejercicios (otra pantalla) pueda añadir ejercicios.
 */

export type DraftSet = { key: string; setType: SetType; weight: string; reps: string; duration: string };

export type DraftExercise = {
  key: string;
  exerciseId: string;
  name: string;
  trackingType: TrackingType;
  restSeconds: number | null;
  sets: DraftSet[];
};

type State = {
  routineId: string | null;
  name: string;
  exercises: DraftExercise[];
  dirty: boolean;
  load: (routine: RoutineDetail | null, unit: WeightUnit) => void;
  setName: (name: string) => void;
  addExercises: (list: readonly Exercise[]) => void;
  removeExercise: (key: string) => void;
  moveExercise: (key: string, delta: -1 | 1) => void;
  setRest: (key: string, seconds: number | null) => void;
  addSet: (exerciseKey: string) => void;
  removeSet: (exerciseKey: string, setKey: string) => void;
  updateSet: (exerciseKey: string, setKey: string, patch: Partial<Omit<DraftSet, 'key'>>) => void;
};

let counter = 0;
const key = () => `k${++counter}`;

function emptySet(): DraftSet {
  return { key: key(), setType: 'normal', weight: '', reps: '', duration: '' };
}

export const useRoutineDraft = create<State>((set) => ({
  routineId: null,
  name: '',
  exercises: [],
  dirty: false,
  load: (routine, unit) =>
    set({
      routineId: routine?.id ?? null,
      name: routine?.name ?? '',
      dirty: false,
      exercises: (routine?.exercises ?? []).map((e) => ({
        key: key(),
        exerciseId: e.exercise.id,
        name: e.exercise.name,
        trackingType: e.exercise.trackingType,
        restSeconds: e.restSeconds,
        sets: e.sets.map((s) => ({
          key: key(),
          setType: s.setType,
          weight: s.targetWeightKg !== null ? toInputText(toDisplayWeight(s.targetWeightKg, unit), 2) : '',
          reps: s.targetReps !== null ? String(s.targetReps) : '',
          duration: s.targetDurationS !== null ? String(s.targetDurationS) : '',
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
          sets: [emptySet(), emptySet(), emptySet()],
        })),
      ],
    })),
  removeExercise: (k) => set((st) => ({ dirty: true, exercises: st.exercises.filter((e) => e.key !== k) })),
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
  setRest: (k, seconds) =>
    set((st) => ({ dirty: true, exercises: st.exercises.map((e) => (e.key === k ? { ...e, restSeconds: seconds } : e)) })),
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
      notes: null,
      sets: e.sets.map((s) => {
        const reps = parseDecimal(s.reps);
        const duration = parseDecimal(s.duration);
        const weight = parseDecimal(s.weight);
        return {
          setType: s.setType,
          targetWeightKg: weight !== null ? fromDisplayWeight(weight, unit) : null,
          targetReps: reps !== null ? Math.round(reps) : null,
          targetDurationS: duration !== null ? Math.round(duration) : null,
        };
      }),
    })),
  };
}
