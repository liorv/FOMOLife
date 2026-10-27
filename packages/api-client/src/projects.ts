import type { ProjectItem, ProjectCreateInput, ProjectUpdateInput, ProjectTask } from '@myorg/types';

export interface ProjectsApiClient {
  listProjects: () => Promise<ProjectItem[]>;
  createProject: (input: ProjectCreateInput) => Promise<ProjectItem>;
  updateProject: (id: string, patch: ProjectUpdateInput) => Promise<ProjectItem>;
  updateProjectPlan: (id: string, action: 'add' | 'remove', link: NonNullable<ProjectItem['planningLinks']>[number]) => Promise<ProjectItem>;
  addProjectPlanLinks: (id: string, links: NonNullable<ProjectItem['planningLinks']>) => Promise<ProjectItem>;
  createDependencyTask: (id: string, dependentTaskId: string, task: ProjectTask) => Promise<ProjectItem>;
  promoteSubproject: (projectId: string, subprojectId: string) => Promise<{ sourceProject: ProjectItem; project: ProjectItem }>;
  deleteProject: (id: string) => Promise<void>;
}

type ProjectsApiClientOptions = {
  uid?: string;
};

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

export function createProjectsApiClient(baseUrl = '', options: ProjectsApiClientOptions = {}): ProjectsApiClient {
  const uid = options.uid?.trim() ?? '';
  const endpoint = uid ? `${baseUrl}/api/projects?uid=${encodeURIComponent(uid)}` : `${baseUrl}/api/projects`;

  return {
    async listProjects(): Promise<ProjectItem[]> {
      const response = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
      const payload = await parseResponse<{ projects: ProjectItem[] }>(response);
      return payload.projects;
    },

    async createProject(input: ProjectCreateInput): Promise<ProjectItem> {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<ProjectItem>(response);
    },

    async updateProject(id: string, patch: ProjectUpdateInput): Promise<ProjectItem> {
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      return parseResponse<ProjectItem>(response);
    },

    async updateProjectPlan(id, action, link): Promise<ProjectItem> {
      const response = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(id)}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, link }),
      });
      return parseResponse<ProjectItem>(response);
    },

    async addProjectPlanLinks(id, links): Promise<ProjectItem> {
      const response = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(id)}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add-many', links }),
      });
      return parseResponse<ProjectItem>(response);
    },

    async createDependencyTask(id, dependentTaskId, task): Promise<ProjectItem> {
      const response = await fetch(`${baseUrl}/api/projects/${encodeURIComponent(id)}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-task', dependentTaskId, task }),
      });
      return parseResponse<ProjectItem>(response);
    },

    async promoteSubproject(projectId: string, subprojectId: string): Promise<{ sourceProject: ProjectItem; project: ProjectItem }> {
      const response = await fetch(
        `${baseUrl}/api/projects/${encodeURIComponent(projectId)}/subprojects/${encodeURIComponent(subprojectId)}/promote`,
        { method: 'POST' },
      );
      return parseResponse<{ sourceProject: ProjectItem; project: ProjectItem }>(response);
    },

    async deleteProject(id: string): Promise<void> {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await parseResponse<{ ok: true }>(response);
    },
  };
}
