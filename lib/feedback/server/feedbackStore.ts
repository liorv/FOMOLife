import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { generateId } from '@myorg/utils';
import type { PersistedUserData } from '@myorg/storage';
import { getDisplayNameFromUserId } from '../../server/frameworkAuth';

// Feedback is global/shared across all users, stored under this special key
const FEEDBACK_STORAGE_KEY = '__feedback__';
// Per-user notifications stored under this prefix + userId
const NOTIF_STORAGE_KEY = '__feedback_notifs__';

const storage = createStorageProvider();

export type FeedbackType = 'feature' | 'bug';

export interface FeedbackComment {
  id: string;
  feedbackId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface FeedbackNotification {
  id: string;
  type: 'feedback_comment';
  feedbackId: string;
  feedbackTitle: string;
  commentId: string;
  commentAuthorId: string;
  commentAuthorName: string;
  commentText: string;
  createdAt: string;
  read: boolean;
}

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  /** userId → vote direction (+1 upvote, -1 downvote) */
  votes: Record<string, 1 | -1>;
  /** userId → true: users who marked this item as completed */
  completions: Record<string, true>;
  /** comment thread */
  comments: FeedbackComment[];
}

/** Number of completion marks required to archive an item */
export const COMPLETION_THRESHOLD = 3;

// Module-level cache (reset on server restart / module reload)
let cache: FeedbackItem[] | null = null;

async function load(): Promise<FeedbackItem[]> {
  if (cache !== null && process.env.NODE_ENV !== 'production') return cache;
  try {
    const persisted = await storage.load(FEEDBACK_STORAGE_KEY);
    const items = (Array.isArray(persisted?.feedback) ? persisted.feedback : []) as FeedbackItem[];
    cache = items;
    return items;
  } catch {
    cache = [];
    return [];
  }
}

async function persist(items: FeedbackItem[]): Promise<void> {
  cache = items;
  const data: PersistedUserData = { feedback: items };
  await storage.save(FEEDBACK_STORAGE_KEY, data);
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const items = await load();
  return [...items].sort((a, b) => {
    const scoreA = Object.values(a.votes).reduce((s, v) => s + v, 0);
    const scoreB = Object.values(b.votes).reduce((s, v) => s + v, 0);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function createFeedback(
  authorId: string,
  authorName: string,
  input: { type: FeedbackType; title: string; description: string },
): Promise<FeedbackItem> {
  const items = await load();
  const displayName = authorName?.trim() || getDisplayNameFromUserId(authorId);
  const item: FeedbackItem = {
    id: generateId(),
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    authorId,
    authorName: displayName,
    createdAt: new Date().toISOString(),
    votes: {},
    completions: {},
    comments: [],
  };
  items.push(item);
  await persist(items);
  return item;
}

export async function voteFeedback(
  userId: string,
  id: string,
  vote: 1 | -1 | 0,
): Promise<FeedbackItem | null> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  if (vote === 0) {
    delete item.votes[userId];
  } else {
    item.votes[userId] = vote;
  }
  await persist(items);
  return item;
}

/**
 * Toggle a user's "mark as completed" on an item.
 * Returns the updated item, or null if the item was archived (threshold reached).
 * `archived` will be true when the item is removed from the list.
 */
export async function markFeedbackComplete(
  userId: string,
  id: string,
  mark: boolean,
): Promise<{ item: FeedbackItem | null; archived: boolean }> {
  const items = await load();
  const item = items.find((i) => i.id === id);
  if (!item) return { item: null, archived: false };

  if (!item.completions) item.completions = {};

  if (mark) {
    item.completions[userId] = true;
  } else {
    delete item.completions[userId];
  }

  const isCreator = item.authorId === userId;
  if (isCreator && mark || Object.keys(item.completions).length >= COMPLETION_THRESHOLD) {
    // Archive: remove from list
    const idx = items.findIndex((i) => i.id === id);
    items.splice(idx, 1);
    await persist(items);
    return { item: null, archived: true };
  }

  await persist(items);
  return { item, archived: false };
}

export async function deleteFeedback(userId: string, id: string): Promise<boolean> {
  const items = await load();
  const idx = items.findIndex((i) => i.id === id && i.authorId === userId);
  if (idx === -1) return false;
  items.splice(idx, 1);
  await persist(items);
  return true;
}

// ── Comments ──────────────────────────────────────────────────────────────────

/** Returns comments for a feedback item, newest last. */
export async function listComments(feedbackId: string): Promise<FeedbackComment[]> {
  const items = await load();
  const item = items.find((i) => i.id === feedbackId);
  return item?.comments ?? [];
}

/**
 * Adds a comment to a feedback item and sends notifications to the feedback
 * author and all prior commenters (excluding the new commenter).
 * Returns the new comment, or null if the feedback item was not found.
 */
export async function addComment(
  feedbackId: string,
  authorId: string,
  authorName: string,
  text: string,
): Promise<{ comment: FeedbackComment; feedbackTitle: string } | null> {
  const items = await load();
  const item = items.find((i) => i.id === feedbackId);
  if (!item) return null;

  if (!item.comments) item.comments = [];

  const comment: FeedbackComment = {
    id: generateId(),
    feedbackId,
    authorId,
    authorName: authorName?.trim() || getDisplayNameFromUserId(authorId),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  item.comments.push(comment);
  await persist(items);

  // Collect users to notify: feedback author + previous commenters, excluding commenter
  const toNotify = new Set<string>();
  if (item.authorId !== authorId) toNotify.add(item.authorId);
  for (const c of item.comments) {
    if (c.id !== comment.id && c.authorId !== authorId) toNotify.add(c.authorId);
  }

  // Persist a notification for each recipient
  const notifPromises = Array.from(toNotify).map((recipientId) =>
    appendNotification(recipientId, {
      id: generateId(),
      type: 'feedback_comment',
      feedbackId,
      feedbackTitle: item.title,
      commentId: comment.id,
      commentAuthorId: authorId,
      commentAuthorName: comment.authorName,
      commentText: text.length > 120 ? text.slice(0, 117) + '…' : text,
      createdAt: comment.createdAt,
      read: false,
    }),
  );
  await Promise.allSettled(notifPromises);

  return { comment, feedbackTitle: item.title };
}

// ── Notifications ─────────────────────────────────────────────────────────────

// Notifications cache per userId (module-level, reset on server restart)
const notifCache = new Map<string, FeedbackNotification[]>();

async function loadNotifications(userId: string): Promise<FeedbackNotification[]> {
  if (notifCache.has(userId) && process.env.NODE_ENV !== 'production') return notifCache.get(userId)!;
  try {
    const persisted = await storage.load(`${NOTIF_STORAGE_KEY}${userId}`);
    const notifs = (Array.isArray(persisted?.notifications) ? persisted.notifications : []) as FeedbackNotification[];
    notifCache.set(userId, notifs);
    return notifs;
  } catch {
    notifCache.set(userId, []);
    return [];
  }
}

async function saveNotifications(userId: string, notifs: FeedbackNotification[]): Promise<void> {
  notifCache.set(userId, notifs);
  const data: PersistedUserData = { notifications: notifs };
  await storage.save(`${NOTIF_STORAGE_KEY}${userId}`, data);
}

async function appendNotification(userId: string, notif: FeedbackNotification): Promise<void> {
  const notifs = await loadNotifications(userId);
  // Keep most recent 100 notifications to avoid unbounded growth
  const trimmed = notifs.slice(-99);
  trimmed.push(notif);
  await saveNotifications(userId, trimmed);
}

/** Returns all notifications for a user, newest first. */
export async function listNotifications(userId: string): Promise<FeedbackNotification[]> {
  const notifs = await loadNotifications(userId);
  return [...notifs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Marks specific notification IDs as read. Pass empty array to mark all. */
export async function markNotificationsRead(
  userId: string,
  ids: string[],
): Promise<void> {
  const notifs = await loadNotifications(userId);
  const markAll = ids.length === 0;
  for (const n of notifs) {
    if (markAll || ids.includes(n.id)) n.read = true;
  }
  await saveNotifications(userId, notifs);
}
