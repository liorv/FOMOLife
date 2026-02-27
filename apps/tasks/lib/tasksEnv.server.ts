import 'server-only';

export type TasksAuthMode = 'none' | 'mock-cookie';

export interface TasksServerEnv {
  authMode: TasksAuthMode;
  defaultUserId: string;
}

export function getTasksServerEnv(): TasksServerEnv {
  const authMode = process.env.TASKS_AUTH_MODE ?? 'none';
  if (authMode !== 'none' && authMode !== 'mock-cookie') {
    throw new Error('Invalid TASKS_AUTH_MODE. Use "none" or "mock-cookie".');
  }

  const defaultUserId = process.env.TASKS_DEFAULT_USER_ID ?? 'local-user';
  if (!defaultUserId.trim()) {
    throw new Error('TASKS_DEFAULT_USER_ID must be a non-empty string when provided.');
  }

  return {
    authMode,
    defaultUserId,
  };
}