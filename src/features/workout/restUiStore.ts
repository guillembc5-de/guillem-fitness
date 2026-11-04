import { create } from 'zustand';

/**
 * Duración total del descanso en curso, solo para dibujar la barra de progreso.
 * Si la app se cierra se pierde y la barra se calcula con lo que queda;
 * la cuenta atrás en sí sale siempre de workout.restEndsAt.
 */
type State = {
  endsAt: number | null;
  totalMs: number | null;
  set: (endsAt: number | null, totalMs: number | null) => void;
};

export const useRestUi = create<State>((set) => ({
  endsAt: null,
  totalMs: null,
  set: (endsAt, totalMs) => set({ endsAt, totalMs }),
}));
