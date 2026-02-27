import 'server-only';

export type ProjectsAuthMode = 'none' | 'mock-cookie';

export interface ProjectsServerEnv {
  authMode: ProjectsAuthMode;
  defaultUserId: string;
}

export function getProjectsServerEnv(): ProjectsServerEnv {
  const authMode = process.env.PROJECTS_AUTH_MODE ?? 'none';
  if (authMode !== 'none' && authMode !== 'mock-cookie') {
    throw new Error('Invalid PROJECTS_AUTH_MODE. Use "none" or "mock-cookie".');
  }

  const defaultUserId = process.env.PROJECTS_DEFAULT_USER_ID ?? 'local-user';
  if (!defaultUserId.trim()) {
    throw new Error('PROJECTS_DEFAULT_USER_ID must be a non-empty string when provided.');
  }

  return {
    authMode,
    defaultUserId,
  };
}
