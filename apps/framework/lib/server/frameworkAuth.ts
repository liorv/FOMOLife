import 'server-only';

import { cookies } from 'next/headers';
import { getFrameworkServerEnv } from '../frameworkEnv.server';

export interface FrameworkSession {
  userId: string;
  userEmail?: string;
  userName?: string;
  userAvatarUrl?: string;
  isAuthenticated: boolean;
  authMode: 'none' | 'mock-cookie' | 'supabase-google';
}

export async function getFrameworkSession(): Promise<FrameworkSession> {
  const env = getFrameworkServerEnv();
  if (env.authMode === 'none') {
    return {
      userId: env.defaultUserId,
      userEmail: env.defaultUserId,
      isAuthenticated: true,
      authMode: env.authMode,
    };
  }

  const cookieStore = await cookies();

  if (env.authMode === 'supabase-google') {
    const userId = cookieStore.get('framework_session_user_id')?.value?.trim() ?? '';
    const userEmail = cookieStore.get('framework_session_user_email')?.value?.trim() ?? '';
    const userName = cookieStore.get('framework_session_user_name')?.value?.trim() ?? '';
    const userAvatarUrl = cookieStore.get('framework_session_user_avatar')?.value?.trim() ?? '';

    if (!userId) {
      return {
        userId: '',
        userEmail: '',
        userName: '',
        userAvatarUrl: '',
        isAuthenticated: false,
        authMode: env.authMode,
      };
    }

    return {
      userId,
      userEmail,
      userName,
      userAvatarUrl,
      isAuthenticated: true,
      authMode: env.authMode,
    };
  }

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