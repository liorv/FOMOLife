/**
 * Module-level feedback cache shared across components in the same browser session.
 * Initialized from sessionStorage so data survives page reloads within the same session.
 */

import { createCache } from './createCache';

const _cache = createCache<unknown>('fomo:feedbackCache');

/** Synchronously returns cached feedback (may be stale), or null if never fetched. */
export const getFeedbackCacheSync = <T>(): T[] | null => _cache.getSync() as T[] | null;

/** Returns how many ms ago feedback was last fetched, or null if never. */
export const getFeedbackCacheAge = (): number | null => _cache.getAge();

/** Returns true if there is no cache or the cache is older than the stale threshold. */
export const isFeedbackStale = (): boolean => _cache.isStale();

/** Stores fresh feedback and persists it to sessionStorage. */
export const setFeedbackCache = <T>(data: T[]): void => _cache.set(data as unknown[]);

