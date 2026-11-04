import { and, asc, between, desc, eq, inArray, isNull, ne } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { stepDay } from '@/data/db/schema';
import type { LocalDate } from '@/domain/localDay';
import { mergeDay, stepsDistanceMeters, stepsKcal } from '@/domain/steps';
import type { StepSource } from '@/domain/enums';
import type { IncomingStepDay, StepContext, StepDay } from '@/domain/stepTypes';
import { newId, now } from '@/lib/ids';

import type { StepDayRepository } from '../interfaces';
import { newMeta } from './mappers';

function toStepDay(row: typeof stepDay.$inferSelect): StepDay {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    localDate: row.localDate,
    steps: row.steps,
    distanceM: row.distanceM,
    kcal: row.kcal,
    source: row.source,
    goalSnapshot: row.goalSnapshot,
    isDemo: row.isDemo,
  };
}

export class SqliteStepDayRepository implements StepDayRepository {
  constructor(private readonly db: Db) {}

  async range(from: LocalDate, to: LocalDate): Promise<StepDay[]> {
    return this.db
      .select()
      .from(stepDay)
      .where(and(between(stepDay.localDate, from, to), isNull(stepDay.deletedAt)))
      .orderBy(asc(stepDay.localDate))
      .all()
      .map(toStepDay);
  }

  async get(localDate: LocalDate): Promise<StepDay | null> {
    const row = this.db.select().from(stepDay).where(and(eq(stepDay.localDate, localDate), isNull(stepDay.deletedAt))).get();
    return row ? toStepDay(row) : null;
  }

  async lastDateFrom(source: StepSource): Promise<LocalDate | null> {
    const row = this.db
      .select({ d: stepDay.localDate })
      .from(stepDay)
      .where(and(eq(stepDay.source, source), isNull(stepDay.deletedAt), ne(stepDay.isDemo, true)))
      .orderBy(desc(stepDay.localDate))
      .get();
    return row?.d ?? null;
  }

  /**
   * Guarda los días que llegan de una fuente aplicando la regla de una sola
   * fuente (nunca se suman). Devuelve cuántos días han cambiado.
   */
  async saveDays(days: readonly IncomingStepDay[], ctx: StepContext): Promise<number> {
    if (days.length === 0) return 0;
    const timestamp = now();
    const existing = new Map(
      this.db
        .select()
        .from(stepDay)
        .where(inArray(stepDay.localDate, days.map((d) => d.localDate)))
        .all()
        .map((r) => [r.localDate, r] as const),
    );
    let changed = 0;
    this.db.transaction((tx) => {
      for (const day of days) {
        const prev = existing.get(day.localDate);
        const merged = mergeDay(prev && prev.deletedAt === null ? { steps: prev.steps, source: prev.source } : null, day);
        // El objetivo de hoy es el actual; el de días pasados no cambia una vez guardado.
        const goal = day.localDate === ctx.today || !prev ? ctx.stepGoal : prev.goalSnapshot;
        if (!merged && !(prev && day.localDate === ctx.today && prev.goalSnapshot !== goal)) continue;
        const value = merged ?? { steps: prev?.steps ?? day.steps, source: prev?.source ?? day.source };
        const fields = {
          steps: value.steps,
          source: value.source,
          distanceM: stepsDistanceMeters(value.steps, ctx.heightCm, ctx.sex),
          kcal: stepsKcal(value.steps, ctx.weightKg, ctx.heightCm, ctx.sex),
          goalSnapshot: goal,
          isDemo: false,
          deletedAt: null,
          updatedAt: timestamp,
        };
        if (prev) tx.update(stepDay).set(fields).where(eq(stepDay.id, prev.id)).run();
        else tx.insert(stepDay).values({ ...newMeta(newId(), timestamp), localDate: day.localDate, ...fields }).run();
        changed += 1;
      }
    });
    return changed;
  }
}
