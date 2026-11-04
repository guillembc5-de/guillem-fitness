import { eq, isNull } from 'drizzle-orm';

import type { Db } from '@/data/db/client';
import { profile } from '@/data/db/schema';
import type { Profile, ProfileInput } from '@/domain/types';
import { newId, now } from '@/lib/ids';

import type { ProfileRepository } from '../interfaces';

type ProfileRow = typeof profile.$inferSelect;

function toDomain(row: ProfileRow): Profile {
  return {
    id: row.id,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    sex: row.sex,
    birthYear: row.birthYear,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    activityLevel: row.activityLevel,
    goal: row.goal,
    goalRateKgWeek: row.goalRateKgWeek,
    stepGoal: row.stepGoal,
    weightUnit: row.weightUnit,
    defaultRestSeconds: row.defaultRestSeconds,
    aiProvider: row.aiProvider,
    geminiModel: row.geminiModel,
    claudeModel: row.claudeModel,
    onboardingCompletedAt: row.onboardingCompletedAt,
  };
}

export class SqliteProfileRepository implements ProfileRepository {
  constructor(private readonly db: Db) {}

  async get(): Promise<Profile | null> {
    const rows = await this.db.select().from(profile).where(isNull(profile.deletedAt)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async save(input: ProfileInput): Promise<Profile> {
    const existing = await this.get();
    const timestamp = now();
    if (existing) {
      await this.db
        .update(profile)
        .set({ ...input, updatedAt: timestamp })
        .where(eq(profile.id, existing.id));
      return { ...existing, ...input, updatedAt: timestamp };
    }
    const created: Profile = { ...input, id: newId(), createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
    await this.db.insert(profile).values(created);
    return created;
  }
}
