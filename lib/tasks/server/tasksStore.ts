import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { generateId } from '@myorg/utils';
import type { PersistedUserData } from '@myorg/storage';
import type { TaskItem } from '@myorg/types';
import { sendPushToUser } from '../../server/webPush';
import { isNotificationEnabled } from '../../server/notificationSettings';
import { advanceRecurringTask } from '../recurrence';

const storage = createStorageProvider();

const tasksByUser = new Map<string, TaskItem[]>();

async function savePersisted(userId: string): Promise<void> {
  try {
    const existing = (await storage.load(userId)) || { tasks: [], projects: [], people: [], groups: [] };
    const data: PersistedUserData = { ...existing, tasks: tasksByUser.get(userId) || [] };
    await storage.save(userId, data);
    console.log('tasksStore: persisted data');
  } catch (err) {
    console.error('tasksStore: failed to persist', err);
    throw err;
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
    Partial<Pick<TaskItem, 'dueDate' | 'recurrence' | 'recurrenceAnchorDate' | 'favorite' | 'description' | 'people' | 'priority' | 'effort'>>,
): Promise<TaskItem> {
  const current = await getOrInitUserTasks(userId);
  const created: TaskItem = {
    id: generateId(),
    text: input.text,
    done: false,
    createdAt: new Date().toISOString(),
    dueDate: input.dueDate ?? null,
    ...(input.recurrence !== undefined ? { recurrence: input.recurrence } : {}),
    ...(input.recurrenceAnchorDate !== undefined ? { recurrenceAnchorDate: input.recurrenceAnchorDate } : {}),
    favorite: Boolean(input.favorite),
    description: input.description ?? '',
    ...(input.people ? { people: input.people } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.effort !== undefined ? { effort: input.effort } : {}),
  };
  current.push(created);
  tasksByUser.set(userId, current);
  await savePersisted(userId);
  return created;
}

export async function updateTask(
  userId: string,
  id: string,
  patch: Partial<Pick<TaskItem, 'text' | 'done' | 'dueDate' | 'recurrence' | 'recurrenceAnchorDate' | 'favorite' | 'description' | 'people' | 'priority' | 'effort' | 'completedAt'>>,
): Promise<TaskItem | null> {
  console.log("tasksStore: updateTask", userId, id, patch);
  const current = await getOrInitUserTasks(userId);
  const wasDone = current.find((item) => item.id === id)?.done;
  const completedAt = new Date().toISOString();
  const next = current.map((item) => {
    if (item.id !== id) return item;
    const merged = { ...item, ...patch, id };
    if (patch.done === true && !item.done && merged.recurrence) {
      return advanceRecurringTask(merged, new Date(completedAt)) ?? merged;
    }
    // Auto-manage completedAt when done toggles, unless the caller explicitly set it
    if ('done' in patch && patch.done !== item.done && !('completedAt' in patch)) {
      merged.completedAt = patch.done ? completedAt : null;
    }
    return merged;
  });
  const updated = next.find((item) => item.id === id) ?? null;
  tasksByUser.set(userId, next);
  await savePersisted(userId);
  if (updated?.done && wasDone === false && await isNotificationEnabled(userId, 'ownTaskCompletions')) {
    await sendPushToUser(userId, {
      title: 'Task completed',
      body: updated.text,
      url: `/?tab=tasks&taskId=${encodeURIComponent(id)}`,
      tag: `task-completed-${id}`,
    }).catch((error) => {
      console.error('Failed to send task completion push:', error);
    });
  }
  return updated;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const current = await getOrInitUserTasks(userId);
  const next = current.filter((item) => item.id !== id);
  tasksByUser.set(userId, next);
  await savePersisted(userId);
  return next.length !== current.length;
}