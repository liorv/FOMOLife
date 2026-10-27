import type { ProjectItem } from '@myorg/types';
import { getTaskStatus } from './status';

export function getProjectCardSummary(project: ProjectItem, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const unfinished = project.subprojects.flatMap(section => section.tasks).filter(task => !task.done);
  const isPast = (value: string | null | undefined) =>
    !!value && new Date(`${value.slice(0, 10)}T00:00:00`) < today;
  const blockedTasks = unfinished.filter(task => getTaskStatus(task) === 'blocked').length;
  const overdueTasks = unfinished.filter(task => isPast(task.dueDate)).length;
  const current = !project.archived && !project.isTemplate;
  return {
    active: current && unfinished.some(task => {
      const status = getTaskStatus(task);
      return status === 'in_progress' || status === 'blocked';
    }),
    blocked: current && blockedTasks > 0,
    overdue: current && (overdueTasks > 0 || (unfinished.length > 0 && isPast(project.dueDate))),
    blockedTasks,
    overdueTasks,
  };
}
