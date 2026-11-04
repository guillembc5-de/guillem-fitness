import type { StepSource } from './enums';
import type { LocalDate } from './localDay';
import type { Sex, SyncMeta } from './types';

export type StepDay = SyncMeta & {
  localDate: LocalDate;
  steps: number;
  distanceM: number;
  kcal: number;
  source: StepSource;
  /** Objetivo vigente ese día. */
  goalSnapshot: number;
  isDemo: boolean;
};

/** Pasos de un día tal y como los da una fuente. */
export type IncomingStepDay = { localDate: LocalDate; steps: number; source: StepSource };

/** Datos del perfil necesarios para calcular distancia, kcal y objetivo. */
export type StepContext = {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  stepGoal: number;
  today: LocalDate;
};
