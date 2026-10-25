import type { ProjectDeadline, ProjectMilestone, ProjectSubproject } from '@myorg/types';

export function getMilestoneTaskIds(milestone: ProjectMilestone, sections: ProjectSubproject[]): string[] | null {
  const dependencies = (milestone.sectionIds ?? []).map(id => sections.find(section => section.id === id));
  if (dependencies.some(section => !section)) return null;
  return [...new Set([...milestone.taskIds, ...dependencies.flatMap(section => section!.tasks.map(task => task.id))])];
}

export function isRoadmapDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function validateRoadmapEvents(input: { milestones?: unknown; deadlines?: unknown }): string | null {
  const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
  const named = (value: unknown): value is Record<string, unknown> & { id: string; label: string } =>
    record(value) && typeof value.id === 'string' && !!value.id.trim()
    && typeof value.label === 'string' && !!value.label.trim();
  if (input.milestones !== undefined) {
    if (!Array.isArray(input.milestones) || !input.milestones.every((item: unknown): item is ProjectMilestone =>
      named(item) && Array.isArray(item.taskIds)
      && (item.sectionIds === undefined || (Array.isArray(item.sectionIds)
        && item.sectionIds.every((id: unknown) => typeof id === 'string' && !!id.trim())
        && new Set(item.sectionIds).size === item.sectionIds.length))
      && item.taskIds.length + (Array.isArray(item.sectionIds) ? item.sectionIds.length : 0) > 0
      && item.taskIds.every((id: unknown) => typeof id === 'string' && !!id.trim())
      && new Set(item.taskIds).size === item.taskIds.length,
    ) || new Set(input.milestones.map(item => item.id)).size !== input.milestones.length) {
      return 'Milestones require unique IDs, a name, and one or more unique task or section dependencies.';
    }
  }
  if (input.deadlines !== undefined) {
    if (!Array.isArray(input.deadlines) || !input.deadlines.every((item: unknown): item is ProjectDeadline =>
      named(item) && isRoadmapDate(item.date),
    ) || new Set(input.deadlines.map(item => item.id)).size !== input.deadlines.length) {
      return 'Deadlines require unique IDs, a name, and a valid date (YYYY-MM-DD).';
    }
  }
  return null;
}
