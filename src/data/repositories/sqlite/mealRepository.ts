import { and, asc, between, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { foodItem, meal, pendingPhoto } from '@/data/db/schema';
import type { LocalDate } from '@/domain/localDay';
import type { DaySummary, Meal, MealDraft, PendingPhoto, PendingPhotoInput, RecentFood } from '@/domain/nutritionTypes';
import { newId, now } from '@/lib/ids';

import type { MealRepository, PendingPhotoRepository } from '../interfaces';
import { newMeta } from './mappers';

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export class SqliteMealRepository implements MealRepository {
  constructor(private readonly db: Db) {}

  async byDate(localDate: LocalDate): Promise<Meal[]> {
    const meals = this.db
      .select()
      .from(meal)
      .where(and(eq(meal.localDate, localDate), isNull(meal.deletedAt)))
      .orderBy(asc(meal.eatenAt))
      .all();
    return this.withItems(meals);
  }

  async get(id: string): Promise<Meal | null> {
    const row = this.db.select().from(meal).where(and(eq(meal.id, id), isNull(meal.deletedAt))).get();
    if (!row) return null;
    return (await this.withItems([row]))[0] ?? null;
  }

  async create(draft: MealDraft): Promise<string> {
    const id = newId();
    const timestamp = now();
    this.db.transaction((tx) => {
      tx.insert(meal)
        .values({
          ...newMeta(id, timestamp),
          isDemo: false,
          localDate: draft.localDate,
          mealType: draft.mealType,
          eatenAt: draft.eatenAt,
          source: draft.source,
          photoUri: draft.photoUri,
          aiProvider: draft.aiProvider,
        })
        .run();
      this.insertItems(tx, id, draft, timestamp);
    });
    return id;
  }

  async update(id: string, draft: MealDraft): Promise<void> {
    const timestamp = now();
    this.db.transaction((tx) => {
      tx.update(meal)
        .set({ mealType: draft.mealType, localDate: draft.localDate, eatenAt: draft.eatenAt, updatedAt: timestamp })
        .where(eq(meal.id, id))
        .run();
      tx.update(foodItem)
        .set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(and(eq(foodItem.mealId, id), isNull(foodItem.deletedAt)))
        .run();
      this.insertItems(tx, id, draft, timestamp);
    });
  }

  async softDelete(id: string): Promise<void> {
    const timestamp = now();
    this.db.update(meal).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(meal.id, id)).run();
  }

  async daySummaries(from: LocalDate, to: LocalDate): Promise<DaySummary[]> {
    const grams = sql`${foodItem.grams} / 100.0`;
    return this.db
      .select({
        localDate: meal.localDate,
        kcal: sql<number>`coalesce(sum(${foodItem.kcalPer100g} * ${grams}), 0)`,
        protein: sql<number>`coalesce(sum(${foodItem.proteinPer100g} * ${grams}), 0)`,
        carbs: sql<number>`coalesce(sum(${foodItem.carbsPer100g} * ${grams}), 0)`,
        fat: sql<number>`coalesce(sum(${foodItem.fatPer100g} * ${grams}), 0)`,
        mealCount: sql<number>`count(distinct ${meal.id})`,
      })
      .from(meal)
      .leftJoin(foodItem, and(eq(foodItem.mealId, meal.id), isNull(foodItem.deletedAt)))
      .where(and(between(meal.localDate, from, to), isNull(meal.deletedAt)))
      .groupBy(meal.localDate)
      .orderBy(desc(meal.localDate))
      .all();
  }

  async recentFoods(limit: number): Promise<RecentFood[]> {
    const rows = this.db
      .select({
        name: foodItem.name,
        grams: foodItem.grams,
        kcalPer100g: foodItem.kcalPer100g,
        proteinPer100g: foodItem.proteinPer100g,
        carbsPer100g: foodItem.carbsPer100g,
        fatPer100g: foodItem.fatPer100g,
      })
      .from(foodItem)
      .innerJoin(meal, eq(foodItem.mealId, meal.id))
      .where(and(isNull(foodItem.deletedAt), isNull(meal.deletedAt)))
      .orderBy(desc(foodItem.createdAt))
      .limit(limit * 5)
      .all();
    const seen = new Set<string>();
    const result: RecentFood[] = [];
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(r);
      if (result.length >= limit) break;
    }
    return result;
  }

  async withPhotos(): Promise<Meal[]> {
    const meals = this.db
      .select()
      .from(meal)
      .where(and(isNotNull(meal.photoUri), isNull(meal.deletedAt)))
      .orderBy(desc(meal.eatenAt))
      .all();
    return this.withItems(meals);
  }

  private insertItems(tx: Tx, mealId: string, draft: MealDraft, timestamp: number): void {
    draft.items.forEach((item, position) => {
      tx.insert(foodItem)
        .values({
          ...newMeta(newId(), timestamp),
          mealId,
          name: item.name.trim() || 'Alimento',
          grams: item.grams,
          kcalPer100g: item.kcalPer100g,
          proteinPer100g: item.proteinPer100g,
          carbsPer100g: item.carbsPer100g,
          fatPer100g: item.fatPer100g,
          aiEstimated: item.aiEstimated,
          position,
        })
        .run();
    });
  }

  private async withItems(meals: (typeof meal.$inferSelect)[]): Promise<Meal[]> {
    if (meals.length === 0) return [];
    const items = this.db
      .select()
      .from(foodItem)
      .where(and(inArray(foodItem.mealId, meals.map((m) => m.id)), isNull(foodItem.deletedAt)))
      .orderBy(asc(foodItem.position))
      .all();
    return meals.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      deletedAt: m.deletedAt,
      localDate: m.localDate,
      mealType: m.mealType,
      eatenAt: m.eatenAt,
      source: m.source,
      photoUri: m.photoUri,
      aiProvider: m.aiProvider,
      isDemo: m.isDemo,
      items: items
        .filter((i) => i.mealId === m.id)
        .map((i) => ({
          id: i.id,
          createdAt: i.createdAt,
          updatedAt: i.updatedAt,
          deletedAt: i.deletedAt,
          mealId: i.mealId,
          name: i.name,
          grams: i.grams,
          kcalPer100g: i.kcalPer100g,
          proteinPer100g: i.proteinPer100g,
          carbsPer100g: i.carbsPer100g,
          fatPer100g: i.fatPer100g,
          aiEstimated: i.aiEstimated,
          position: i.position,
        })),
    }));
  }
}

export class SqlitePendingPhotoRepository implements PendingPhotoRepository {
  constructor(private readonly db: Db) {}

  async list(): Promise<PendingPhoto[]> {
    return this.db.select().from(pendingPhoto).where(isNull(pendingPhoto.deletedAt)).orderBy(desc(pendingPhoto.capturedAt)).all();
  }

  async get(id: string): Promise<PendingPhoto | null> {
    return this.db.select().from(pendingPhoto).where(and(eq(pendingPhoto.id, id), isNull(pendingPhoto.deletedAt))).get() ?? null;
  }

  async create(input: PendingPhotoInput): Promise<string> {
    const id = newId();
    this.db
      .insert(pendingPhoto)
      .values({ ...newMeta(id, now()), ...input, status: 'pending', attempts: 0 })
      .run();
    return id;
  }

  async markFailed(id: string, error: string): Promise<void> {
    this.db
      .update(pendingPhoto)
      .set({ status: 'failed', lastError: error, attempts: sql`${pendingPhoto.attempts} + 1`, updatedAt: now() })
      .where(eq(pendingPhoto.id, id))
      .run();
  }

  async resolve(id: string): Promise<void> {
    const timestamp = now();
    this.db.update(pendingPhoto).set({ deletedAt: timestamp, updatedAt: timestamp }).where(eq(pendingPhoto.id, id)).run();
  }
}
