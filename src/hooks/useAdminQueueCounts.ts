'use client';

import { useEffect, useState, useCallback } from 'react';

export interface AdminQueueCounts {
    updateQueue: number;
    moderation: number;
    enrichment: number;
    fieldProtection: number;
    submissions: number;
}

interface UseAdminQueueCountsOptions {
    /** Refresh interval in milliseconds (default: 30000 = 30s) */
    refreshInterval?: number;
    /** Whether to enable polling (default: true) */
    enabled?: boolean;
}

const DEFAULT_REFRESH_INTERVAL = 30_000;

/**
 * Hook to fetch and cache admin queue counts with periodic refresh.
 * Used by AdminSidebar to show live pending item badges.
 */
export function useAdminQueueCounts(options: UseAdminQueueCountsOptions = {}) {
    const { refreshInterval = DEFAULT_REFRESH_INTERVAL, enabled = true } = options;
    
    const [counts, setCounts] = useState<AdminQueueCounts | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCounts = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/ingestion/queue-counts', {
                credentials: 'include',
            });
            
            if (!response.ok) {
                // Don't throw on auth errors - user may not be admin
                if (response.status === 401 || response.status === 403) {
                    setCounts(null);
                    return;
                }
                throw new Error('Failed to fetch queue counts');
            }
            
            const data = await response.json();
            setCounts(data);
            setError(null);
        } catch (err) {
            console.warn('[useAdminQueueCounts] Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        // Initial fetch
        fetchCounts();

        // Set up polling interval
        const intervalId = setInterval(fetchCounts, refreshInterval);

        return () => {
            clearInterval(intervalId);
        };
    }, [enabled, fetchCounts, refreshInterval]);

    const refetch = useCallback(() => {
        setLoading(true);
        return fetchCounts();
    }, [fetchCounts]);

    return {
        counts,
        loading,
        error,
        refetch,
    };
}

export default useAdminQueueCounts;
