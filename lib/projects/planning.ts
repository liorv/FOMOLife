import type { ProjectItem, ProjectSubproject } from '@myorg/types';
import { sortSectionTasks } from './taskOrder';

export type PlanLink = NonNullable<ProjectItem['planningLinks']>[number];
export type PlanEntityRef = PlanLink['prerequisite'];
export type PlanNode = {
  ref: PlanEntityRef;
  key: string;
  text: string;
  context: string;
  summary: string;
  done: boolean;
  recurring: boolean;
  dueDate: string | null;
  incompleteTiming: boolean;
};

export function planKey(ref: PlanEntityRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function linkKey(link: PlanLink): string {
  return JSON.stringify([planKey(link.prerequisite), planKey(link.dependent)]);
}

export function getSectionSequence(section: ProjectSubproject, links: PlanLink[]) {
  const ordered = sortSectionTasks(section.tasks, section.sortMode);
  const tasks = ordered.filter(task => !task.recurrence);
  const excluded = ordered.filter(task => !!task.recurrence);
  const existing = new Set(links.map(linkKey));
  const additions = tasks.slice(1).map((task, index): PlanLink => ({
    prerequisite: { kind: 'task', id: tasks[index]!.id },
    dependent: { kind: 'task', id: task.id },
  })).filter(link => !existing.has(linkKey(link)));
  return { tasks, excluded, additions };
}

export function isRequirement(link: PlanLink): boolean {
  return link.prerequisite.kind === 'task' && link.dependent.kind === 'task';
}

function sectionNode(section: ProjectSubproject): PlanNode {
  const tasks = section.tasks.filter(task => !task.recurrence);
  const incomplete = tasks.filter(task => !task.done);
  const dates = incomplete.flatMap(task => task.dueDate ? [task.dueDate.slice(0, 10)] : []).sort();
  const ref: PlanEntityRef = { kind: 'section', id: section.id };
  return {
    ref, key: planKey(ref), text: section.text || 'Untitled section', context: 'Section',
    summary: tasks.length
      ? `${tasks.length - incomplete.length} of ${tasks.length} tasks done`
      : section.tasks.length ? 'Recurring tasks only; excluded from progress' : 'Not broken down yet',
    done: tasks.length > 0 && incomplete.length === 0,
    recurring: false,
    dueDate: dates.at(-1) ?? null,
    incompleteTiming: incomplete.some(task => !task.dueDate),
  };
}

export function getPlanNodes(project: Pick<ProjectItem, 'subprojects'>): PlanNode[] {
  return project.subprojects.flatMap(section => [
    sectionNode(section),
    ...section.tasks.map(task => {
      const ref: PlanEntityRef = { kind: 'task', id: task.id };
      return {
        ref, key: planKey(ref), text: task.text || 'Untitled task',
        context: section.text || 'Project tasks',
        summary: task.recurrence ? 'Recurring task' : task.done ? 'Completed' : 'Open',
        done: task.done, recurring: !!task.recurrence,
        dueDate: task.dueDate?.slice(0, 10) ?? null, incompleteTiming: false,
      };
    }),
  ]);
}

export function parsePlanLinks(value: unknown): PlanLink[] | null {
  if (!Array.isArray(value)) return null;
  const result: PlanLink[] = [];
  const parseRef = (ref: unknown): PlanEntityRef | null => {
    if (!ref || typeof ref !== 'object' || !('kind' in ref) || !('id' in ref)) return null;
    if ((ref.kind !== 'task' && ref.kind !== 'section') || typeof ref.id !== 'string' || !ref.id.trim()) return null;
    return { kind: ref.kind, id: ref.id };
  };
  for (const link of value) {
    if (!link || typeof link !== 'object' || !('prerequisite' in link) || !('dependent' in link)) return null;
    const prerequisite = parseRef(link.prerequisite);
    const dependent = parseRef(link.dependent);
    if (!prerequisite || !dependent) return null;
    result.push({ prerequisite, dependent });
  }
  return result;
}

export function validatePlanLinks(nodes: PlanNode[], links: PlanLink[]): string | null {
  const byKey = new Map(nodes.map(node => [node.key, node]));
  if (byKey.size !== nodes.length) return 'This project has duplicate entity IDs. Resolve them before adding dependencies.';
  const seen = new Set<string>();
  const outgoing = new Map<string, string[]>();
  const indegree = new Map(nodes.map(node => [node.key, 0]));
  for (const link of links) {
    const from = planKey(link.prerequisite);
    const to = planKey(link.dependent);
    const prerequisite = byKey.get(from);
    const dependent = byKey.get(to);
    if (!prerequisite || !dependent) return 'A linked task or section no longer exists. Remove its link before adding dependencies.';
    if (from === to) return 'An item cannot depend on itself.';
    if (seen.has(linkKey(link))) return 'These items are already linked.';
    seen.add(linkKey(link));
    if (isRequirement(link) && (prerequisite.recurring || dependent.recurring)) {
      return 'Recurring tasks cannot be task requirements yet. Section planning hints are still available.';
    }
    outgoing.set(from, [...(outgoing.get(from) ?? []), to]);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }
  const queue = nodes.filter(node => indegree.get(node.key) === 0).map(node => node.key);
  for (let index = 0; index < queue.length; index++) {
    for (const next of outgoing.get(queue[index]!) ?? []) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  return queue.length === nodes.length ? null : 'This link would create a dependency cycle. Choose a different prerequisite.';
}

export function getPlanLayers(nodes: PlanNode[], links: PlanLink[]): PlanNode[][] {
  const keys = new Set(nodes.map(node => node.key));
  const incoming = new Map(nodes.map(node => [node.key, 0]));
  const outgoing = new Map<string, string[]>();
  for (const link of links) {
    const from = planKey(link.prerequisite);
    const to = planKey(link.dependent);
    if (!keys.has(from) || !keys.has(to)) continue;
    incoming.set(to, incoming.get(to)! + 1);
    outgoing.set(from, [...(outgoing.get(from) ?? []), to]);
  }
  const byKey = new Map(nodes.map(node => [node.key, node]));
  let layer = nodes.filter(node => incoming.get(node.key) === 0);
  const layers: PlanNode[][] = [];
  while (layer.length) {
    layers.push(layer);
    const next: PlanNode[] = [];
    for (const node of layer) {
      for (const key of outgoing.get(node.key) ?? []) {
        incoming.set(key, incoming.get(key)! - 1);
        if (incoming.get(key) === 0) next.push(byKey.get(key)!);
      }
    }
    layer = next;
  }
  return layers;
}

export function getLinkWarning(link: PlanLink, nodes: PlanNode[]): string | null {
  const prerequisite = nodes.find(node => node.key === planKey(link.prerequisite));
  const dependent = nodes.find(node => node.key === planKey(link.dependent));
  if (!prerequisite || !dependent) return 'Linked item no longer exists.';
  if (prerequisite.done || dependent.done) return null;
  if (prerequisite.incompleteTiming || dependent.incompleteTiming) {
    return 'Section timing is incomplete: some unfinished tasks have no deadline.';
  }
  if (prerequisite.dueDate && dependent.dueDate && prerequisite.dueDate > dependent.dueDate) {
    return isRequirement(link)
      ? 'Deadline conflict: prerequisite is due after the task that needs it.'
      : 'Planning warning: prerequisite deadline is later. Section dates summarize remaining tasks, not work dates.';
  }
  return null;
}
