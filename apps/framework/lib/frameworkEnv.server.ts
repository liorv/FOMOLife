import 'server-only';

export type FrameworkAuthMode = 'none' | 'mock-cookie' | 'supabase-google';

export interface FrameworkServerEnv {
  authMode: FrameworkAuthMode;
  defaultUserId: string;
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
}

export function getFrameworkServerEnv(): FrameworkServerEnv {
  const authMode = process.env.FRAMEWORK_AUTH_MODE ?? 'none';
  if (authMode !== 'none' && authMode !== 'mock-cookie' && authMode !== 'supabase-google') {
    throw new Error('Invalid FRAMEWORK_AUTH_MODE. Use "none", "mock-cookie", or "supabase-google".');
  }

  const defaultUserId = process.env.FRAMEWORK_DEFAULT_USER_ID ?? 'local-user';
  if (!defaultUserId.trim()) {
    throw new Error('FRAMEWORK_DEFAULT_USER_ID must be a non-empty string when provided.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (authMode === 'supabase-google') {
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required when FRAMEWORK_AUTH_MODE=supabase-google.');
    }
    if (!supabaseAnonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required when FRAMEWORK_AUTH_MODE=supabase-google.');
    }
  }

  return {
    authMode,
    defaultUserId,
    supabaseUrl,
    supabaseAnonKey,
  };
}