import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import type { PersistedUserData } from '@myorg/storage';

const storage = createStorageProvider();

export interface ProjectTaskPerson {
  name: string;
}

export interface ProjectMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  role?: string;
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
  creatorId?: string;
  members?: ProjectMember[];
}

export interface SharedProjectRef {
  ownerUserId: string;
  projectId: string;
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

function validateTaskOwners(project: ProjectItem): void {
  const memberUserIds = new Set(project.members?.map(m => m.userId) ?? []);
  
  // Check all tasks in all subprojects
  for (const subproject of project.subprojects ?? []) {
    for (const task of subproject.tasks ?? []) {
      for (const person of task.people ?? []) {
        // For now, we can't validate by name since we don't have access to contacts here
        // But we can at least ensure that if there are members, tasks don't have owners
        // This is a basic validation - the frontend should prevent this
        if (project.members && project.members.length > 0 && task.people && task.people.length > 0) {
          // If the project has members defined, we expect the frontend to have filtered
          // For backend validation, we'd need contact lookup which is complex
          // For now, we'll rely on frontend validation
        }
      }
    }
  }
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



export async function getOrInitUserProjects(userId: string): Promise<ProjectItem[]> {
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

async function getSharedProjectRefs(userId: string): Promise<SharedProjectRef[]> {
  const persisted = await storage.load(userId).catch(() => null);
  const refs = persisted?.sharedProjectRefs;
  if (!Array.isArray(refs)) return [];
  return refs as SharedProjectRef[];
}

async function saveSharedProjectRefs(userId: string, refs: SharedProjectRef[]): Promise<void> {
  const persisted = (await storage.load(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await storage.save(userId, { ...persisted, sharedProjectRefs: refs }).catch(() => {});
}

export async function addSharedProjectRef(userId: string, ref: SharedProjectRef): Promise<void> {
  const refs = await getSharedProjectRefs(userId);
  if (refs.some((r) => r.ownerUserId === ref.ownerUserId && r.projectId === ref.projectId)) return;
  await saveSharedProjectRefs(userId, [...refs, ref]);
}

export async function removeSharedProjectRef(userId: string, projectId: string): Promise<void> {
  const refs = await getSharedProjectRefs(userId);
  await saveSharedProjectRefs(userId, refs.filter((r) => r.projectId !== projectId));
}

/** Returns the userId who owns the storage for the given project (may differ from the requesting user for shared projects). */
export async function resolveProjectOwner(projectId: string, requestingUserId: string): Promise<string> {
  const ownProjects = await getOrInitUserProjects(requestingUserId);
  if (ownProjects.some((p) => p.id === projectId)) return requestingUserId;
  const refs = await getSharedProjectRefs(requestingUserId);
  const ref = refs.find((r) => r.projectId === projectId);
  return ref ? ref.ownerUserId : requestingUserId;
}

export async function listProjects(userId: string): Promise<ProjectItem[]> {
  const ownProjects = await getOrInitUserProjects(userId);

  // Only include own projects where the user is still a member.
  // If members is empty/absent (legacy projects), include them unconditionally.
  const visibleOwnProjects = ownProjects.filter((p) => {
    const members = p.members ?? [];
    return members.length === 0 || members.some((m) => m.userId === userId);
  });

  // Also include projects shared with this user (where they are a member)
  const refs = await getSharedProjectRefs(userId);
  const sharedProjects: ProjectItem[] = [];
  for (const ref of refs) {
    const ownerProjects = await getOrInitUserProjects(ref.ownerUserId);
    const project = ownerProjects.find((p) => p.id === ref.projectId);
    if (project) sharedProjects.push(ensureProjectLevelTasks(project));
  }

  // Combine and deduplicate by project ID to prevent duplicate keys in React
  const allProjects = [...visibleOwnProjects.map((p) => ensureProjectLevelTasks(p)), ...sharedProjects];
  const uniqueProjects = allProjects.filter((project, index, self) =>
    index === self.findIndex((p) => p.id === project.id)
  );

  return uniqueProjects;
}

export async function createProject(
  userId: string,
  input: Pick<ProjectItem, 'text'> & Partial<Pick<ProjectItem, 'color' | 'subprojects' | 'progress' | 'order' | 'goal' | 'description' | 'dueDate' | 'aiInstructions' | 'avatarUrl' | 'members'>>,
): Promise<ProjectItem> {
  const current = await getOrInitUserProjects(userId);
  const nextColor = pickColor(current.length);
  const project: ProjectItem = {
    id: generateId(),
    text: input.text,
    color: input.color ?? nextColor,
    subprojects: input.subprojects ?? [],
    creatorId: userId,
    members: input.members ?? [],
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
  patch: Partial<Pick<ProjectItem, 'text' | 'color' | 'subprojects' | 'progress' | 'order' | 'goal' | 'description' | 'dueDate' | 'aiInstructions' | 'avatarUrl' | 'members'>>,
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
  await storage.save(userId, { ...persisted, projects: next.map((item) => ensureProjectLevelTasks(item)) });
  return updated;
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const current = await getOrInitUserProjects(userId);
  const next = current.filter((item) => item.id !== id);
  projectsByUser.set(userId, next);
  const persisted = (await storage.load(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await storage.save(userId, { ...persisted, projects: next.map((item) => ensureProjectLevelTasks(item)) });
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

  const options: Record<string, any> = {};
  if (exported.metadata?.progress !== undefined) options.progress = exported.metadata.progress;
  if (exported.metadata?.order !== undefined) options.order = exported.metadata.order;
  if (exported.metadata?.goal) options.goal = exported.metadata.goal;
  if (exported.metadata?.description) options.description = exported.metadata.description;
  if (exported.metadata?.dueDate !== undefined) options.dueDate = exported.metadata.dueDate;
  if (exported.metadata?.aiInstructions) options.aiInstructions = exported.metadata.aiInstructions;
  if (exported.metadata?.avatarUrl) options.avatarUrl = exported.metadata.avatarUrl;

  const project: ProjectItem = {
    id: projectId,
    text: projectName,
    color: projectColor,
    subprojects: subprojects,
    members: [{ userId, name: userId }], // Assign the importing user as the owner
    ...options
  };

  const normalized = ensureProjectLevelTasks(project);
  current.push(normalized);
  projectsByUser.set(userId, current);
  const persisted = (await storage.load(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await storage.save(userId, { ...persisted, projects: current.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
  return normalized;
}
