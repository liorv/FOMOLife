import 'server-only';

import { cookies } from 'next/headers';
import { getFrameworkServerEnv } from '../frameworkEnv.server';

export interface FrameworkSession {
  userId: string;
  isAuthenticated: boolean;
  authMode: 'none' | 'mock-cookie';
}

export async function getFrameworkSession(): Promise<FrameworkSession> {
  const env = getFrameworkServerEnv();
  if (env.authMode === 'none') {
    return {
      userId: env.defaultUserId,
      isAuthenticated: true,
      authMode: env.authMode,
    };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get('framework_session')?.value;
  if (!rawSession || !rawSession.trim()) {
    return {
      userId: '',
      isAuthenticated: false,
      authMode: env.authMode,
    };
  }

  return {
    userId: rawSession,
    isAuthenticated: true,
    authMode: env.authMode,
  };
}

export function getDisplayNameFromUserId(userId: string): string {
  if (!userId.trim()) return 'User';
  const normalized = userId.replace(/[._-]+/g, ' ').trim();
  return normalized
    .split(/\s+/)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  const first = parts[0] ?? 'U';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? '';
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}