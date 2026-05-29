/**
 * Generic client-side session storage cache factory.
 *
 * Creates a module-level cache instance with standard read/write/invalidate operations.
 * Data is persisted to sessionStorage so it survives page reloads within the same session.
 *
 * @example
 * import type { TaskItem } from '@myorg/types';
 * import { createCache } from './createCache';
 * const cache = createCache<TaskItem>('fomo:tasksCache');
 */

const DEFAULT_STALE_MS = 60_000; // 60 seconds

interface CacheEntry<T> {
  data: T[];
  fetchedAt: number;
}

export interface ClientCache<T> {
  /** Returns cached data (may be stale), or null if never fetched. */
  getSync(): T[] | null;
  /** Returns milliseconds since last fetch, or null if never fetched. */
  getAge(): number | null;
  /** Returns true if cache is absent or older than the stale threshold. */
  isStale(): boolean;
  /** Stores data and persists to sessionStorage. */
  set(data: T[], fetchedAt?: number): void;
  /** Marks the cache as stale without clearing data. */
  invalidate(): void;
  /**
   * Updates a single item in the in-memory snapshot and persists to sessionStorage.
   * @param match Predicate to find the item to replace.
   * @param updated Replacement item.
   */
  patchOne(match: (item: T) => boolean, updated: T): void;
}

export function createCache<T>(
  sessionKey: string,
  staleAfterMs = DEFAULT_STALE_MS,
): ClientCache<T> {
  function tryLoadSession(): CacheEntry<T> | null {
    try {
      const raw = sessionStorage.getItem(sessionKey);
      if (!raw) return null;
      return JSON.parse(raw) as CacheEntry<T>;
    } catch {
      return null;
    }
  }

  const initial: CacheEntry<T> | null =
    typeof sessionStorage !== 'undefined' ? tryLoadSession() : null;

  let snap: T[] | null = initial?.data ?? null;
  let fetchedAt: number | null = initial?.fetchedAt ?? null;

  function persist(): void {
    if (snap === null) return;
    try {
      const entry: CacheEntry<T> = { data: snap, fetchedAt: fetchedAt ?? Date.now() };
      sessionStorage.setItem(sessionKey, JSON.stringify(entry));
    } catch {
      // sessionStorage quota exceeded or unavailable — ignore
    }
  }

  return {
    getSync(): T[] | null {
      return snap;
    },

    getAge(): number | null {
      return fetchedAt !== null ? Date.now() - fetchedAt : null;
    },

    isStale(): boolean {
      if (fetchedAt === null) return true;
      return Date.now() - fetchedAt > staleAfterMs;
    },

    set(data: T[], ts?: number): void {
      snap = data;
      fetchedAt = ts ?? Date.now();
      persist();
    },

    invalidate(): void {
      fetchedAt = 0;
    },

    patchOne(match: (item: T) => boolean, updated: T): void {
      if (snap !== null) {
        snap = snap.map((item) => (match(item) ? updated : item));
        persist();
      }
    },
  };
}
