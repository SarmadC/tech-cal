// src/hooks/useServerSideAnalytics.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

interface ServerAnalyticsOptions {
  includeRecommendations?: boolean;
  eventLimit?: number;
  enabled?: boolean;
}

interface AnalyticsData {
  analytics: unknown;
  recommendations?: unknown[];
  stats: {
    processingTimeMs: number;
    eventsProcessed: number;
    trackedEventsCount: number;
  };
}

interface UseServerSideAnalyticsResult {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for server-side analytics generation
 * Moves heavy computation from client to server
 */
export function useServerSideAnalytics(
  options: ServerAnalyticsOptions = {}
): UseServerSideAnalyticsResult {
  const { user } = useAuth();
  const {
    includeRecommendations = true,
    eventLimit = 50,
    enabled = true
  } = options;

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery<AnalyticsData>({
    queryKey: ['serverSideAnalytics', user?.id, includeRecommendations, eventLimit],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const response = await fetch('/api/dashboard/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeRecommendations,
          eventLimit
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in again.');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load analytics');
      }
      
      // Debug logging
      console.log('Analytics API response:', {
        hasData: !!result.data,
        hasAnalytics: !!result.data?.analytics,
        hasRecommendations: !!result.data?.recommendations,
        stats: result.data?.stats
      });
      
      return result.data;
    },
    enabled: !!(user && enabled),
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics don't change frequently
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error && error.message.includes('Authentication required')) {
        return false;
      }
      if (error instanceof Error && error.message.includes('Too many requests')) {
        return false;
      }
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
  });

  return {
    data: data || null,
    isLoading,
    error: error?.message || null,
    refetch
  };
}