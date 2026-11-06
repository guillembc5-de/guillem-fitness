import { desc, eq, isNull } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { foodMemory } from '@/data/db/schema';
import { mergeMemory, type FoodMemory, type LearnEntry, type MemoryRow } from '@/domain/foodMemory';
import { normalizeSearch } from '@/domain/text';
import { newId, now } from '@/lib/ids';

import type { FoodMemoryRepository } from '../interfaces';
import { newMeta } from './mappers';

function parseAliases(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((a): a is string => typeof a === 'string') : [];
  } catch {
    return [];
  }
}

function toMemory(row: typeof foodMemory.$inferSelect): FoodMemory {
  return { ...row, aliases: parseAliases(row.aliases) };
}

export class SqliteFoodMemoryRepository implements FoodMemoryRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<FoodMemory[]> {
    return this.db.select().from(foodMemory).where(isNull(foodMemory.deletedAt)).orderBy(desc(foodMemory.lastUsedAt)).all().map(toMemory);
  }

  async learn(entries: readonly LearnEntry[]): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      for (const entry of entries) {
        const searchName = normalizeSearch(entry.name);
        if (searchName === '' || !(entry.grams > 0)) continue;
        const existing = tx.select().from(foodMemory).where(eq(foodMemory.searchName, searchName)).get();
        const previous: MemoryRow | null = existing && existing.deletedAt === null ? toMemory(existing) : null;
        const next = mergeMemory(previous, entry, timestamp);
        const values = { ...next, aliases: JSON.stringify(next.aliases), updatedAt: timestamp, deletedAt: null };
        if (existing) {
          tx.update(foodMemory).set(values).where(eq(foodMemory.id, existing.id)).run();
        } else {
          tx.insert(foodMemory)
            .values({ ...newMeta(newId(), timestamp), ...values })
            .run();
        }
      }
    });
  }

  async clear(): Promise<number> {
    const timestamp = now();
    const rows = this.db.select({ id: foodMemory.id }).from(foodMemory).where(isNull(foodMemory.deletedAt)).all();
    this.db.update(foodMemory).set({ deletedAt: timestamp, updatedAt: timestamp }).where(isNull(foodMemory.deletedAt)).run();
    return rows.length;
  }
}
