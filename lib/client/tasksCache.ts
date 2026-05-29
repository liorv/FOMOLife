/**
 * Module-level tasks cache shared across all components in the same browser session.
 * Initialized from sessionStorage so data survives page reloads within the same session.
 */

import type { TaskItem } from '@myorg/types';
import { createCache } from './createCache';

const _cache = createCache<TaskItem>('fomo:tasksCache');

/** Returns any previously fetched tasks, or null if never loaded. */
export const getCachedTasksSync = (): TaskItem[] | null => _cache.getSync();

/** Returns how many ms ago tasks were last fetched, or null if never. */
export const getTasksCacheAge = (): number | null => _cache.getAge();

/** Returns true if there is no cache or it is older than the stale threshold. */
export const areTasksStale = (): boolean => _cache.isStale();

/** Store tasks after a successful fetch and persist to sessionStorage. */
export const setCachedTasks = (tasks: TaskItem[], fetchedAt?: number): void =>
  _cache.set(tasks, fetchedAt);

/**
 * Update a single task in the in-memory snapshot and sessionStorage,
 * then dispatch a CustomEvent so any mounted listeners (e.g. HomePage) can
 * update their local state immediately without waiting for a re-fetch.
 */
export function patchTaskInCache(updatedTask: TaskItem): void {
  _cache.patchOne((t) => t.id === updatedTask.id, updatedTask);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fomo:taskUpdated', { detail: updatedTask }));
  }
}

/**
 * Mark the cache as stale without clearing data.
 * Call this after mutating a task so that the next tab switch triggers a re-fetch.
 */
export const invalidateTasksCache = (): void => _cache.invalidate();

