/**
 * useAsyncState - React hook for handling async data fetching
 *
 * Provides a clean interface for loading/error/data state management.
 * Eliminates boilerplate code for common async patterns.
 */
import { useState, useEffect, useCallback } from 'react';
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
export function useAsyncState(fetcher, deps = []) {
    const [state, setState] = useState({
        data: null,
        loading: true,
        error: null,
    });
    const [refreshKey, setRefreshKey] = useState(0);
    useEffect(() => {
        let active = true;
        const fetchData = async () => {
            setState((prev) => ({ ...prev, loading: true, error: null }));
            try {
                const result = await fetcher();
                if (active) {
                    setState({ data: result, loading: false, error: null });
                }
            }
            catch (err) {
                if (active) {
                    const errorMessage = err instanceof Error ? err.message : 'An error occurred';
                    setState({ data: null, loading: false, error: errorMessage });
                }
            }
        };
        fetchData();
        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, refreshKey]);
    const refetch = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);
    return {
        ...state,
        refetch,
    };
}
