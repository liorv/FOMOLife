/**
 * Module-level contacts cache shared across all components in the same browser session.
 * Initialized from sessionStorage so data survives page reloads within the same session.
 */

const CACHE_TTL_MS = 30_000; // 30 seconds — re-fetch if data is older than this
const SESSION_KEY = 'fomo:contactsCache';

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
let inflight: Promise<unknown[]> | null = null;

/** Returns how many ms ago contacts were last fetched, or null if never. */
export function getContactsCacheAge(): number | null {
  if (!entry) return null;
  return Date.now() - entry.fetchedAt;
}

/**
 * Synchronously returns the cached contacts (even if stale) so components
 * can initialise their state without showing a loading spinner on re-mount.
 * Returns null if no data has ever been fetched.
 */
export function getCachedContactsSync<T>(): T[] | null {
  if (!entry) return null;
  return entry.data as T[];
}

/** Force the next call to re-fetch from the server. */
export function invalidateContactsCache(): void {
  entry = null;
}

/**
 * Returns cached contacts if fresh, otherwise calls `fetcher` once
 * (deduplicating concurrent callers onto a single in-flight request).
 */
export async function getCachedContacts<T>(
  fetcher: () => Promise<T[]>,
  forceRefresh = false,
): Promise<T[]> {
  if (!forceRefresh && entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.data as T[];
  }

  if (inflight) {
    return inflight as Promise<T[]>;
  }

  inflight = fetcher()
    .then((data) => {
      entry = { data: data as unknown[], fetchedAt: Date.now() };
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
      } catch {
        // ignore
      }
      inflight = null;
      return data as unknown[];
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight as Promise<T[]>;
}

