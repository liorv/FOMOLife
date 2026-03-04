/**
 * useAsyncState - React hook for handling async data fetching
 *
 * Provides a clean interface for loading/error/data state management.
 * Eliminates boilerplate code for common async patterns.
 */
import { DependencyList } from 'react';
import type { AsyncState } from '@myorg/types';
/**
 * Hook return type with refetch capability
 */
export interface UseAsyncStateReturn<T> extends AsyncState<T> {
    /** Function to manually refetch/reload data */
    refetch: () => void;
}
/**
 * useAsyncState - Handle async data fetching with loading/error states
 *
 * @param fetcher - Async function that returns data
 * @param deps - Dependencies that trigger refetch when changed
 *
 * @example
 * ```typescript
 * const { data, loading, error, refetch } = useAsyncState(
 *   () => api.listTasks(),
 *   [api]
 * );
 * ```
 */
export declare function useAsyncState<T>(fetcher: () => Promise<T>, deps?: DependencyList): UseAsyncStateReturn<T>;
//# sourceMappingURL=useAsyncState.d.ts.map