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
    return await loadPersistedUserData(userId);
  }

  async save(userId: string, data: PersistedUserData): Promise<void> {
    await savePersistedUserData(userId, data);
  }
}
