export interface TasksClientEnv {
  appName: string;
}

export function getTasksClientEnv(): TasksClientEnv {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'FOMO Life Tasks';
  if (!appName.trim()) {
    throw new Error('NEXT_PUBLIC_APP_NAME must be a non-empty string when provided.');
  }

  return {
    appName,
  };
}