import type { ProjectTaskStatus, ProjectScheduleHealth, ProjectTaskStatusNote, TaskRecurrence } from '@myorg/types';

type RecurringTask = {
  id: string;
  done: boolean;
  dueDate: string | null;
  recurrence?: TaskRecurrence | null;
  recurrenceAnchorDate?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  status?: ProjectTaskStatus;
  scheduleHealth?: ProjectScheduleHealth | null;
  statusUpdates?: ProjectTaskStatusNote[];
  delayDays?: number;
};

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addRecurrence(dateKey: string, recurrence: TaskRecurrence, anchorDay: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));

  if (recurrence === 'daily') date.setUTCDate(date.getUTCDate() + 1);
  if (recurrence === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  if (recurrence === 'monthly') {
    const targetMonth = date.getUTCMonth() + 1;
    const targetYear = date.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;
    const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    date.setUTCFullYear(targetYear, normalizedMonth, Math.min(anchorDay, lastDay));
  }
  if (recurrence === 'yearly') {
    const targetYear = date.getUTCFullYear() + 1;
    const lastDay = new Date(Date.UTC(targetYear, date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCFullYear(targetYear, date.getUTCMonth(), Math.min(anchorDay, lastDay));
  }

  return date.toISOString().slice(0, 10);
}

export function getNextTaskDueDate(
  dueDate: string | null | undefined,
  recurrence: TaskRecurrence,
  completedAt: Date,
  recurrenceAnchorDate?: string | null,
): string {
  const currentDate = dueDate?.slice(0, 10) || localDateKey(completedAt);
  const anchorDay = Number((recurrenceAnchorDate || currentDate).slice(8, 10));
  return addRecurrence(currentDate, recurrence, anchorDay);
}

export function advanceRecurringTask<T extends RecurringTask>(
  task: T,
  completedAt = new Date(),
): T | null {
  if (!task.recurrence) return null;

  return {
    ...task,
    done: false,
    ...(task.status !== undefined ? { status: 'not_started' as const } : {}),
    ...(task.scheduleHealth !== undefined ? { scheduleHealth: null } : {}),
    ...(task.statusUpdates !== undefined ? { statusUpdates: [] } : {}),
    ...(task.delayDays !== undefined ? { delayDays: 0 } : {}),
    dueDate: getNextTaskDueDate(task.dueDate, task.recurrence, completedAt, task.recurrenceAnchorDate),
    recurrenceAnchorDate: task.recurrenceAnchorDate ?? task.dueDate ?? localDateKey(completedAt),
    completedAt: null,
  };
}