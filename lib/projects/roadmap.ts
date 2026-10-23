import type { ProjectItem, ProjectTask } from '@myorg/types';
import { getPlanNodes, validatePlanLinks, type PlanLink } from './planning';

export type RoadmapEntry = {
  task: ProjectTask;
  section: string;
  start: number;
  end: number;
  estimated: boolean;
  prerequisiteIds: string[];
};

export function buildRoadmap(project: ProjectItem, links: PlanLink[]): { entries: RoadmapEntry[]; error: string | null } {
  const error = validatePlanLinks(getPlanNodes(project), links);
  if (error) return { entries: [], error };
  const tasks = project.subprojects.flatMap(section => section.tasks.map(task => ({ task, section: section.text })));
  const byId = new Map(tasks.map(item => [item.task.id, item]));
  const prerequisites = new Map(tasks.map(item => [item.task.id, new Set<string>()]));
  const expand = (ref: PlanLink['dependent']) => ref.kind === 'task'
    ? [ref.id]
    : project.subprojects.find(section => section.id === ref.id)!.tasks.map(task => task.id);
  for (const link of links) {
    for (const dependent of expand(link.dependent)) {
      for (const prerequisite of expand(link.prerequisite)) {
        prerequisites.get(dependent)!.add(prerequisite);
      }
    }
  }
  const entries = new Map<string, RoadmapEntry>();
  const visiting = new Set<string>();
  function schedule(id: string): RoadmapEntry | null {
    const existing = entries.get(id);
    if (existing) return existing;
    if (visiting.has(id)) return null;
    visiting.add(id);
    let start = 0;
    const item = byId.get(id)!;
    // Completed work is already available and does not delay the forecast.
    if (!item.task.done) {
      for (const prerequisite of prerequisites.get(id)!) {
        const previous = schedule(prerequisite);
        if (!previous) return null;
        start = Math.max(start, previous.end);
      }
    }
    const effort = item.task.effort;
    const estimated = effort == null || !Number.isFinite(effort) || effort < 0;
    const duration = item.task.done ? 0 : estimated ? 1 : effort!;
    const entry = { ...item, start, end: start + duration, estimated: !item.task.done && estimated, prerequisiteIds: [...prerequisites.get(id)!] };
    entries.set(id, entry);
    visiting.delete(id);
    return entry;
  }
  for (const { task } of tasks) {
    if (!schedule(task.id)) return { entries: [], error: 'Section hints create a task scheduling cycle. Adjust the dependencies to show a roadmap.' };
  }
  return { entries: tasks.map(item => entries.get(item.task.id)!), error: null };
}

export function getRoadmapLanes(entries: RoadmapEntry[]): RoadmapEntry[][] {
  const lanes: RoadmapEntry[][] = [];
  const pending = new Map(entries.map(entry => [entry.task.id, entry]));
  const placed = new Set<string>();
  while (pending.size) {
    // Topological placement keeps zero-duration prerequisites ahead of their dependents.
    const ready = [...pending.values()]
      .filter(entry => entry.prerequisiteIds.every(id => !pending.has(id) || placed.has(id)))
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const next = ready[0] ?? pending.values().next().value;
    if (!next) break;
    const lane = lanes.find(items => {
      const tail = items[items.length - 1]!;
      return next.prerequisiteIds.includes(tail.task.id) && tail.end <= next.start;
    });
    if (lane) lane.push(next);
    else lanes.push([next]);
    placed.add(next.task.id);
    pending.delete(next.task.id);
  }
  return lanes;
}
