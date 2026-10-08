import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import type { PersistedUserData } from '@myorg/storage';
import { generateId, withKeyedLock } from '@myorg/utils';
import type {
  TaskDueNotification,
  TaskNotificationSettings,
  TaskNotifyBefore,
  TaskReminderStage,
} from '@myorg/types';
import { sendPushToUser } from '../../server/webPush';
import { getNotificationUrl } from '../../notificationNavigation';
import { listAllUsersData } from './allUsersData';

const storage = createStorageProvider();

const NOTIF_KEY_PREFIX = '__task_notifs__';
const SETTINGS_KEY_PREFIX = '__task_notif_settings__';
const STATE_KEY_PREFIX = '__task_notif_state__';

export const DEFAULT_TASK_NOTIFICATION_SETTINGS: TaskNotificationSettings = {
  createdByMe: { enabled: true, notifyBefore: '1d' },
  assignedToMe: { enabled: true, notifyBefore: '1d' },
};

/** Per-task snooze override: reminder should fire again at this timestamp. */
interface TaskNotifState {
  /** Set of "taskId:stage" keys already notified, to avoid duplicate sends. */
  sent: string[];
  /** taskId → { stage, remindAt } — a one-off reschedule requested by the user. */
  overrides: Record<string, { stage: TaskReminderStage; remindAt: string }>;
}

const DEFAULT_STATE: TaskNotifState = { sent: [], overrides: {} };

// ── Settings ─────────────────────────────────────────────────────────────────

export async function getTaskNotificationSettings(userId: string): Promise<TaskNotificationSettings> {
  const persisted = await storage.load(`${SETTINGS_KEY_PREFIX}${userId}`);
  const settings = persisted?.settings as TaskNotificationSettings | undefined;
  if (!settings) return DEFAULT_TASK_NOTIFICATION_SETTINGS;
  return {
    createdByMe: { ...DEFAULT_TASK_NOTIFICATION_SETTINGS.createdByMe, ...settings.createdByMe },
    assignedToMe: { ...DEFAULT_TASK_NOTIFICATION_SETTINGS.assignedToMe, ...settings.assignedToMe },
  };
}

export async function saveTaskNotificationSettings(
  userId: string,
  settings: TaskNotificationSettings,
): Promise<void> {
  const data: PersistedUserData = { settings };
  await storage.save(`${SETTINGS_KEY_PREFIX}${userId}`, data);
}

// ── Notifications ────────────────────────────────────────────────────────────

async function loadNotifications(userId: string): Promise<TaskDueNotification[]> {
  const persisted = await storage.load(`${NOTIF_KEY_PREFIX}${userId}`);
  return (Array.isArray(persisted?.notifications) ? persisted.notifications : []) as TaskDueNotification[];
}

async function saveNotifications(userId: string, notifs: TaskDueNotification[]): Promise<void> {
  const data: PersistedUserData = { notifications: notifs };
  await storage.save(`${NOTIF_KEY_PREFIX}${userId}`, data);
}

function notifLockKey(userId: string) {
  return `task-notifs:${userId}`;
}

async function appendNotification(userId: string, notif: TaskDueNotification): Promise<void> {
  await withKeyedLock(notifLockKey(userId), async () => {
    const notifs = await loadNotifications(userId);
    const trimmed = [notif, ...notifs].slice(0, 100);
    await saveNotifications(userId, trimmed);
  });

  const daysLabel = notif.stage === 'week' ? 'in a week' : notif.stage === 'day' ? 'tomorrow' : 'today';
  await sendPushToUser(userId, {
    title: `Task due ${daysLabel}`,
    body: notif.taskTitle,
    url: getNotificationUrl(notif),
    tag: `task-due-${notif.taskId}`,
  }).catch((error) => {
    console.error('Failed to send task reminder push:', error);
  });
}

export async function listTaskDueNotifications(userId: string): Promise<TaskDueNotification[]> {
  const notifs = await loadNotifications(userId);
  return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTaskNotifUnreadCount(userId: string): Promise<number> {
  const notifs = await loadNotifications(userId);
  return notifs.filter((n) => !n.read && !n.dismissed).length;
}

export async function markTaskNotificationsRead(userId: string, ids: string[]): Promise<void> {
  await withKeyedLock(notifLockKey(userId), async () => {
    const notifs = await loadNotifications(userId);
    const markAll = ids.length === 0;
    const updated = notifs.map((n) => (markAll || ids.includes(n.id) ? { ...n, read: true } : n));
    await saveNotifications(userId, updated);
  });
}

export async function dismissTaskNotifications(userId: string, ids: string[]): Promise<void> {
  await withKeyedLock(notifLockKey(userId), async () => {
    const notifs = await loadNotifications(userId);
    const dismissAll = ids.length === 0;
    const updated = notifs.map((n) =>
      dismissAll || ids.includes(n.id) ? { ...n, read: true, dismissed: true } : n,
    );
    await saveNotifications(userId, updated);
  });
}

/**
 * Dismisses the given notification and schedules a fresh reminder for its
 * task to fire a week or a day before the due date (whichever the user
 * picked). If that point has already passed, the reminder fires on the next
 * cron run instead.
 */
export async function rescheduleTaskNotification(
  userId: string,
  notifId: string,
  remindStage: 'week' | 'day',
): Promise<void> {
  const notifs = await loadNotifications(userId);
  const notif = notifs.find((n) => n.id === notifId);
  if (!notif) return;

  const offsetDays = remindStage === 'week' ? 7 : 1;
  const due = new Date(notif.dueDate);
  const remindAt = new Date(due.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  const now = new Date();
  const effectiveRemindAt = remindAt.getTime() > now.getTime() ? remindAt : new Date(now.getTime() + 60_000);

  await withStateLock(userId, async (state) => {
    state.overrides[notif.taskId] = { stage: remindStage, remindAt: effectiveRemindAt.toISOString() };
    return state;
  });

  await dismissTaskNotifications(userId, [notifId]);
}

// ── State (sent tracking + snooze overrides) ─────────────────────────────────

function stateLockKey(userId: string) {
  return `task-notif-state:${userId}`;
}

async function loadState(userId: string): Promise<TaskNotifState> {
  const persisted = await storage.load(`${STATE_KEY_PREFIX}${userId}`);
  const state = persisted?.state as TaskNotifState | undefined;
  if (!state) return { ...DEFAULT_STATE, overrides: {} };
  return { sent: state.sent ?? [], overrides: state.overrides ?? {} };
}

async function saveState(userId: string, state: TaskNotifState): Promise<void> {
  const data: PersistedUserData = { state };
  await storage.save(`${STATE_KEY_PREFIX}${userId}`, data);
}

async function withStateLock(userId: string, mutate: (state: TaskNotifState) => Promise<TaskNotifState>) {
  await withKeyedLock(stateLockKey(userId), async () => {
    const state = await loadState(userId);
    const next = await mutate(state);
    await saveState(userId, next);
  });
}

// ── Cron job ──────────────────────────────────────────────────────────────────

interface DueCandidate {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  done: boolean;
  projectId?: string;
  projectTitle?: string;
  source: 'created' | 'assigned';
}

function stageForNotifyBefore(notifyBefore: TaskNotifyBefore): TaskReminderStage | null {
  if (notifyBefore === '7d') return 'week';
  if (notifyBefore === '1d') return 'day';
  if (notifyBefore === '0d') return 'due';
  return null;
}

function daysUntil(dueDateIso: string): number {
  const parts = dueDateIso.slice(0, 10).split('-').map(Number);
  const [y, m, d] = parts;
  const due = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

/** Collects standalone + project tasks the given user created or is assigned to. */
function collectCandidatesForUser(userId: string, data: PersistedUserData): DueCandidate[] {
  const candidates: DueCandidate[] = [];

  const standaloneTasks = Array.isArray(data.tasks) ? (data.tasks as Array<Record<string, unknown>>) : [];
  for (const t of standaloneTasks) {
    if (t.done || !t.dueDate) continue;
    candidates.push({
      taskId: t.id as string,
      taskTitle: t.text as string,
      dueDate: t.dueDate as string,
      done: Boolean(t.done),
      source: 'created',
    });
  }

  const projects = Array.isArray(data.projects) ? (data.projects as Array<Record<string, unknown>>) : [];
  for (const project of projects) {
    if (project.archived) continue;
    const isCreator = project.creatorId === userId;
    const members = Array.isArray(project.members) ? (project.members as Array<Record<string, unknown>>) : [];
    const myMember = members.find((m) => m.userId === userId);
    const myName = (myMember?.name as string | undefined)?.toLowerCase();

    const subprojects = Array.isArray(project.subprojects) ? (project.subprojects as Array<Record<string, unknown>>) : [];
    for (const sub of subprojects) {
      const tasks = Array.isArray(sub.tasks) ? (sub.tasks as Array<Record<string, unknown>>) : [];
      for (const t of tasks) {
        if (t.done || !t.dueDate) continue;
        const people = Array.isArray(t.people) ? (t.people as Array<{ name?: string }>) : [];
        const isAssigned = Boolean(myName && people.some((p) => (p.name || '').toLowerCase() === myName));
        if (!isAssigned && !isCreator) continue;
        candidates.push({
          taskId: t.id as string,
          taskTitle: t.text as string,
          dueDate: t.dueDate as string,
          done: Boolean(t.done),
          projectId: project.id as string,
          projectTitle: project.text as string,
          // Prefer "assigned" when the user is explicitly assigned; otherwise it's their own project.
          source: isAssigned ? 'assigned' : 'created',
        });
      }
    }
  }

  return candidates;
}

/**
 * Scans every user's tasks (standalone + project) and sends due-date
 * reminder notifications according to each user's notification settings.
 * Intended to be invoked once per day by a scheduled cron job.
 */
export async function runTaskDueNotificationsJob(): Promise<{ usersScanned: number; notified: number }> {
  const allUsers = await listAllUsersData();
  const usersById = new Map(allUsers.map((entry) => [entry.userId, entry.data]));
  let notified = 0;

  for (const { userId, data } of allUsers) {
    const ownProjects = Array.isArray(data.projects) ? data.projects as Array<Record<string, unknown>> : [];
    const projects: Array<Record<string, unknown>> = ownProjects.map((project) => ({
      ...project, creatorId: project.creatorId || userId,
    }));
    const refs = Array.isArray(data.sharedProjectRefs) ? data.sharedProjectRefs as Array<Record<string, unknown>> : [];
    for (const ref of refs) {
      if (typeof ref.ownerUserId !== 'string') continue;
      const ownerData = usersById.get(ref.ownerUserId);
      const ownerProjects = Array.isArray(ownerData?.projects) ? ownerData.projects as Array<Record<string, unknown>> : [];
      const shared = ownerProjects.find((project) => project.id === ref.projectId);
      if (shared && !projects.some((project) => project.id === shared.id)) {
        projects.push({ ...shared, creatorId: shared.creatorId || ref.ownerUserId });
      }
    }
    const candidates = collectCandidatesForUser(userId, { ...data, projects });
    if (candidates.length === 0) continue;

    const settings = await getTaskNotificationSettings(userId);
    await withStateLock(userId, async (state) => {
      const sentSet = new Set(state.sent);
      for (const candidate of candidates) {
        const remaining = daysUntil(candidate.dueDate);
        if (!Number.isFinite(remaining)) {
          console.error('Invalid task due date in reminder scan:', candidate.taskId, candidate.dueDate);
          continue;
        }
        if (remaining < 0) continue;

        const override = state.overrides[candidate.taskId];
        let stage: TaskReminderStage | null = null;

        if (override && new Date(override.remindAt).getTime() <= Date.now()) {
          stage = override.stage;
        } else if (!override) {
          const categorySettings = candidate.source === 'assigned' ? settings.assignedToMe : settings.createdByMe;
          if (categorySettings.enabled) {
            const targetStage = stageForNotifyBefore(categorySettings.notifyBefore);
            const targetDays = targetStage === 'week' ? 7 : targetStage === 'day' ? 1 : targetStage === 'due' ? 0 : null;
            if (targetStage && targetDays !== null && remaining <= targetDays) {
              stage = targetStage;
            }
          }
        }

        if (!stage) continue;

        const sentKey = `${candidate.projectId || 'standalone'}:${candidate.taskId}:${candidate.dueDate}:${stage}`;
        if (!override && sentSet.has(sentKey)) continue;

        await appendNotification(userId, {
          id: generateId(),
          type: 'task_due',
          taskId: candidate.taskId,
          taskTitle: candidate.taskTitle,
          dueDate: candidate.dueDate,
          ...(candidate.projectId ? { projectId: candidate.projectId } : {}),
          ...(candidate.projectTitle ? { projectTitle: candidate.projectTitle } : {}),
          source: candidate.source,
          stage,
          createdAt: new Date().toISOString(),
          read: false,
        });

        sentSet.add(sentKey);
        notified += 1;

        if (override) delete state.overrides[candidate.taskId];
      }
      state.sent = Array.from(sentSet).slice(-500);
      return state;
    });
  }

  return { usersScanned: allUsers.length, notified };
}
