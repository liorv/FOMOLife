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
  const existing = projectsByUser.get(userId);
  if (existing) return existing;

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
  input: Pick<ProjectItem, 'text'> & Partial<Pick<ProjectItem, 'color' | 'subprojects' | 'progress' | 'order'>>,
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
  patch: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order'>>,
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
