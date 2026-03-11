import { FileStorageProvider } from './file-provider';
import { SupabaseStorageProvider } from './supabase-provider';
import type { StorageProvider } from './storage-provider';

export function createStorageProvider(options?: { env?: string; useSupabase?: boolean; dataDir?: string }): StorageProvider {
  const env = options?.env ?? process.env.NODE_ENV;
  const useSupabase = options?.useSupabase ?? (process.env.USE_SUPABASE === 'true');

  if (env === 'production' || useSupabase) {
    // In production or when explicitly requested, use Supabase and disallow fallback
    return new SupabaseStorageProvider(true);
  }

  return new FileStorageProvider(options?.dataDir);
}
