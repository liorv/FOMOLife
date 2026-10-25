import type { ProjectCreateInput, ProjectItem } from '@myorg/types';
import { generateId } from '@myorg/utils';
import { planKey, type PlanEntityRef } from './planning';

export function instantiateTemplate(template: ProjectItem, text: string): ProjectCreateInput {
  const ids = new Map<string, string>();
  const subprojects = template.subprojects.map(subproject => {
    const id = generateId();
    ids.set(planKey({ kind: 'section', id: subproject.id }), id);
    return {
      ...subproject,
      id,
      collapsed: false,
      owners: [],
      tasks: subproject.tasks.map(task => {
        const { createdAt, completedAt, ...definition } = task;
        const taskId = generateId();
        ids.set(planKey({ kind: 'task', id: task.id }), taskId);
        return {
          ...definition, id: taskId, done: false, dueDate: null,
          recurrenceAnchorDate: null, people: [],
          ...(task.risks ? { risks: task.risks.map(risk => ({
            ...risk, id: generateId(),
            mitigations: risk.mitigations.map(mitigation => ({ ...mitigation, id: generateId() })),
          })) } : {}),
        };
      }),
    };
  });
  const remap = (ref: PlanEntityRef): PlanEntityRef => {
    const id = ids.get(planKey(ref));
    if (!id) throw new Error('Template plan references a missing item. Repair its links before using this template.');
    return { kind: ref.kind, id };
  };
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
    subprojects,
    ...(template.milestones ? { milestones: template.milestones.map(milestone => ({
      ...milestone, id: generateId(),
      taskIds: milestone.taskIds.map(id => remap({ kind: 'task', id }).id),
    })) } : {}),
    ...(template.deadlines ? { deadlines: template.deadlines.map(deadline => ({ ...deadline, id: generateId() })) } : {}),
    ...(template.planningLinks ? { planningLinks: template.planningLinks.map(link => ({
      prerequisite: remap(link.prerequisite), dependent: remap(link.dependent),
    })) } : {}),
  };
}
