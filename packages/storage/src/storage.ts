import 'server-only';

import { createClient } from '@supabase/supabase-js';

export type PersistedUserData = {
  tasks?: unknown[];
  projects?: unknown[];
  people?: unknown[];
  groups?: unknown[];
  invitationLinks?: unknown[];
  connections?: unknown[];
  pendingRequests?: unknown[];
  [key: string]: unknown;
};

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !key) {
    return null;
  }
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function loadPersistedUserData(userId: string): Promise<PersistedUserData | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { tasks: [], projects: [], people: [], groups: [] };
    }
    throw error;
  }

  return (data?.data ?? { tasks: [], projects: [], people: [], groups: [] }) as PersistedUserData;
}

export async function savePersistedUserData(userId: string, data: PersistedUserData): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_data')
    .upsert(
      {
        user_id: userId,
        data,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    throw error;
  }
}
