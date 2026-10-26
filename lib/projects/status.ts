import type { ProjectItem, ProjectScheduleHealth, ProjectStatusSnapshot, ProjectTask, ProjectTaskStatus, ProjectUpdateInput } from '@myorg/types';
import { isRequirement } from './planning';
import { advanceRecurringTask } from '../tasks/recurrence';
import { buildRoadmap } from './roadmap';

export const TASK_STATUSES: { value: ProjectTaskStatus; label: string }[] = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
];

export function isTaskStatus(value: unknown): value is ProjectTaskStatus {
  return value === 'on_track' || TASK_STATUSES.some(status => status.value === value);
}

export function getTaskStatus(task: { done: boolean; status?: ProjectTaskStatus | undefined }): ProjectTaskStatus {
  return task.done ? 'complete' : task.status === 'on_track' ? 'in_progress'
    : task.status && task.status !== 'complete' ? task.status : 'not_started';
}

export function isScheduleHealth(value: unknown): value is ProjectScheduleHealth {
  return value === 'on_track' || value === 'behind';
}

export function isActiveStatus(status: ProjectTaskStatus): boolean {
  return status === 'in_progress' || status === 'blocked';
}

export function getScheduleHealth(task: { done: boolean; status?: ProjectTaskStatus; scheduleHealth?: ProjectScheduleHealth | null }): ProjectScheduleHealth | null {
  return isActiveStatus(getTaskStatus(task)) ? task.scheduleHealth ?? 'on_track' : null;
}

export function getStatusUpdateTaskId(patch: ProjectUpdateInput): string | undefined {
  return patch.taskStatusUpdate?.taskId ?? patch.taskScheduleUpdate?.taskId ?? patch.taskDelayUpdate?.taskId ?? patch.taskStatusNote?.taskId;
}

export function applyTaskStatusUpdate<T extends ProjectTask>(task: T, patch: ProjectUpdateInput): T {
  if (task.id !== getStatusUpdateTaskId(patch)) return task;
  if (patch.taskStatusUpdate) {
    const status = getTaskStatus({ done: patch.taskStatusUpdate.status === 'complete', status: patch.taskStatusUpdate.status });
    const updated = { ...task, status, done: status === 'complete' };
    updated.scheduleHealth = getScheduleHealth(updated);
    return updated.done ? advanceRecurringTask(updated) ?? updated : updated;
  }
  if (patch.taskScheduleUpdate) return { ...task, scheduleHealth: patch.taskScheduleUpdate.health };
  if (patch.taskDelayUpdate) return { ...task, delayDays: patch.taskDelayUpdate.days,
    scheduleHealth: patch.taskDelayUpdate.days > 0 ? 'behind' : 'on_track' };
  const note = patch.taskStatusNote;
  if (!note) return task;
  const updates = task.statusUpdates ?? [];
  return { ...task, statusUpdates: note.action === 'add'
    ? [...updates.filter(update => update.id !== note.update.id), { ...note.update, text: note.update.text.trim() }]
    : updates.filter(update => update.id !== note.updateId) };
}

export function validateStatusUpdate(patch: ProjectUpdateInput): string | null {
  const operations = [patch.taskStatusUpdate, patch.taskScheduleUpdate, patch.taskDelayUpdate, patch.taskStatusNote].filter(value => value !== undefined);
  if (!operations.length) return null;
  if (operations.length > 1 || patch.subprojects !== undefined) return 'Send one task reporting change at a time, separately from project sections.';
  const operation = operations[0];
  if (!operation || typeof operation.taskId !== 'string' || !operation.taskId.trim()) return 'A valid task ID is required.';
  if (patch.taskStatusUpdate && !isTaskStatus(patch.taskStatusUpdate.status)) return 'Invalid task status.';
  if (patch.taskScheduleUpdate && !isScheduleHealth(patch.taskScheduleUpdate.health)) return 'Invalid schedule health.';
  if (patch.taskDelayUpdate && (!Number.isFinite(patch.taskDelayUpdate.days) || patch.taskDelayUpdate.days < 0 || patch.taskDelayUpdate.days > 36500)) return 'Delay must be between 0 and 36500 calendar days.';
  if (patch.taskStatusNote) {
    const note = patch.taskStatusNote;
    if (note.action === 'add') {
      if (!note.update || typeof note.update.id !== 'string' || !note.update.id.trim() ||
        typeof note.update.text !== 'string' || !note.update.text.trim() || note.update.text.length > 5000) {
        return 'An update needs an ID and text of 1 to 5000 characters.';
      }
    } else if (note.action !== 'remove' || typeof note.updateId !== 'string' || !note.updateId.trim()) return 'Invalid task update action.';
  }
  return null;
}

export function validateTaskStatuses(subprojects: unknown): string | null {
  if (subprojects === undefined) return null;
  if (!Array.isArray(subprojects)) return 'Project sections must be an array.';
  for (const section of subprojects) {
    if (!section || !Array.isArray(section.tasks)) return 'Each section must contain tasks.';
    for (const task of section.tasks) {
      if (!task || (task.status !== undefined && !isTaskStatus(task.status))) return 'Invalid task status.';
      if (task.delayDays !== undefined && (!Number.isFinite(task.delayDays) || task.delayDays < 0 || task.delayDays > 36500)) return 'Invalid delay days.';
      if (task.scheduleHealth !== undefined && task.scheduleHealth !== null && !isScheduleHealth(task.scheduleHealth)) return 'Invalid schedule health.';
      if (task.statusUpdates !== undefined && (!Array.isArray(task.statusUpdates) || task.statusUpdates.some((note: unknown) =>
        !note || typeof note !== 'object' || !('id' in note) || typeof note.id !== 'string' || !note.id.trim() ||
        !('text' in note) || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 5000,
      ))) return 'Invalid task updates.';
    }
  }
  return null;
}

export function buildProjectStatus(project: ProjectItem, now = new Date()) {
  const tasks = project.subprojects.flatMap(section => section.tasks.map(task => ({
    id: task.id, text: task.text, sectionId: section.id, section: section.text,
    status: getTaskStatus(task), eligible: true,
    scheduleHealth: getScheduleHealth(task),
    inheritedBehind: false,
    statusUpdates: (task.statusUpdates ?? []).map(note => ({ ...note })),
    delayDays: task.delayDays ?? 0,
  })));
  const byId = new Map(tasks.map(task => [task.id, task]));
  const links = (project.planningLinks ?? []).filter(isRequirement);
  for (const task of tasks) {
    task.eligible = task.status === 'complete' || links
      .filter(link => link.dependent.id === task.id)
      .every(link => byId.get(link.prerequisite.id)?.status === 'complete');
    if (!task.eligible) task.scheduleHealth = null;
  }
  const outgoing = new Map<string, string[]>();
  for (const link of links) outgoing.set(link.prerequisite.id, [...(outgoing.get(link.prerequisite.id) ?? []), link.dependent.id]);
  const behind = new Set(tasks.filter(task => task.scheduleHealth === 'behind' && task.eligible).map(task => task.id));
  const behindQueue = [...behind];
  for (let index = 0; index < behindQueue.length; index++) {
    for (const id of outgoing.get(behindQueue[index]!) ?? []) {
      const dependent = byId.get(id);
      if (!dependent || dependent.status === 'complete' || behind.has(id)) continue;
      behind.add(id);
      dependent.inheritedBehind = true;
      dependent.scheduleHealth = 'behind';
      behindQueue.push(id);
    }
  }
  const behindTasks = tasks.filter(task => behind.has(task.id)).map(({ id, text }) => ({ id, text }));
  const blockedTasks = tasks.filter(task => task.status === 'blocked').map(({ id, text }) => ({ id, text }));
  const sources = new Set([...blockedTasks.map(task => task.id),
    ...tasks.filter(task => task.scheduleHealth === 'behind' && !task.inheritedBehind).map(task => task.id)]);
  const affected = new Set(sources);
  const queue = [...affected];
  for (let index = 0; index < queue.length; index++) {
    for (const link of links.filter(link => link.prerequisite.id === queue[index])) {
      const dependent = byId.get(link.dependent.id);
      if (!dependent || dependent.status === 'complete' || affected.has(dependent.id)) continue;
      affected.add(dependent.id);
      queue.push(dependent.id);
    }
  }
  const downstreamTasks = tasks.filter(task => affected.has(task.id) && !sources.has(task.id))
    .map(({ id, text }) => ({ id, text }));
  const milestones = (project.milestones ?? []).filter(milestone =>
    milestone.taskIds.some(id => affected.has(id)) ||
    milestone.sectionIds?.some(id => tasks.some(task => task.sectionId === id && affected.has(task.id))),
  ).map(({ id, label }) => ({ id, label }));
  const deadlines = affected.size ? [
    ...(project.deadlines ?? []).map(({ id, label, date }) => ({ id, label, date })),
    ...(project.dueDate ? [{ id: 'project-due-date', label: 'Project due date', date: project.dueDate.slice(0, 10) }] : []),
  ] : [];
  const status: ProjectTaskStatus = tasks.length > 0 && tasks.every(task => task.status === 'complete') ? 'complete'
    : blockedTasks.length ? 'blocked'
    : tasks.some(task => task.status === 'in_progress' || task.status === 'complete') ? 'in_progress'
    : 'not_started';
  const forecast = forecastProject(project, now);
  const scheduleHealth: ProjectScheduleHealth | null = behindTasks.length || blockedTasks.length || forecast.deadlines.some(deadline => deadline.daysLate > 0) ? 'behind'
    : tasks.some(task => isActiveStatus(task.status) || task.status === 'complete') ? 'on_track' : null;
  const completed = tasks.filter(task => task.status === 'complete').length;
  const summary = `${completed} of ${tasks.length} tasks complete; ${blockedTasks.length} blocked; ${behindTasks.length} behind; ${downstreamTasks.length} downstream tasks affected.`;
  return { tasks, status, scheduleHealth, forecast, summary, impact: { blockedTasks, behindTasks, downstreamTasks, milestones, deadlines } };
}

export function forecastProject(project: ProjectItem, now = new Date()): NonNullable<ProjectStatusSnapshot['forecast']> {
  const sections = project.subprojects.map(section => ({ ...section, tasks: section.tasks.filter(task => !task.recurrence) }));
  const taskIds = new Set(sections.flatMap(section => section.tasks.map(task => task.id)));
  const links = (project.planningLinks ?? []).filter(isRequirement).filter(link =>
    taskIds.has(link.prerequisite.id) && taskIds.has(link.dependent.id));
  const missingLinks = (project.planningLinks ?? []).filter(isRequirement).some(link =>
    !project.subprojects.some(section => section.tasks.some(task => task.id === link.prerequisite.id)) ||
    !project.subprojects.some(section => section.tasks.some(task => task.id === link.dependent.id)));
  const base = buildRoadmap({ ...project, subprojects: sections }, links);
  const missingEffort = base.entries.filter(entry => entry.estimated).length;
  const delayed = buildRoadmap({ ...project, subprojects: sections.map(section => ({
    ...section, tasks: section.tasks.map(task => ({
      ...task, effort: task.effort == null ? null : task.effort +
        (isActiveStatus(getTaskStatus(task)) && getScheduleHealth(task) === 'behind' ? task.delayDays ?? 0 : 0),
    })),
  })) }, links);
  const duration = Math.max(0, ...delayed.entries.map(entry => entry.end));
  const baseline = Math.max(0, ...base.entries.map(entry => entry.end));
  const dates = [...(project.deadlines ?? []), ...(project.dueDate ? [{ label: 'Project deadline', date: project.dueDate.slice(0, 10) }] : [])];
  const invalidDate = dates.some(({ date }) => !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date);
  const error = missingLinks ? 'Repair missing task prerequisites to calculate a finish date.'
    : base.error ?? delayed.error ?? (invalidDate ? 'Repair invalid project deadline dates to calculate a finish date.' : null);
  const earliestFinish = error || missingEffort ? null
    : new Date(Date.parse(now.toISOString().slice(0, 10)) + Math.ceil(duration) * 86400000).toISOString().slice(0, 10);
  return { earliestFinish, delayDays: Math.ceil(duration) - Math.ceil(baseline), missingEffort, error,
    deadlines: dates.map(deadline => ({ label: deadline.label, date: deadline.date,
      daysLate: earliestFinish ? Math.max(0, Math.ceil((Date.parse(earliestFinish) - Date.parse(deadline.date)) / 86400000)) : 0 })) };
}

export function recordProjectStatus(project: ProjectItem, updatedBy: string, now = new Date()): ProjectStatusSnapshot[] {
  const snapshot: ProjectStatusSnapshot = {
    ...buildProjectStatus(project, now), date: now.toISOString().slice(0, 10),
    updatedAt: now.toISOString(), updatedBy, projectName: project.text,
  };
  return [...(project.statusHistory ?? []).filter(row => row.date !== snapshot.date), snapshot]
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function compareTaskSnapshots(current: ProjectStatusSnapshot, previous?: ProjectStatusSnapshot) {
  const previousTasks = new Map(previous?.tasks.map(task => [task.id, task]) ?? []);
  const currentIds = new Set(current.tasks.map(task => task.id));
  const label = (status: ProjectTaskStatus) => TASK_STATUSES.find(item => item.value === status)?.label ?? 'On track';
  const rows = current.tasks.map(task => {
    const before = previousTasks.get(task.id);
    const changes: string[] = [];
    if (!previous) changes.push('First recorded snapshot');
    else if (!before) changes.push('Task added since previous snapshot');
    else {
      if (before.status !== task.status) changes.push(`Status: ${label(before.status)} -> ${label(task.status)}`);
      if (before.scheduleHealth !== undefined && task.scheduleHealth !== undefined &&
        (before.scheduleHealth !== task.scheduleHealth || !!before.inheritedBehind !== !!task.inheritedBehind)) {
        const health = (value: typeof task) => value.scheduleHealth
          ? `${value.scheduleHealth === 'behind' ? 'Behind' : 'On track'}${value.inheritedBehind ? ' (prerequisite)' : ''}` : 'Not active';
        changes.push(`Schedule: ${health(before)} -> ${health(task)}`);
      }
      if (before.text !== task.text) changes.push(`Renamed from "${before.text}"`);
      if ((before.delayDays ?? 0) !== (task.delayDays ?? 0)) changes.push(`Delay: ${before.delayDays ?? 0} -> ${task.delayDays ?? 0} calendar days`);
      if (before.sectionId !== task.sectionId || before.section !== task.section) changes.push(`Section: ${before.section} -> ${task.section}`);
      if (before.eligible !== task.eligible) changes.push(task.eligible ? 'Now ready or complete' : 'Now waiting on prerequisites');
    }
    const comparableNotes = previous && before?.statusUpdates !== undefined && task.statusUpdates !== undefined;
    const oldNotes = new Map(before?.statusUpdates?.map(note => [note.id, note]) ?? []);
    const notes = task.statusUpdates?.map(note => ({
      ...note,
      change: comparableNotes ? !oldNotes.has(note.id) ? 'Added'
        : oldNotes.get(note.id)!.text !== note.text ? 'Edited' : null : null,
    }));
    const removedNotes = comparableNotes
      ? before.statusUpdates!.filter(note => !task.statusUpdates!.some(currentNote => currentNote.id === note.id)) : [];
    const addedCount = notes?.filter(note => note.change === 'Added').length ?? 0;
    const editedCount = notes?.filter(note => note.change === 'Edited').length ?? 0;
    if (addedCount) changes.push(`${addedCount} note${addedCount === 1 ? '' : 's'} added`);
    if (editedCount) changes.push(`${editedCount} note${editedCount === 1 ? '' : 's'} edited`);
    if (removedNotes.length) changes.push(`${removedNotes.length} note${removedNotes.length === 1 ? '' : 's'} removed`);
    if (previous && before && !changes.length) changes.push('No recorded changes');
    return { task, changes, notes, removedNotes, removed: false };
  });
  for (const task of previous?.tasks ?? []) {
    if (!currentIds.has(task.id)) rows.push({
      task, changes: ['Task removed since previous snapshot'], notes: task.statusUpdates?.map(note => ({ ...note, change: null })),
      removedNotes: [], removed: true,
    });
  }
  return rows;
}
