import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { generateId, withKeyedLock } from '@myorg/utils';
import type { PersistedUserData } from '@myorg/storage';
import { getDisplayNameFromUserId } from '../../server/frameworkAuth';
import { sendPushToUser } from '../../server/webPush';

const storage = createStorageProvider();

// thread comments stored per-thread
const THREAD_KEY_PREFIX = '__proj_thread__';
// per-user notifications
const NOTIF_KEY_PREFIX = '__proj_notifs__';

export interface ProjectThreadComment {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  text: string;
  createdAt: string;
}

export interface ProjectNotification {
  id: string;
  type: 'project_comment' | 'task_completed' | 'task_assigned';
  /** e.g. "proj:abc" or "task:abc:xyz" */
  threadId: string;
  /** The project to open for navigation */
  projectId: string;
  /** The task id if this is a task-level thread */
  taskId?: string;
  /** Human-readable title shown in the notification */
  threadTitle: string;
  commentAuthorId: string;
  commentAuthorName: string;
  /** Short preview (≤ 120 chars) */
  commentText: string;
  createdAt: string;
  read: boolean;
  dismissed?: boolean;
}

// ── Thread helpers ─────────────────────────────────────────────────────────────

function threadStorageKey(threadId: string) {
  return `${THREAD_KEY_PREFIX}${threadId}`;
}

async function loadThread(threadId: string): Promise<ProjectThreadComment[]> {
  try {
    const persisted = await storage.load(threadStorageKey(threadId));
    return (Array.isArray(persisted?.comments) ? persisted.comments : []) as ProjectThreadComment[];
  } catch {
    return [];
  }
}

async function persistThread(threadId: string, comments: ProjectThreadComment[]): Promise<void> {
  const data: PersistedUserData = { comments };
  await storage.save(threadStorageKey(threadId), data);
}

export async function listThreadComments(threadId: string): Promise<ProjectThreadComment[]> {
  return loadThread(threadId);
}

/**
 * Returns comment counts for a project thread and all specified task threads.
 * Keys: "proj:{projectId}" and "task:{projectId}:{taskId}"
 */
export async function getProjectThreadCounts(
  projectId: string,
  taskIds: string[]
): Promise<Record<string, number>> {
  const threadIds = [
    `proj:${projectId}`,
    ...taskIds.map((id) => `task:${projectId}:${id}`),
  ];
  const results = await Promise.all(threadIds.map((tid) => loadThread(tid)));
  const counts: Record<string, number> = {};
  threadIds.forEach((tid, i) => {
    counts[tid] = results[i]?.length ?? 0;
  });
  return counts;
}

export async function addThreadComment(opts: {
  threadId: string;
  threadTitle: string;
  projectId: string;
  taskId?: string;
  /** User IDs to notify (project members). The commenter is excluded automatically. */
  memberIds: string[];
  authorId: string;
  authorName: string;
  text: string;
  authorAvatarUrl?: string;
}): Promise<ProjectThreadComment> {
  const { threadId, threadTitle, projectId, taskId, memberIds, authorId, authorName, text, authorAvatarUrl } = opts;

  const comments = await loadThread(threadId);
  const displayName = authorName?.trim() || getDisplayNameFromUserId(authorId);

  const comment: ProjectThreadComment = {
    id: generateId(),
    threadId,
    authorId,
    authorName: displayName,
    ...(authorAvatarUrl ? { authorAvatarUrl } : {}),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };

  comments.push(comment);
  await persistThread(threadId, comments);

  // Notify all members except the commenter
  const toNotify = new Set(memberIds.filter((id) => id !== authorId));
  // Also notify anyone who has previously commented (they may not be a member anymore)
  for (const c of comments) {
    if (c.id !== comment.id && c.authorId !== authorId) toNotify.add(c.authorId);
  }

  const preview = text.length > 120 ? text.slice(0, 117) + '…' : text;
  const now = comment.createdAt;

  const notifPromises = Array.from(toNotify).map((recipientId) =>
    appendNotification(recipientId, {
      id: generateId(),
      type: 'project_comment',
      threadId,
      projectId,
      ...(taskId ? { taskId } : {}),
      threadTitle,
      commentAuthorId: authorId,
      commentAuthorName: displayName,
      commentText: preview,
      createdAt: now,
      read: false,
    }),
  );
  await Promise.allSettled(notifPromises);

  return comment;
}

// ── Notification helpers ───────────────────────────────────────────────────────

const notifCache = new Map<string, ProjectNotification[]>();

async function loadNotifications(userId: string): Promise<ProjectNotification[]> {
  if (notifCache.has(userId) && process.env.NODE_ENV !== 'production') return notifCache.get(userId)!;
  try {
    const persisted = await storage.load(`${NOTIF_KEY_PREFIX}${userId}`);
    const notifs = (Array.isArray(persisted?.notifications) ? persisted.notifications : []) as ProjectNotification[];
    notifCache.set(userId, notifs);
    return notifs;
  } catch {
    return [];
  }
}

async function saveNotifications(userId: string, notifs: ProjectNotification[]): Promise<void> {
  notifCache.set(userId, notifs);
  const data: PersistedUserData = { notifications: notifs };
  await storage.save(`${NOTIF_KEY_PREFIX}${userId}`, data);
}

function notifLockKey(userId: string) {
  return `project-notifs:${userId}`;
}

async function appendNotification(userId: string, notif: ProjectNotification): Promise<void> {
  await withKeyedLock(notifLockKey(userId), async () => {
    const notifs = await loadNotifications(userId);
    const trimmed = [notif, ...notifs].slice(0, 100);
    await saveNotifications(userId, trimmed);
  });

  const body = notif.type === 'task_completed' || notif.type === 'task_assigned'
    ? `${notif.commentAuthorName} ${notif.commentText}`
    : `${notif.commentAuthorName}: ${notif.commentText}`;
  await sendPushToUser(userId, {
    title: notif.threadTitle,
    body,
    url: '/dashboard?tab=projects',
    tag: `project-${notif.threadId}`,
  }).catch((error) => {
    console.error('Failed to send project notification push:', error);
  });
}

export async function listProjectNotifications(userId: string): Promise<ProjectNotification[]> {
  const notifs = await loadNotifications(userId);
  return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getProjectNotifUnreadCount(userId: string): Promise<number> {
  const notifs = await loadNotifications(userId);
  return notifs.filter((n) => !n.read).length;
}

export async function markProjectNotificationsRead(userId: string, ids: string[]): Promise<void> {
  await withKeyedLock(notifLockKey(userId), async () => {
    const notifs = await loadNotifications(userId);
    const markAll = ids.length === 0;
    const updated = notifs.map((n) => (markAll || ids.includes(n.id) ? { ...n, read: true } : n));
    await saveNotifications(userId, updated);
  });
}

export async function dismissProjectNotifications(userId: string, ids: string[]): Promise<void> {
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
 * Fan-out a "task completed" notification to all project members and the completer's devices.
 */
export async function notifyTaskCompleted(opts: {
  projectId: string;
  projectTitle: string;
  taskId: string;
  taskTitle: string;
  completedByUserId: string;
  completedByName: string;
  /** All project member userIds */
  memberIds: string[];
}): Promise<void> {
  const { projectId, projectTitle, taskId, taskTitle, completedByUserId, completedByName, memberIds } = opts;
  const now = new Date().toISOString();
  const threadId = `task:${projectId}:${taskId}`;
  const toNotify = [...new Set([...memberIds, completedByUserId])].filter(Boolean);
  const notifPromises = toNotify.map((recipientId) =>
    appendNotification(recipientId, {
      id: generateId(),
      type: 'task_completed',
      threadId,
      projectId,
      taskId,
      threadTitle: taskTitle,
      commentAuthorId: completedByUserId,
      commentAuthorName: completedByName,
      commentText: `completed in “${projectTitle}”`,
      createdAt: now,
      read: false,
    }),
  );
  const results = await Promise.allSettled(notifPromises);
  for (const result of results) {
    if (result.status === 'rejected') console.error('Failed to save task completion notification:', result.reason);
  }
}

/**
 * Notify newly-assigned people that they were assigned to a task.
 */
export async function notifyTaskAssigned(opts: {
  projectId: string;
  projectTitle: string;
  taskId: string;
  taskTitle: string;
  assignedByUserId: string;
  assignedByName: string;
  /** userIds of newly assigned people (the assigner is excluded automatically) */
  assigneeIds: string[];
}): Promise<void> {
  const { projectId, projectTitle, taskId, taskTitle, assignedByUserId, assignedByName, assigneeIds } = opts;
  const now = new Date().toISOString();
  const threadId = `task:${projectId}:${taskId}`;
  const toNotify = assigneeIds.filter((id) => id !== assignedByUserId);
  const notifPromises = toNotify.map((recipientId) =>
    appendNotification(recipientId, {
      id: generateId(),
      type: 'task_assigned',
      threadId,
      projectId,
      taskId,
      threadTitle: taskTitle,
      commentAuthorId: assignedByUserId,
      commentAuthorName: assignedByName,
      commentText: `assigned you to “${taskTitle}” in “${projectTitle}”`,
      createdAt: now,
      read: false,
    }),
  );
  await Promise.allSettled(notifPromises);
}
