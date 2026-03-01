import 'server-only';

import { cookies } from 'next/headers';
import { getTasksServerEnv } from '../tasksEnv.server';

export interface TasksSession {
  userId: string;
  isAuthenticated: boolean;
}

export async function getTasksSession(): Promise<TasksSession> {
  const env = getTasksServerEnv();
  console.log('tasksAuth.getTasksSession env', env);
  if (env.authMode === 'none') {
    console.log('tasksAuth: authMode none -> defaultUserId', env.defaultUserId);
    return {
      userId: env.defaultUserId,
      isAuthenticated: true,
    };
  }

  const cookieStore = await cookies();
  const rawSession = cookieStore.get('tasks_session')?.value;
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