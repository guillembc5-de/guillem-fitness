/**
 * @jest-environment node
 */
import { exportBackup, importBackup } from '@/data/backup/backup';
import { createTestDb } from '@/test/testDb';
import type { Db } from '@/data/db/client';
import type { IncomingExternalWorkout } from '@/domain/fitnessTypes';

import { SqliteActivityRepository } from './activityRepository';

jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual<typeof import('node:crypto')>('node:crypto').randomUUID() }));
jest.mock('expo-sqlite', () => ({ addDatabaseChangeListener: () => ({ remove: () => undefined }) }));

let db: Db;
let repo: SqliteActivityRepository;

beforeEach(async () => {
  db = await createTestDb();
  repo = new SqliteActivityRepository(db);
});

const run: IncomingExternalWorkout = {
  externalId: 'HK-1',
  localDate: '2026-11-05',
  startedAt: new Date(2026, 10, 5, 8).getTime(),
  endedAt: new Date(2026, 10, 5, 8, 32).getTime(),
  activityType: 37,
  durationS: 1920,
  kcal: 310,
  distanceM: 5200,
  sourceName: 'Entrenamiento',
};

describe('anillos de Fitness por día', () => {
  it('lo último que llega manda (los anillos de hoy crecen)', async () => {
    await repo.saveDays([{ localDate: '2026-11-05', activeKcal: 300, exerciseMin: 10, source: 'shortcut' }]);
    await repo.saveDays([{ localDate: '2026-11-05', activeKcal: 612.4, exerciseMin: 48, source: 'shortcut' }]);
    const [day] = await repo.range('2026-11-05', '2026-11-05');
    expect(day).toMatchObject({ activeKcal: 612, exerciseMin: 48, source: 'shortcut' });
  });

  it('un dato que no viene, o un 0 (Salud sin permiso), no borra el que hay', async () => {
    await repo.saveDays([{ localDate: '2026-11-05', activeKcal: 500, exerciseMin: 30, source: 'shortcut' }]);
    await repo.saveDays([{ localDate: '2026-11-05', activeKcal: 0, source: 'healthkit' }]);
    await repo.saveDays([{ localDate: '2026-11-05', exerciseMin: 35, source: 'shortcut' }]);
    const [day] = await repo.range('2026-11-05', '2026-11-05');
    expect(day).toMatchObject({ activeKcal: 500, exerciseMin: 35 });
  });

  it('no crea días vacíos', async () => {
    expect(await repo.saveDays([{ localDate: '2026-11-05', source: 'shortcut' }])).toBe(0);
    expect(await repo.range('2026-11-01', '2026-11-30')).toHaveLength(0);
  });
});

describe('entrenos del Watch', () => {
  it('no se duplican al volver a leer Salud y se actualizan si cambian', async () => {
    expect(await repo.saveWorkouts([run])).toBe(1);
    expect(await repo.saveWorkouts([run])).toBe(0);
    await repo.saveWorkouts([{ ...run, kcal: 320 }]);
    const list = await repo.workouts('2026-11-05', '2026-11-05');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ activityType: 37, kcal: 320, distanceM: 5200 });
  });

  it('pasan por la copia de seguridad', async () => {
    await repo.saveDays([{ localDate: '2026-11-05', activeKcal: 700, exerciseMin: 45, source: 'healthkit' }]);
    await repo.saveWorkouts([run]);
    const target = await createTestDb();
    importBackup(target, JSON.parse(JSON.stringify(exportBackup(db))) as unknown);
    const copy = new SqliteActivityRepository(target);
    expect(await copy.range('2026-11-05', '2026-11-05')).toHaveLength(1);
    expect(await copy.workouts('2026-11-05', '2026-11-05')).toHaveLength(1);
  });
});
