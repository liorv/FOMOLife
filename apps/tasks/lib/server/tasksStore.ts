import 'server-only';

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  favorite: boolean;
  description: string;
}

const tasksByUser = new Map<string, TaskItem[]>();

// persist to disk to survive dev reloads
import fs from 'fs';
import path from 'path';
const PERSIST_PATH = path.resolve(process.cwd(), 'apps/tasks/data/tasks.json');

function loadPersisted() {
  try {
    const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
    const arr: [string, TaskItem[]][] = JSON.parse(raw);
    arr.forEach(([user, tasks]) => {
      tasksByUser.set(user, tasks);
    });
    console.log('tasksStore: loaded persisted data');
  } catch (err) {
    // ignore if file missing or parse fails
  }
}

function savePersisted() {
  try {
    const arr = Array.from(tasksByUser.entries());
    fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(arr), 'utf-8');
    console.log('tasksStore: persisted data');
  } catch (err) {
    console.error('tasksStore: failed to persist', err);
  }
}

// initialize map from disk
loadPersisted();

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function getOrInitUserTasks(userId: string): TaskItem[] {
  console.log("tasksStore: getOrInitUserTasks", userId);
  const existing = tasksByUser.get(userId);
  if (existing) return existing;

  console.log("tasksStore: initializing tasks for user", userId);
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
  const tasks = [...getOrInitUserTasks(userId)];
  return tasks;
}

export async function createTask(
  userId: string,
  input: Pick<TaskItem, 'text'> & Partial<Pick<TaskItem, 'dueDate' | 'favorite' | 'description'>>,
): Promise<TaskItem> {
  const current = getOrInitUserTasks(userId);
  const created: TaskItem = {
    id: generateId(),
    text: input.text,
    done: false,
    dueDate: input.dueDate ?? null,
    favorite: Boolean(input.favorite),
    description: input.description ?? '',
  };
  current.push(created);
  tasksByUser.set(userId, current);
  savePersisted();
  return created;
}

export async function updateTask(
  userId: string,
  id: string,
  patch: Partial<Pick<TaskItem, 'text' | 'done' | 'dueDate' | 'favorite' | 'description'>>,
): Promise<TaskItem | null> {
  console.log("tasksStore: updateTask", userId, id, patch);
  const current = getOrInitUserTasks(userId);
  const next = current.map((item) => (item.id === id ? { ...item, ...patch, id } : item));
  const updated = next.find((item) => item.id === id) ?? null;
  tasksByUser.set(userId, next);
  savePersisted();
  return updated;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const current = getOrInitUserTasks(userId);
  const next = current.filter((item) => item.id !== id);
  tasksByUser.set(userId, next);
  savePersisted();
  return next.length !== current.length;
}