import 'server-only';

import { createStorageProvider } from '../../../lib/server/storage-factory';
import type { PersistedUserData } from '../../../lib/server/storage';

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
    tasksByUser.set(userId, persisted.tasks);
    return persisted.tasks;
  }

  const seeded: TaskItem[] = [
    {
      id: 'task-1',
      text: 'Review weekly priorities',
      done: false,
      dueDate: null,
      favorite: true,
      description: 'Align this list with current project commitments.',
    },
    {
      id: 'task-2',
      text: 'Schedule deep-work block',
      done: false,
      dueDate: null,
      favorite: false,
      description: '',
    },
  ];

  tasksByUser.set(userId, seeded);
  return seeded;
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