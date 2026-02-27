import 'server-only';

import { cookies } from 'next/headers';
import { getProjectsServerEnv } from '../projectsEnv.server';

export interface ProjectsSession {
  userId: string;
  isAuthenticated: boolean;
}

export async function getProjectsSession(): Promise<ProjectsSession> {
  const env = getProjectsServerEnv();
  if (env.authMode === 'none') {
    return {
      userId: env.defaultUserId,
      isAuthenticated: true,
    };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get('projects_session')?.value;
  if (!rawSession || !rawSession.trim()) {
    return {
      userId: '',
      isAuthenticated: false,
    };
  }

  return {
    userId: rawSession,
    isAuthenticated: true,
  };
}
