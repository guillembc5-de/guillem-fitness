import { getTableColumns, sql, type SQL } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { z } from 'zod';

import type { Db } from '@/data/db/client';
import * as schema from '@/data/db/schema';

import migrations from '../../../drizzle/migrations';

/**
 * Copia de seguridad completa en JSON: todas las tablas, también las filas
 * con borrado suave (para que una futura sincronización sepa qué se borró).
 * Las fotos no van dentro: son archivos del móvil.
 */

export const BACKUP_FORMAT = 'guillem-fitness-backup';
export const BACKUP_VERSION = 1;
const SCHEMA_VERSION = migrations.journal.entries.length;

/** Orden de las tablas: los padres antes que los hijos (claves foráneas). */
const TABLES: readonly (readonly [string, SQLiteTable])[] = [
  ['profile', schema.profile],
  ['exercise', schema.exercise],
  ['routine', schema.routine],
  ['routineExercise', schema.routineExercise],
  ['routineSet', schema.routineSet],
  ['workout', schema.workout],
  ['workoutExercise', schema.workoutExercise],
  ['workoutSet', schema.workoutSet],
  ['stepDay', schema.stepDay],
  ['meal', schema.meal],
  ['foodItem', schema.foodItem],
  ['pendingPhoto', schema.pendingPhoto],
];

const Value = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const Row = z.record(z.string(), Value);

const BackupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  schemaVersion: z.number().int(),
  exportedAt: z.number(),
  tables: z.record(z.string(), z.array(Row)),
});

export type BackupFile = z.infer<typeof BackupSchema>;
type BackupRow = z.infer<typeof Row>;

export type ImportResult = { inserted: number; updated: number; skipped: number };

export class BackupError extends Error {
  override name = 'BackupError';
}

export function exportBackup(db: Db): BackupFile {
  const tables: Record<string, BackupRow[]> = {};
  for (const [name, table] of TABLES) {
    tables[name] = db.select().from(table).all().map((row) => Row.parse(row));
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, schemaVersion: SCHEMA_VERSION, exportedAt: Date.now(), tables };
}

function toDb(value: z.infer<typeof Value>): string | number | null {
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/** Comprueba que cada fila tiene id, fechas y solo columnas que existen. */
function validateRows(name: string, table: SQLiteTable, rows: readonly BackupRow[]): void {
  const columns = getTableColumns(table);
  rows.forEach((row, i) => {
    if (typeof row.id !== 'string' || row.id === '') throw new BackupError(`${name}[${i}]: falta el id`);
    if (typeof row.updatedAt !== 'number' || typeof row.createdAt !== 'number') throw new BackupError(`${name}[${i}]: fechas no válidas`);
    for (const key of Object.keys(row)) {
      if (!(key in columns)) throw new BackupError(`${name}[${i}]: columna desconocida «${key}»`);
    }
  });
}

/**
 * Importa una copia. Se fusiona por id: si la fila ya existe, gana la que
 * tenga el `updatedAt` más reciente. Todo en una transacción: si algo falla,
 * no se cambia nada.
 */
export function importBackup(db: Db, data: unknown): ImportResult {
  const parsed = BackupSchema.safeParse(data);
  if (!parsed.success) throw new BackupError('El archivo no es una copia de Guillem Fitness válida.');
  const file = parsed.data;
  if (file.schemaVersion > SCHEMA_VERSION) {
    throw new BackupError('La copia es de una versión más nueva de la app. Actualiza la app antes de importarla.');
  }
  for (const [name, table] of TABLES) validateRows(name, table, file.tables[name] ?? []);

  const result: ImportResult = { inserted: 0, updated: 0, skipped: 0 };
  db.transaction((tx) => {
    for (const [name, table] of TABLES) {
      const columns = getTableColumns(table);
      for (const row of file.tables[name] ?? []) {
        const id = String(row.id);
        const updatedAt = Number(row.updatedAt);
        const existing = tx.get<{ updated_at: number }>(sql`select updated_at from ${table} where id = ${id}`);

        // Una sola fila de perfil y un solo registro de pasos por día: si
        // existe otro con distinto id, se queda el más reciente.
        if (!existing && (table === schema.profile || table === schema.stepDay)) {
          const clash =
            table === schema.profile
              ? tx.get<{ id: string; updated_at: number }>(sql`select id, updated_at from ${table} limit 1`)
              : tx.get<{ id: string; updated_at: number }>(sql`select id, updated_at from ${table} where local_date = ${row.localDate ?? null}`);
          if (clash) {
            if (clash.updated_at >= updatedAt) {
              result.skipped += 1;
              continue;
            }
            tx.run(sql`delete from ${table} where id = ${clash.id}`);
          }
        }

        if (existing && existing.updated_at >= updatedAt) {
          result.skipped += 1;
          continue;
        }

        const entries = Object.entries(row).filter(([key]) => key in columns);
        const names: SQL[] = [];
        const values: SQL[] = [];
        const updates: SQL[] = [];
        for (const [key, value] of entries) {
          const column = columns[key];
          if (!column) continue;
          names.push(sql`${sql.identifier(column.name)}`);
          values.push(sql`${toDb(value)}`);
          if (key !== 'id') updates.push(sql`${sql.identifier(column.name)} = excluded.${sql.identifier(column.name)}`);
        }
        // UPSERT (no «INSERT OR REPLACE», que borraría en cascada los hijos).
        tx.run(
          sql`insert into ${table} (${sql.join(names, sql`, `)}) values (${sql.join(values, sql`, `)}) on conflict(id) do update set ${sql.join(updates, sql`, `)}`,
        );
        if (existing) result.updated += 1;
        else result.inserted += 1;
      }
    }
  });
  return result;
}
