import { exportBackup, importBackup, type BackupFile, type ImportResult } from '@/data/backup/backup';
import type { Db } from '@/data/db/client';
import { clearDemoData, countDemoData, generateDemoData, type DemoCounts } from '@/data/seed/demoData';

import type { DataRepository } from '../interfaces';

export class SqliteDataRepository implements DataRepository {
  constructor(private readonly db: Db) {}

  async exportAll(): Promise<BackupFile> {
    return exportBackup(this.db);
  }

  async importAll(data: unknown): Promise<ImportResult> {
    return importBackup(this.db, data);
  }

  async generateDemo(onProgress?: (p: number) => void): Promise<DemoCounts> {
    return generateDemoData(this.db, onProgress);
  }

  async countDemo(): Promise<DemoCounts> {
    return countDemoData(this.db);
  }

  async clearDemo(): Promise<DemoCounts> {
    return clearDemoData(this.db);
  }
}
