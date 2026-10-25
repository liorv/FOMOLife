import type { ProjectSubproject, ProjectTask } from '@myorg/types';

export function sortSectionTasks(tasks: ProjectTask[], sortMode: ProjectSubproject['sortMode']): ProjectTask[] {
  if (!sortMode || sortMode === 'none') return tasks;
  return [...tasks].sort((a, b) => {
    if (sortMode === 'due_date') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return (a.text || '').toLowerCase().localeCompare((b.text || '').toLowerCase());
  });
}
