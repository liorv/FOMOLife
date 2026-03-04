import 'server-only';

import { cookies } from 'next/headers';
import { getTasksServerEnv } from '../tasksEnv.server';

export interface TasksSession {
  userId: string;
  isAuthenticated: boolean;
}

export async function getTasksSession(): Promise<TasksSession> {
  const env = getTasksServerEnv();
  if (env.authMode === 'none') {
    // development mode: allow overriding via special cookie so tests and
    // manual dev flows can switch users on the fly without restarting.
    const cookieStore = await cookies();
    const frameworkDevUser = cookieStore.get('framework_dev_user')?.value;
    const tasksDevUser = cookieStore.get('tasks_dev_user')?.value;
    const devUser = (frameworkDevUser && frameworkDevUser.trim()) || (tasksDevUser && tasksDevUser.trim()) || env.defaultUserId;
    return {
      userId: devUser,
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