import type { StorageProvider } from './storage-provider';
import type { PersistedUserData } from './storage';
import { loadPersistedUserData, savePersistedUserData, getSupabaseAdminClient } from './storage';

export class SupabaseStorageProvider implements StorageProvider {
  constructor(ensureAvailable = false) {
    if (ensureAvailable && !getSupabaseAdminClient()) {
      throw new Error('Supabase client not available');
    }
  }

  async load(userId: string): Promise<PersistedUserData | null> {
    try {
      return await loadPersistedUserData(userId);
    } catch (err) {
      console.error('Supabase load error:', err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Database is currently undergoing maintenance or paused.');
      }
      return null;
    }
  }

  async save(userId: string, data: PersistedUserData): Promise<void> {
    try {
      await savePersistedUserData(userId, data);
    } catch (err) {
      console.error('Supabase save error:', err);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Database is currently undergoing maintenance or paused. Unable to save data.');
      }
    }
  }
}
