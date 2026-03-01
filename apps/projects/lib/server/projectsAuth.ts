import 'server-only';

import { cookies } from 'next/headers';
import { getProjectsServerEnv } from '../projectsEnv.server';

export interface ProjectsSession {
  userId: string;
  isAuthenticated: boolean;
}

export async function getProjectsSession(request?: Request): Promise<ProjectsSession> {
  const env = getProjectsServerEnv();
  if (env.authMode === 'none') {
    const requestUid = request ? new URL(request.url).searchParams.get('uid')?.trim() : '';
    return {
      userId: requestUid || env.defaultUserId,
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
