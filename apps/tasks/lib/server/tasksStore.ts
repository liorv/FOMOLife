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

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function getOrInitUserTasks(userId: string): TaskItem[] {
  const existing = tasksByUser.get(userId);
  if (existing) return existing;

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
  return [...getOrInitUserTasks(userId)];
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
  return created;
}

export async function updateTask(
  userId: string,
  id: string,
  patch: Partial<Pick<TaskItem, 'text' | 'done' | 'dueDate' | 'favorite' | 'description'>>,
): Promise<TaskItem | null> {
  const current = getOrInitUserTasks(userId);
  const next = current.map((item) => (item.id === id ? { ...item, ...patch, id } : item));
  const updated = next.find((item) => item.id === id) ?? null;
  tasksByUser.set(userId, next);
  return updated;
}

export async function deleteTask(userId: string, id: string): Promise<boolean> {
  const current = getOrInitUserTasks(userId);
  const next = current.filter((item) => item.id !== id);
  tasksByUser.set(userId, next);
  return next.length !== current.length;
}