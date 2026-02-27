export interface ProjectsClientEnv {
  appName: string;
}

export function getProjectsClientEnv(): ProjectsClientEnv {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'FOMO Life Projects';
  if (!appName.trim()) {
    throw new Error('NEXT_PUBLIC_APP_NAME must be a non-empty string when provided.');
  }

  return {
    appName,
  };
}
