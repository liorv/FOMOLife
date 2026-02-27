import type { TaskItem } from '../server/tasksStore';

export interface TasksApiClient {
  listTasks: () => Promise<TaskItem[]>;
  createTask: (input: { text: string; dueDate?: string | null; description?: string; favorite?: boolean }) => Promise<TaskItem>;
  updateTask: (id: string, patch: Partial<Pick<TaskItem, 'text' | 'done' | 'dueDate' | 'favorite' | 'description'>>) => Promise<TaskItem>;
  deleteTask: (id: string) => Promise<void>;
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

export function createTasksApiClient(baseUrl = ''): TasksApiClient {
  return {
    async listTasks(): Promise<TaskItem[]> {
      const response = await fetch(`${baseUrl}/api/tasks`, { method: 'GET' });
      const payload = await parseResponse<{ tasks: TaskItem[] }>(response);
      return payload.tasks;
    },

    async createTask(input: { text: string; dueDate?: string | null; description?: string; favorite?: boolean }): Promise<TaskItem> {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      return parseResponse<TaskItem>(response);
    },

    async updateTask(id: string, patch: Partial<Pick<TaskItem, 'text' | 'done' | 'dueDate' | 'favorite' | 'description'>>): Promise<TaskItem> {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, patch }),
      });
      return parseResponse<TaskItem>(response);
    },

    async deleteTask(id: string): Promise<void> {
      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await parseResponse<{ ok: true }>(response);
    },
  };
}