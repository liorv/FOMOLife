/**
 * Module-level projects cache shared across all components in the same browser session.
 * Initialized from sessionStorage so data survives page reloads within the same session.
 */

import type { ProjectItem } from '@myorg/types';

const SESSION_KEY = 'fomo:projectsCache';
const STALE_AFTER_MS = 60_000; // 60 seconds

interface CacheEntry {
  data: ProjectItem[];
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

let _snap: ProjectItem[] | null = _initial?.data ?? null;
let _fetchedAt: number | null = _initial?.fetchedAt ?? null;

/** Returns any previously fetched projects, or null if never loaded. */
export function getCachedProjectsSync(): ProjectItem[] | null {
  return _snap;
}

/** Returns how many ms ago projects were last fetched, or null if never. */
export function getProjectsCacheAge(): number | null {
  return _fetchedAt !== null ? Date.now() - _fetchedAt : null;
}

/** Returns true if there is no cache or it is older than the stale threshold. */
export function areProjectsStale(): boolean {
  if (_fetchedAt === null) return true;
  return Date.now() - _fetchedAt > STALE_AFTER_MS;
}

/** Store projects after a successful fetch and persist to sessionStorage. */
export function setCachedProjects(projects: ProjectItem[]): void {
  _snap = projects;
  _fetchedAt = Date.now();
  try {
    const entry: CacheEntry = { data: projects, fetchedAt: _fetchedAt };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

/**
 * Mark the cache as stale without clearing data.
 * Call this after mutating a project so that the next tab switch triggers a re-fetch.
 */
export function invalidateProjectsCache(): void {
  _fetchedAt = 0;
}
