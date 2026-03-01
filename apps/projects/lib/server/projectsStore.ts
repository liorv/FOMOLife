import 'server-only';

import { createClient } from '@supabase/supabase-js';

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

type PersistedUserData = {
  tasks?: unknown[];
  projects?: ProjectItem[];
  people?: unknown[];
};

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !key) {
    return null;
  }
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function loadPersistedUserData(userId: string): Promise<PersistedUserData | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('user_data')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { tasks: [], projects: [], people: [] };
    }
    throw error;
  }

  return (data?.data ?? { tasks: [], projects: [], people: [] }) as PersistedUserData;
}

async function savePersistedUserData(userId: string, data: PersistedUserData): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('user_data')
    .upsert(
      {
        user_id: userId,
        data,
        updated_at: now,
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    throw error;
  }
}

async function getOrInitUserProjects(userId: string): Promise<ProjectItem[]> {
  const existing = projectsByUser.get(userId);
  if (existing) return existing;

  const persisted = await loadPersistedUserData(userId).catch(() => null);
  if (persisted) {
    const persistedProjects = Array.isArray(persisted.projects) ? persisted.projects : [];
    const normalizedPersisted = persistedProjects.map((project) => ensureProjectLevelTasks(project));
    projectsByUser.set(userId, normalizedPersisted);
    return normalizedPersisted;
  }

  const seed: ProjectItem[] = [
    {
      id: 'p1',
      text: 'Launch Website',
      color: pickColor(0),
      subprojects: [
        {
          id: 'sp1',
          text: 'Landing Page',
          tasks: [
            {
              id: 't1',
              text: 'Draft hero copy',
              done: false,
              dueDate: null,
              favorite: false,
              people: [],
            },
          ],
          collapsed: true,
        },
        {
          id: 'sp2',
          text: 'Checkout',
          tasks: [
            {
              id: 't2',
              text: 'Confirm payment success flow',
              done: false,
              dueDate: null,
              favorite: true,
              people: [],
            },
          ],
          collapsed: true,
        },
      ],
    },
    {
      id: 'p2',
      text: 'Marketing Sprint',
      color: pickColor(1),
      subprojects: [
        {
          id: 'sp3',
          text: 'Email Sequence',
          tasks: [
            {
              id: 't3',
              text: 'Write onboarding email',
              done: false,
              dueDate: null,
              favorite: false,
              people: [],
            },
          ],
          collapsed: true,
        },
      ],
    },
  ];

  const hydrated = seed.map((project) => ensureProjectLevelTasks(project));
  projectsByUser.set(userId, hydrated);
  return hydrated;
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
  const persisted = (await loadPersistedUserData(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await savePersistedUserData(userId, { ...persisted, projects: current.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
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
  const persisted = (await loadPersistedUserData(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await savePersistedUserData(userId, { ...persisted, projects: next.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
  return updated;
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  const current = await getOrInitUserProjects(userId);
  const next = current.filter((item) => item.id !== id);
  projectsByUser.set(userId, next);
  const persisted = (await loadPersistedUserData(userId).catch(() => null)) ?? { tasks: [], people: [] };
  await savePersistedUserData(userId, { ...persisted, projects: next.map((item) => ensureProjectLevelTasks(item)) }).catch(() => {});
  return next.length !== current.length;
}
