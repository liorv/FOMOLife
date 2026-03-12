import { FileStorageProvider } from './file-provider';
import { SupabaseStorageProvider } from './supabase-provider';
import { InMemoryStorageProvider } from './inmemory-provider';
import type { StorageProvider } from './storage-provider';

export function createStorageProvider(options?: { env?: string; useSupabase?: boolean; dataDir?: string }): StorageProvider {
  const env = options?.env ?? process.env.NODE_ENV;
  const useSupabase = options?.useSupabase ?? (process.env.USE_SUPABASE === 'true');

  if (env === 'production' || useSupabase) {
    // In production or when explicitly requested, use Supabase and disallow fallback
    return new SupabaseStorageProvider(true);
  }

  // In test environment prefer an ephemeral in-memory provider so tests are
  // hermetic and don't share file state across runs.
  if (env === 'test') {
    return new InMemoryStorageProvider();
  }

  return new FileStorageProvider(options?.dataDir);
}
