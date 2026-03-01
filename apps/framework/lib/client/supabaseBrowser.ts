'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // running locally without supabase creds (e.g. dev machine)
    // return a minimal stub that won't crash the UI but simply logs.
    console.warn('Supabase client not configured; returning noop stub');
    const noop = () => ({
      auth: {
        async getSession() { return { data: { session: null }, error: null }; },
        async signOut() { return { error: null }; },
        async signInWithOAuth() { return { error: { message: 'noop' } } }; },
      from: () => ({ select: async () => ({ data: [], error: null }) }),
      // add other methods as needed
    });
    cachedClient = noop() as unknown as SupabaseClient;
    return cachedClient;
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}
