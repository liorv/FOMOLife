/**
 * Module-level feedback cache shared across components in the same browser session.
 * Initialized from sessionStorage so data survives page reloads within the same session.
 */

const SESSION_KEY = 'fomo:feedbackCache';
const STALE_AFTER_MS = 60_000; // 60 seconds

interface CacheEntry {
  data: unknown[];
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

let entry: CacheEntry | null =
  typeof sessionStorage !== 'undefined' ? tryLoadSession() : null;

/** Synchronously returns cached feedback (may be stale), or null if never fetched. */
export function getFeedbackCacheSync<T>(): T[] | null {
  return entry ? (entry.data as T[]) : null;
}

/** Returns how many ms ago feedback was last fetched, or null if never. */
export function getFeedbackCacheAge(): number | null {
  return entry ? Date.now() - entry.fetchedAt : null;
}

/** Returns true if there is no cache or the cache is older than the stale threshold. */
export function isFeedbackStale(): boolean {
  if (!entry) return true;
  return Date.now() - entry.fetchedAt > STALE_AFTER_MS;
}

/** Stores fresh feedback and persists it to sessionStorage. */
export function setFeedbackCache<T>(data: T[]): void {
  entry = { data: data as unknown[], fetchedAt: Date.now() };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage quota exceeded or unavailable — ignore
  }
}
