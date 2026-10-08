import 'server-only';

import fs from 'fs';
import path from 'path';
import { getSupabaseAdminClient } from '@myorg/storage';
import type { PersistedUserData } from '@myorg/storage';

export interface UserDataEntry {
  userId: string;
  data: PersistedUserData;
}

/**
 * Loads persisted data for every real user account, excluding internal
 * system rows/files (those with keys prefixed with "__").
 */
export async function listAllUsersData(): Promise<UserDataEntry[]> {
  const supabase = getSupabaseAdminClient();

  if (supabase) {
    const { data, error } = await supabase.from('user_data').select('user_id, data');
    if (error) throw new Error(`Failed to load users for task reminders: ${error.message}`);
    if (!data) throw new Error('No user data returned for task reminders');
    return data
      .map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        data: (row.data ?? {}) as PersistedUserData,
      }))
      .filter(({ userId, data: d }: UserDataEntry) => {
        if (userId.startsWith('__')) return false;
        return 'projects' in d || 'tasks' in d || 'people' in d || 'sharedProjectRefs' in d;
      });
  }

  const userDataDir = path.resolve(process.cwd(), 'data', 'user_data');
  const entries: UserDataEntry[] = [];
  let files: string[];
  try {
    files = fs.readdirSync(userDataDir).filter((f) => f.endsWith('.json'));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
  for (const file of files) {
    const userId = decodeURIComponent(file.replace('.json', ''));
    if (userId.startsWith('__')) continue;
    try {
      const raw = fs.readFileSync(path.join(userDataDir, file), 'utf8');
      entries.push({ userId, data: JSON.parse(raw) as PersistedUserData });
    } catch (error) {
      console.error('Failed to read user data for task reminders:', file, error);
      throw error;
    }
  }
  return entries;
}
