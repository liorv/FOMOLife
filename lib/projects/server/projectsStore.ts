import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import type { PersistedUserData } from '@myorg/storage';

const storage = createStorageProvider();

export interface ProjectTaskPerson {
  name: string;
}

export interface ProjectTask {
  id: string;
  text: string;
  done: boolean;
  dueDate: string | null;
  favorite: boolean;
  description?: string;
  people: ProjectTaskPerson[];
}

export interface ProjectSubproject {
  id: string;
  text: string;
  tasks: ProjectTask[];
  collapsed?: boolean;
  isProjectLevel?: boolean;
  color?: string;
  description?: string;
  owners?: ProjectTaskPerson[];
}

export interface ProjectItem {
  id: string;
  text: string;
  color: string;
  subprojects: ProjectSubproject[];
  progress?: number;
  order?: number;
  goal?: string;
  description?: string;
  dueDate?: string | null;
  aiInstructions?: string;
  avatarUrl?: string;
}

const projectsByUser = new Map<string, ProjectItem[]>();

const COLORS = ['#0D47A1', '#1976D2', '#3F51B5', '#607D8B', '#FF8F00', '#7B1FA2'] as const;

function pickColor(index: number): string {
  return COLORS[index % COLORS.length] ?? COLORS[0];
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function ensureProjectLevelTasks(project: ProjectItem): ProjectItem {
  if (!project.subprojects) {
    project.subprojects = [];
  }

  const hasProjectLevel = project.subprojects[0]?.isProjectLevel;
  if (!hasProjectLevel) {
    const projectLevelSub: ProjectSubproject = {
      id: `project-level-${project.id}`,
      text: `${project.text} Tasks`,
      tasks: [],
      collapsed: true,
      isProjectLevel: true,
      color: project.color,
    };
    project.subprojects = [projectLevelSub, ...project.subprojects];
  } else {
    const firstSubproject = project.subprojects[0];
    project.subprojects[0] = {
      id: firstSubproject?.id ?? `project-level-${project.id}`,
      text: `${project.text} Tasks`,
      tasks: firstSubproject?.tasks ?? [],
      collapsed: firstSubproject?.collapsed ?? true,
      color: project.color,
      ...(firstSubproject?.description ? { description: firstSubproject.description } : {}),
      ...(firstSubproject?.owners ? { owners: firstSubproject.owners } : {}),
      isProjectLevel: true,
    };
  }

  return project;
}



async function getOrInitUserProjects(userId: string): Promise<ProjectItem[]> {
  if (process.env.NODE_ENV !== 'production') {
    const existing = projectsByUser.get(userId);
    if (existing) return existing;
  }

  const persisted = await storage.load(userId).catch(() => null);
  if (persisted) {
    const persistedProjects = Array.isArray(persisted.projects) ? persisted.projects : [];
    const normalizedPersisted = persistedProjects.map((project) => ensureProjectLevelTasks(project as ProjectItem));
    projectsByUser.set(userId, normalizedPersisted);
    return normalizedPersisted;
  }

  // No persisted projects — start empty (no seed data).
  projectsByUser.set(userId, []);
  return [];
}

export async function listProjects(userId: string): Promise<ProjectItem[]> {
  const projects = await getOrInitUserProjects(userId);
  return [...projects].map((project) => ensureProjectLevelTasks(project));
}

export async function createProject(
  userId: string,
  input: Pick<ProjectItem, 'text'> & Partial<Pick<ProjectItem, 'color' | 'subprojects' | 'progress' | 'order' | 'goal' | 'description' | 'dueDate' | 'aiInstructions' | 'avatarUrl'>>,
): Promise<ProjectItem> {
  const current = await getOrInitUserProjects(userId);
  const nextColor = pickColor(current.length);
  const project: ProjectItem = {
    id: generateId(),
    text: input.text,
    color: input.color ?? nextColor,
    subprojects: input.subprojects ?? [],
    ...(typeof input.progress === 'number' ? { progress: input.progress } : {}),
    ...(typeof input.order === 'number' ? { order: input.order } : {}),
    ...(input.goal ? { goal: input.goal } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    ...(input.aiInstructions ? { aiInstructions: input.aiInstructions } : {}),
    ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
  };
  const normalized = ensureProjectLevelTasks(project);
  current.push(normalized);
  projectsByUser.set(userId, current);
  const persisted = (await storage.load(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await storage.save(userId, { ...persisted, projects: current.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
  return normalized;
}

export async function updateProject(
  userId: string,
  id: string,
  patch: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order' | 'goal' | 'description' | 'dueDate' | 'aiInstructions' | 'avatarUrl'>>,
): Promise<ProjectItem | null> {
  const current = await getOrInitUserProjects(userId);
  const next = current.map((item) => {
    if (item.id !== id) return item;
    const updated = { ...item, ...patch };
    return ensureProjectLevelTasks(updated);
  });
  const updated = next.find((item) => item.id === id) ?? null;
  projectsByUser.set(userId, next);
  const persisted = (await storage.load(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await storage.save(userId, { ...persisted, projects: next.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
  return updated;
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const current = await getOrInitUserProjects(userId);
  const next = current.filter((item) => item.id !== id);
  projectsByUser.set(userId, next);
  const persisted = (await storage.load(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await storage.save(userId, { ...persisted, projects: next.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
  return next.length !== current.length;
}

export async function initFromJSON(userId: string, exported: any): Promise<ProjectItem> {
  const current = await getOrInitUserProjects(userId);
  const nextColor = pickColor(current.length);

  const projectId = exported.id ?? generateId();
  const projectName = exported.name ?? exported.metadata?.text ?? exported.metadata?.title ?? 'Imported Project';
  const projectColor = exported.color ?? nextColor;

  const subprojects: ProjectSubproject[] = (exported.sub_projects || []).map((s: any, idx: number) => {
    const subId = s.id ?? generateId();
    const tasks: ProjectTask[] = (s.tasks || []).map((t: any) => ({
      id: t.id ?? generateId(),
      text: t.description ?? t.text ?? '',
      description: t.description ?? undefined,
      done: !!t.done,
      dueDate: t.dueDate ?? null,
      favorite: !!t.favorite,
      people: t.people ?? [],
    }));

    const sub: ProjectSubproject = {
      id: subId,
      text: s.title ?? s.text ?? `Subproject ${idx + 1}`,
      tasks,
      collapsed: !!s.collapsed,
      isProjectLevel: !!s.isProjectLevel,
      color: s.color ?? undefined,
      description: s.description ?? undefined,
      owners: s.owners ?? undefined,
    };
    return sub;
  });

  const project: ProjectItem = {
    id: projectId,
    text: projectName,
    color: projectColor,
    subprojects: subprojects,
    ...(exported.metadata?.progress !== undefined ? { progress: exported.metadata.progress } : {}),
    ...(exported.metadata?.order !== undefined ? { order: exported.metadata.order } : {}),
    ...(exported.metadata?.goal ? { goal: exported.metadata.goal } : {}),
    ...(exported.metadata?.description ? { description: exported.metadata.description } : {}),
    ...(exported.metadata?.dueDate !== undefined ? { dueDate: exported.metadata.dueDate } : {}),
    ...(exported.metadata?.aiInstructions ? { aiInstructions: exported.metadata.aiInstructions } : {}),
  };

  const normalized = ensureProjectLevelTasks(project);
  current.push(normalized);
  projectsByUser.set(userId, current);
  const persisted = (await storage.load(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await storage.save(userId, { ...persisted, projects: current.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
  return normalized;
}
