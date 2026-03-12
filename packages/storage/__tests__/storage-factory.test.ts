import fs from 'fs';
import os from 'os';
import path from 'path';

import { createStorageProvider } from '../src/storage-factory';

describe('storage factory and providers', () => {
  test('returns file provider in development and can save/load', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fomo-storage-'));
    const provider = createStorageProvider({ env: 'development', dataDir: tmp });
    const userId = 'u_test';
    const payload = { tasks: [{ id: 't1', text: 'x' }], projects: [] };
    await provider.save(userId, payload as any);
    const loaded = await provider.load(userId);
    expect(loaded).toEqual(payload);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {}
  });

  test('factory in production throws when Supabase not configured', () => {
    expect(() => createStorageProvider({ env: 'production' })).toThrow();
  });
});
