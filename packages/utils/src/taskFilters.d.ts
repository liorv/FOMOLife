/**
 * Task Filters - Shared filtering logic for task lists
 *
 * Utility for filtering a list of tasks according to active filters and an
 * optional text query. The logic is shared between Apps. Filters are applied
 * conjunctively: a task must satisfy every active filter. No special case is
 * applied to completed tasks – they are shown unless the "completed" filter
 * is used.
 */
import type { TaskItem } from '@myorg/types';
/**
 * Apply filters to a list of tasks
 *
 * @param tasks - Array of tasks to filter
 * @param filters - Array of active filter names
 * @param searchQuery - Optional text search query
 * @returns Filtered array of tasks
 */
export declare function applyFilters(tasks?: TaskItem[], filters?: string[], searchQuery?: string): TaskItem[];
//# sourceMappingURL=taskFilters.d.ts.map