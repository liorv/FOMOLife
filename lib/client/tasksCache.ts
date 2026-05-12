/**
 * Module-level tasks cache shared across all components in the same browser session.
 * Initialized from sessionStorage so data survives page reloads within the same session.
 */

import type { TaskItem } from '@myorg/types';

const SESSION_KEY = 'fomo:tasksCache';
const STALE_AFTER_MS = 60_000; // 60 seconds

interface CacheEntry {
  data: TaskItem[];
  fetchedAt: number;
}

function tryLoadSession(): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

const _initial: CacheEntry | null =
  typeof sessionStorage !== 'undefined' ? tryLoadSession() : null;

let _snap: TaskItem[] | null = _initial?.data ?? null;
let _fetchedAt: number | null = _initial?.fetchedAt ?? null;

/** Returns any previously fetched tasks, or null if never loaded. */
export function getCachedTasksSync(): TaskItem[] | null {
  return _snap;
}

/** Returns how many ms ago tasks were last fetched, or null if never. */
export function getTasksCacheAge(): number | null {
  return _fetchedAt !== null ? Date.now() - _fetchedAt : null;
}

/** Returns true if there is no cache or it is older than the stale threshold. */
export function areTasksStale(): boolean {
  if (_fetchedAt === null) return true;
  return Date.now() - _fetchedAt > STALE_AFTER_MS;
}

/** Store tasks after a successful fetch and persist to sessionStorage. */
export function setCachedTasks(tasks: TaskItem[], fetchedAt?: number): void {
  _snap = tasks;
  _fetchedAt = fetchedAt ?? Date.now();
  try {
    const entry: CacheEntry = { data: tasks, fetchedAt: _fetchedAt };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

/**
 * Update a single task in the in-memory snapshot and sessionStorage,
 * then dispatch a CustomEvent so any mounted listeners (e.g. HomePage) can
 * update their local state immediately without waiting for a re-fetch.
 */
export function patchTaskInCache(updatedTask: TaskItem): void {
  if (_snap !== null) {
    _snap = _snap.map(t => t.id === updatedTask.id ? updatedTask : t);
    try {
      const entry: CacheEntry = { data: _snap, fetchedAt: _fetchedAt ?? Date.now() };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fomo:taskUpdated', { detail: updatedTask }));
  }
}

/**
 * Mark the cache as stale without clearing data.
 * Call this after mutating a task so that the next tab switch triggers a re-fetch.
 */
export function invalidateTasksCache(): void {
  _fetchedAt = 0;
}
