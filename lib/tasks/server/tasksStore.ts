import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { generateId } from '@myorg/utils';
import type { PersistedUserData } from '@myorg/storage';

const storage = createStorageProvider();

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  favorite: boolean;
  description: string;
  // people assigned to this task (project-style)
  people?: import('@myorg/types').ProjectTaskPerson[];
}










const tasksByUser = new Map<string, TaskItem[]>();

async function savePersisted(userId: string): Promise<void> {
  try {
    const existing = (await storage.load(userId)) || { tasks: [], projects: [], people: [], groups: [] };
    const data: PersistedUserData = { ...existing, tasks: tasksByUser.get(userId) || [] };
    await storage.save(userId, data);
    console.log('tasksStore: persisted data');
  } catch (err) {
    console.error('tasksStore: failed to persist', err);
  }
}

async function getOrInitUserTasks(userId: string): Promise<TaskItem[]> {
  console.log("tasksStore: getOrInitUserTasks", userId);
  const existing = tasksByUser.get(userId);
  if (existing) return existing;

  console.log("tasksStore: initializing tasks for user", userId);
  const persisted = await storage.load(userId);
  if (persisted && Array.isArray(persisted.tasks) && persisted.tasks.length > 0) {
    tasksByUser.set(userId, persisted.tasks as TaskItem[]);
    return persisted.tasks as TaskItem[];
  }

  // No persisted tasks — start with an empty list (no seed data).
  tasksByUser.set(userId, []);
  return [];
}

export async function listTasks(userId: string): Promise<TaskItem[]> {
  const tasks = [...await getOrInitUserTasks(userId)];
  return tasks;
}

export async function createTask(
  userId: string,
  input: Pick<TaskItem, 'text'> &
    Partial<Pick<TaskItem, 'dueDate' | 'favorite' | 'description' | 'people'>>,
): Promise<TaskItem> {
  const current = await getOrInitUserTasks(userId);
  const created: TaskItem = {
    id: generateId(),
    text: input.text,
    done: false,
    dueDate: input.dueDate ?? null,
    favorite: Boolean(input.favorite),
    description: input.description ?? '',
    ...(input.people ? { people: input.people } : {}),
  };
  current.push(created);
  tasksByUser.set(userId, current);
  await savePersisted(userId);
  return created;
}

export async function updateTask(
  userId: string,
  id: string,
  patch: Partial<Pick<TaskItem, 'text' | 'done' | 'dueDate' | 'favorite' | 'description' | 'people'>>,
): Promise<TaskItem | null> {
  console.log("tasksStore: updateTask", userId, id, patch);
  const current = await getOrInitUserTasks(userId);
  const next = current.map((item) =>
    item.id === id ? { ...item, ...patch, id } : item,
  );
  const updated = next.find((item) => item.id === id) ?? null;
  tasksByUser.set(userId, next);
  await savePersisted(userId);
  return updated;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const current = await getOrInitUserTasks(userId);
  const next = current.filter((item) => item.id !== id);
  tasksByUser.set(userId, next);
  await savePersisted(userId);
  return next.length !== current.length;
}