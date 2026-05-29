/**
 * Module-level projects cache shared across all components in the same browser session.
 * Initialized from sessionStorage so data survives page reloads within the same session.
 */

import type { ProjectItem } from '@myorg/types';
import { createCache } from './createCache';

const _cache = createCache<ProjectItem>('fomo:projectsCache');

/** Returns any previously fetched projects, or null if never loaded. */
export const getCachedProjectsSync = (): ProjectItem[] | null => _cache.getSync();

/** Returns how many ms ago projects were last fetched, or null if never. */
export const getProjectsCacheAge = (): number | null => _cache.getAge();

/** Returns true if there is no cache or it is older than the stale threshold. */
export const areProjectsStale = (): boolean => _cache.isStale();

/** Store projects after a successful fetch and persist to sessionStorage. */
export const setCachedProjects = (projects: ProjectItem[]): void => _cache.set(projects);

/**
 * Mark the cache as stale without clearing data.
 * Call this after mutating a project so that the next tab switch triggers a re-fetch.
 */
export const invalidateProjectsCache = (): void => _cache.invalidate();

