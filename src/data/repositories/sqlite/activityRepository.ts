import { and, asc, between, eq, isNull } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { activityDay, externalWorkout } from '@/data/db/schema';
import type { ActivityDay, ExternalWorkout, FitnessSource, IncomingActivityDay, IncomingExternalWorkout } from '@/domain/fitnessTypes';
import type { LocalDate } from '@/domain/localDay';
import { newId, now } from '@/lib/ids';

import type { ActivityRepository } from '../interfaces';
import { newMeta } from './mappers';

function toActivityDay(row: typeof activityDay.$inferSelect): ActivityDay {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    localDate: row.localDate,
    activeKcal: row.activeKcal,
    exerciseMin: row.exerciseMin,
    source: row.source === 'shortcut' ? 'shortcut' : 'healthkit',
  };
}

function toWorkout(row: typeof externalWorkout.$inferSelect): ExternalWorkout {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    externalId: row.externalId,
    localDate: row.localDate,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    activityType: row.activityType,
    durationS: row.durationS,
    kcal: row.kcal,
    distanceM: row.distanceM,
    sourceName: row.sourceName,
  };
}

/** Un valor que llega: número válido o «no viene». Un 0 de Salud puede ser falta de permiso: no borra lo que hay. */
function incoming(value: number | null | undefined): number | undefined {
  return value !== null && value !== undefined && Number.isFinite(value) && value > 0 ? value : undefined;
}

export class SqliteActivityRepository implements ActivityRepository {
  constructor(private readonly db: Db) {}

  async range(from: LocalDate, to: LocalDate): Promise<ActivityDay[]> {
    return this.db
      .select()
      .from(activityDay)
      .where(and(between(activityDay.localDate, from, to), isNull(activityDay.deletedAt)))
      .orderBy(asc(activityDay.localDate))
      .all()
      .map(toActivityDay);
  }

  /**
   * Lo último que llega manda (los anillos de hoy crecen durante el día).
   * Solo se guardan los datos que vienen; un dato ausente o 0 no borra el anterior.
   */
  async saveDays(days: readonly IncomingActivityDay[]): Promise<number> {
    const timestamp = now();
    let changed = 0;
    this.db.transaction((tx) => {
      for (const d of days) {
        const kcal = incoming(d.activeKcal);
        const minutes = incoming(d.exerciseMin);
        if (kcal === undefined && minutes === undefined) continue;
        const existing = tx.select().from(activityDay).where(eq(activityDay.localDate, d.localDate)).get();
        const next = {
          activeKcal: kcal === undefined ? (existing?.activeKcal ?? null) : Math.round(kcal),
          exerciseMin: minutes === undefined ? (existing?.exerciseMin ?? null) : Math.round(minutes),
          source: d.source satisfies FitnessSource,
        };
        if (!existing) {
          tx.insert(activityDay)
            .values({ ...newMeta(newId(), timestamp), localDate: d.localDate, ...next })
            .run();
          changed += 1;
        } else if (existing.deletedAt !== null || existing.activeKcal !== next.activeKcal || existing.exerciseMin !== next.exerciseMin) {
          tx.update(activityDay)
            .set({ ...next, deletedAt: null, updatedAt: timestamp })
            .where(eq(activityDay.id, existing.id))
            .run();
          changed += 1;
        }
      }
    });
    return changed;
  }

  async workouts(from: LocalDate, to: LocalDate): Promise<ExternalWorkout[]> {
    return this.db
      .select()
      .from(externalWorkout)
      .where(and(between(externalWorkout.localDate, from, to), isNull(externalWorkout.deletedAt)))
      .orderBy(asc(externalWorkout.startedAt))
      .all()
      .map(toWorkout);
  }

  async saveWorkouts(list: readonly IncomingExternalWorkout[]): Promise<number> {
    const timestamp = now();
    let changed = 0;
    this.db.transaction((tx) => {
      for (const w of list) {
        const existing = tx.select().from(externalWorkout).where(eq(externalWorkout.externalId, w.externalId)).get();
        if (!existing) {
          tx.insert(externalWorkout)
            .values({ ...newMeta(newId(), timestamp), ...w })
            .run();
          changed += 1;
        } else if (existing.deletedAt === null && (existing.durationS !== w.durationS || existing.kcal !== w.kcal)) {
          // Un entreno que borraste en la app no vuelve; uno que Salud corrige, se actualiza.
          tx.update(externalWorkout)
            .set({ ...w, updatedAt: timestamp })
            .where(eq(externalWorkout.id, existing.id))
            .run();
          changed += 1;
        }
      }
    });
    return changed;
  }
}
