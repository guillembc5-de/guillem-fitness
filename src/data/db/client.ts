import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DB_NAME = 'guillem-fitness.db';

const sqlite = openDatabaseSync(DB_NAME);

// WAL: escrituras rápidas sin bloquear lecturas (cada serie se guarda al instante).
// foreign_keys: SQLite no las aplica salvo que se activen.
sqlite.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
