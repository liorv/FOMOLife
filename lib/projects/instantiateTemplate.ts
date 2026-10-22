import type { ProjectCreateInput, ProjectItem } from '@myorg/types';
import { generateId } from '@myorg/utils';

export function instantiateTemplate(template: ProjectItem, text: string): ProjectCreateInput {
  return {
    text,
    color: template.color,
    isTemplate: false,
    progress: 0,
    dueDate: null,
    ...(template.goal ? { goal: template.goal } : {}),
    ...(template.description ? { description: template.description } : {}),
    ...(template.externalUrl ? { externalUrl: template.externalUrl } : {}),
    ...(template.aiInstructions ? { aiInstructions: template.aiInstructions } : {}),
    ...(template.avatarUrl ? { avatarUrl: template.avatarUrl } : {}),
    subprojects: template.subprojects.map(subproject => ({
      ...subproject,
      id: generateId(),
      collapsed: false,
      owners: [],
      tasks: subproject.tasks.map(task => {
        const { createdAt, completedAt, ...definition } = task;
        return {
          ...definition,
          id: generateId(),
          done: false,
          dueDate: null,
          recurrenceAnchorDate: null,
          people: [],
        };
      }),
    })),
  };
}
