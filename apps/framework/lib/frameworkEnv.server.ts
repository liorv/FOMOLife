import 'server-only';

export type FrameworkAuthMode = 'none' | 'mock-cookie';

export interface FrameworkServerEnv {
  authMode: FrameworkAuthMode;
  defaultUserId: string;
}

export function getFrameworkServerEnv(): FrameworkServerEnv {
  const authMode = process.env.FRAMEWORK_AUTH_MODE ?? 'none';
  if (authMode !== 'none' && authMode !== 'mock-cookie') {
    throw new Error('Invalid FRAMEWORK_AUTH_MODE. Use "none" or "mock-cookie".');
  }

  const defaultUserId = process.env.FRAMEWORK_DEFAULT_USER_ID ?? 'local-user';
  if (!defaultUserId.trim()) {
    throw new Error('FRAMEWORK_DEFAULT_USER_ID must be a non-empty string when provided.');
  }

  return {
    authMode,
    defaultUserId,
  };
}