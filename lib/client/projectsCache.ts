/**
 * Module-level projects cache shared across all components in the same browser session.
 * Prevents the "Loading projects…" flash when switching back to the Projects tab.
 */

import type { ProjectItem } from '@myorg/types';

let _snap: ProjectItem[] | null = null;

/** Returns any previously fetched projects, or null if never loaded. */
export function getCachedProjectsSync(): ProjectItem[] | null {
  return _snap;
}

/** Store projects after a successful fetch. */
export function setCachedProjects(projects: ProjectItem[]): void {
  _snap = projects;
}
