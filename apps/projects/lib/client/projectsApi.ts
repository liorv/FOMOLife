import type { ProjectItem } from '../server/projectsStore';

export interface ProjectsApiClient {
  listProjects: () => Promise<ProjectItem[]>;
  createProject: (input: { text: string; color?: string; progress?: number; order?: number }) => Promise<ProjectItem>;
  updateProject: (id: string, patch: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order'>>) => Promise<ProjectItem>;
  deleteProject: (id: string) => Promise<void>;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function createProjectsApiClient(baseUrl = ''): ProjectsApiClient {
  return {
    async listProjects(): Promise<ProjectItem[]> {
      const response = await fetch(`${baseUrl}/api/projects`, { method: 'GET' });
      const payload = await parseResponse<{ projects: ProjectItem[] }>(response);
      return payload.projects;
    },

    async createProject(input: { text: string; color?: string; progress?: number; order?: number }): Promise<ProjectItem> {
      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<ProjectItem>(response);
    },

    async updateProject(id: string, patch: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order'>>): Promise<ProjectItem> {
      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      return parseResponse<ProjectItem>(response);
    },

    async deleteProject(id: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/projects`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await parseResponse<{ ok: true }>(response);
    },
  };
}
