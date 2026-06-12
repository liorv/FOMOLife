import 'server-only';

import fs from 'fs';
import path from 'path';
import { getSupabaseAdminClient } from '@myorg/storage';

export interface DailyActivitySnapshot {
  date: string; // YYYY-MM-DD
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalProjects: number;
  newProjects: number;
  totalTasks: number;
  newTasks: number;
  completedTasks: number;
  totalContacts: number;
  newContacts: number;
}

export interface AdminMetricsData {
  snapshots: DailyActivitySnapshot[];
  lastUpdated: string;
}

// ── File-based storage (dev) ────────────────────────────────────────────────

const METRICS_FILE = path.resolve(process.cwd(), 'data', 'admin-metrics.json');

function readMetricsFile(): AdminMetricsData {
  try {
    const raw = fs.readFileSync(METRICS_FILE, 'utf8');
    return JSON.parse(raw) as AdminMetricsData;
  } catch {
    return { snapshots: [], lastUpdated: '' };
  }
}

function writeMetricsFile(data: AdminMetricsData): void {
  fs.mkdirSync(path.dirname(METRICS_FILE), { recursive: true });
  fs.writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Supabase-based storage (prod) ──────────────────────────────────────────

async function upsertSnapshotSupabase(snapshot: DailyActivitySnapshot): Promise<void> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  const { error } = await supabase
    .from('admin_activity_snapshots')
    .upsert(
      {
        date: snapshot.date,
        total_users: snapshot.totalUsers,
        new_users: snapshot.newUsers,
        active_users: snapshot.activeUsers,
        total_projects: snapshot.totalProjects,
        new_projects: snapshot.newProjects,
        total_tasks: snapshot.totalTasks,
        new_tasks: snapshot.newTasks,
        completed_tasks: snapshot.completedTasks,
        total_contacts: snapshot.totalContacts,
        new_contacts: snapshot.newContacts,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'date' },
    );
  if (error) throw error;
}

async function loadSnapshotsSupabase(): Promise<DailyActivitySnapshot[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('admin_activity_snapshots')
    .select('*')
    .order('date', { ascending: true });
  if (error) {
    // Table may not exist yet — return empty rather than crashing
    console.warn('[adminMetrics] Supabase load error (table may need creating):', error.message);
    return [];
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    date: row.date as string,
    totalUsers: row.total_users as number,
    newUsers: row.new_users as number,
    activeUsers: row.active_users as number,
    totalProjects: row.total_projects as number,
    newProjects: row.new_projects as number,
    totalTasks: row.total_tasks as number,
    newTasks: row.new_tasks as number,
    completedTasks: row.completed_tasks as number,
    totalContacts: row.total_contacts as number,
    newContacts: row.new_contacts as number,
  }));
}

// ── Data collection ─────────────────────────────────────────────────────────

async function collectCurrentMetrics(
  date: string,
  previousSnapshot: DailyActivitySnapshot | null,
): Promise<DailyActivitySnapshot> {
  const supabase = getSupabaseAdminClient();

  let allUserData: Array<{ userId: string; data: Record<string, unknown> }> = [];

  if (supabase) {
    // Supabase available: query all rows from user_data table
    const { data, error } = await supabase.from('user_data').select('user_id, data');
    if (!error && data) {
      allUserData = data.map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        data: (row.data ?? {}) as Record<string, unknown>,
      }));
    }
  } else {
    // File-based: scan data/user_data/*.json files
    const userDataDir = path.resolve(process.cwd(), 'data', 'user_data');
    try {
      const files = fs.readdirSync(userDataDir).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(userDataDir, file), 'utf8');
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          const userId = decodeURIComponent(file.replace('.json', ''));
          allUserData.push({ userId, data: parsed });
        } catch {
          // skip malformed files
        }
      }
    } catch {
      // directory may not exist
    }
  }

  const totalUsers = allUserData.length;
  let totalProjects = 0;
  let totalTasks = 0;
  let completedTasks = 0;
  let totalContacts = 0;
  const activeUserIds = new Set<string>();

  for (const { data } of allUserData) {
    const projects = Array.isArray(data.projects) ? data.projects : [];
    const tasks = Array.isArray(data.tasks) ? data.tasks : [];
    const contacts = Array.isArray(data.contacts) ? data.contacts : [];

    totalProjects += projects.length;
    totalTasks += tasks.length;
    totalContacts += contacts.length;

    const doneTasks = (tasks as Array<Record<string, unknown>>).filter((t) => t.done === true);
    completedTasks += doneTasks.length;

    // Consider a user active if they have any data at all
    if (projects.length > 0 || tasks.length > 0) {
      activeUserIds.add('active');
    }
  }

  const activeUsers = activeUserIds.size > 0 ? allUserData.filter((u) => {
    const d = u.data;
    return (
      (Array.isArray(d.projects) && (d.projects as unknown[]).length > 0) ||
      (Array.isArray(d.tasks) && (d.tasks as unknown[]).length > 0)
    );
  }).length : 0;

  const prevTotalUsers = previousSnapshot?.totalUsers ?? 0;
  const prevTotalProjects = previousSnapshot?.totalProjects ?? 0;
  const prevTotalTasks = previousSnapshot?.totalTasks ?? 0;
  const prevTotalContacts = previousSnapshot?.totalContacts ?? 0;

  return {
    date,
    totalUsers,
    newUsers: Math.max(0, totalUsers - prevTotalUsers),
    activeUsers,
    totalProjects,
    newProjects: Math.max(0, totalProjects - prevTotalProjects),
    totalTasks,
    newTasks: Math.max(0, totalTasks - prevTotalTasks),
    completedTasks,
    totalContacts,
    newContacts: Math.max(0, totalContacts - prevTotalContacts),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function runDailySnapshotJob(): Promise<DailyActivitySnapshot> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = getSupabaseAdminClient();
  const useSupabase = !!supabase;

  let snapshots: DailyActivitySnapshot[];
  if (useSupabase) {
    snapshots = await loadSnapshotsSupabase();
  } else {
    snapshots = readMetricsFile().snapshots;
  }

  const previousSnapshot = snapshots.length > 0 ? (snapshots[snapshots.length - 1] ?? null) : null;
  const snapshot = await collectCurrentMetrics(today, previousSnapshot);

  if (useSupabase) {
    await upsertSnapshotSupabase(snapshot);
  } else {
    const existingIdx = snapshots.findIndex((s) => s.date === today);
    if (existingIdx >= 0) {
      snapshots[existingIdx] = snapshot;
    } else {
      snapshots.push(snapshot);
    }
    writeMetricsFile({ snapshots, lastUpdated: new Date().toISOString() });
  }

  return snapshot;
}

export async function loadAdminMetrics(): Promise<AdminMetricsData> {
  const supabase = getSupabaseAdminClient();
  if (supabase) {
    const snapshots = await loadSnapshotsSupabase();
    return { snapshots, lastUpdated: snapshots.length > 0 ? new Date().toISOString() : '' };
  }
  return readMetricsFile();
}
