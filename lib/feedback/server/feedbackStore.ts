import 'server-only';

import { createStorageProvider } from '@myorg/storage';
import { generateId } from '@myorg/utils';
import type { PersistedUserData } from '@myorg/storage';
import { getDisplayNameFromUserId } from '../../server/frameworkAuth';

// Feedback is global/shared across all users, stored under this special key
const FEEDBACK_STORAGE_KEY = '__feedback__';

const storage = createStorageProvider();

export type FeedbackType = 'feature' | 'bug';

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
}

// Module-level cache (reset on server restart / module reload)
let cache: FeedbackItem[] | null = null;

async function load(): Promise<FeedbackItem[]> {
  if (cache !== null) return cache;
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

export async function deleteFeedback(userId: string, id: string): Promise<boolean> {
  const items = await load();
  const idx = items.findIndex((i) => i.id === id && i.authorId === userId);
  if (idx === -1) return false;
  items.splice(idx, 1);
  await persist(items);
  return true;
}
