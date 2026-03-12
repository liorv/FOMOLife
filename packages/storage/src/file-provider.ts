import fs from 'fs';
import path from 'path';
import type { StorageProvider } from './storage-provider';
import type { PersistedUserData } from './storage';

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data', 'user_data');

export class FileStorageProvider implements StorageProvider {
  private dataDir: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir ? path.resolve(dataDir) : DEFAULT_DATA_DIR;
    try {
      fs.mkdirSync(this.dataDir, { recursive: true });
    } catch (e) {
      // ignore
    }
  }

  private filePath(userId: string) {
    const safe = encodeURIComponent(userId);
    return path.join(this.dataDir, `${safe}.json`);
  }

  async load(userId: string): Promise<PersistedUserData | null> {
    const fp = this.filePath(userId);
    try {
      const raw = await fs.promises.readFile(fp, 'utf8');
      return JSON.parse(raw) as PersistedUserData;
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  async save(userId: string, data: PersistedUserData): Promise<void> {
    const fp = this.filePath(userId);
    await fs.promises.writeFile(fp, JSON.stringify(data, null, 2), 'utf8');
  }
}
