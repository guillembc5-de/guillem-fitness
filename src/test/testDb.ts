/// <reference types="node" />
/**
 * Base de datos de pruebas: SQLite real (el de Node) detrás de la misma API
 * síncrona que usa Drizzle con expo-sqlite. Así los tests ejecutan las
 * migraciones y las consultas reales de los repositorios.
 */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

import type { Db } from '@/data/db/client';
import * as schema from '@/data/db/schema';

import migrations from '../../drizzle/migrations';

function toParams(params: unknown): SQLInputValue[] {
  if (!Array.isArray(params)) return [];
  return params.map((p): SQLInputValue => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p === null || typeof p === 'number' || typeof p === 'string' || typeof p === 'bigint' || p instanceof Uint8Array) return p;
    return String(p);
  });
}

class FakeStatement {
  constructor(
    private readonly raw: DatabaseSync,
    private readonly sql: string,
  ) {}

  executeSync(params: unknown) {
    const rows = this.raw.prepare(this.sql).all(...toParams(params));
    return { changes: 0, lastInsertRowId: 0, getAllSync: () => rows, getFirstSync: () => rows[0] ?? null };
  }

  executeForRawResultSync(params: unknown) {
    const stmt = this.raw.prepare(this.sql);
    stmt.setReturnArrays(true);
    const rows = stmt.all(...toParams(params));
    return { getAllSync: () => rows };
  }
}

export async function createTestDb(): Promise<Db> {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  const client = { prepareSync: (sql: string) => new FakeStatement(raw, sql) };
  const db = drizzle(client as unknown as SQLiteDatabase, { schema });
  await migrate(db, migrations);
  return db;
}
