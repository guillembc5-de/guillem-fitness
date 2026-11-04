import type { StepSource } from '@/domain/enums';
import type { LocalDate } from '@/domain/localDay';

/** Una fuente de pasos (Salud, Health Connect o el sensor del móvil). */
export interface StepsProvider {
  readonly source: StepSource;
  /** Cuántos días hacia atrás puede dar. */
  readonly historyDays: number;
  isAvailable(): Promise<boolean>;
  /** Muestra el diálogo de permisos del sistema. true si (aparentemente) se concedió. */
  requestPermission(): Promise<boolean>;
  /** null = no se puede saber (HealthKit oculta las denegaciones de lectura). */
  hasPermission(): Promise<boolean | null>;
  /** Pasos por día local, de `from` a `to` (incluidos). */
  dailySteps(from: LocalDate, to: LocalDate): Promise<Map<LocalDate, number>>;
}
