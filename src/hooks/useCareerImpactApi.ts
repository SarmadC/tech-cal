/**
 * React Query Hooks for Career Impact API
 *
 * Provides type-safe, cached hooks for career impact data fetching.
 * All hooks use CareerImpactApiClient and centralized query keys.
 *
 * Usage patterns:
 * - Individual event: useCareerImpactScore(eventId)
 * - Batch processing: useBatchCareerImpact(eventIds)
 * - Analytics: useCareerImpactAnalytics()
 * - Cache management: useInvalidateCareerCache()
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import {
  CareerImpactApiClient,
  ScoreApiResponse,
  BatchScoreApiResponse,
  AnalyticsApiResponse,
  CacheStatsApiResponse,
  ApiResponse
} from '@/utils/api/careerImpactApi';
import { CareerImpactCalculationOptions } from '@/types/careerImpact';
import { careerImpactKeys } from '@/lib/queryKeys';

// Cache configuration constants
const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CACHE_STATS_STALE_TIME = 30 * 1000; // 30 seconds

/**
 * Hook for fetching career impact score for a single event
 *
 * Features:
 * - Automatic caching with 5min stale time
 * - Disabled when eventId is null
 * - Error handling with ApiResponse pattern
 *
 * @param eventId - Event ID to score (null to disable)
 * @param options - Scoring options (lite mode, cache skip)
 * @param queryOptions - Additional React Query options
 *
 * @example
 * const { data, isLoading, error } = useCareerImpactScore('evt_123', { lite: true });
 * if (data?.success) {
 *   console.log(data.data.careerImpact.overall);
 * }
 */
export function useCareerImpactScore(
  eventId: string | null,
  options: { lite?: boolean; skipCache?: boolean } = {},
  queryOptions?: Partial<UseQueryOptions<ApiResponse<ScoreApiResponse>>>
) {
  return useQuery({
    queryKey: careerImpactKeys.score(eventId, options),
    queryFn: () => CareerImpactApiClient.getScore(eventId!, options),
    enabled: !!eventId,
    staleTime: STALE_TIME,
    ...queryOptions,
  });
}

/**
 * Hook for calculating career impact with complex options (POST)
 *
 * Use this when you need advanced calculation options beyond lite/skipCache.
 *
 * @param eventId - Event ID to score (null to disable)
 * @param options - Full calculation options
 * @param queryOptions - Additional React Query options
 *
 * @example
 * const { data } = useCareerImpactCalculation('evt_123', {
 *   weights: { skillMatch: 0.4, networking: 0.3, learning: 0.3 }
 * });
 */
export function useCareerImpactCalculation(
  eventId: string | null,
  options?: CareerImpactCalculationOptions,
  queryOptions?: Partial<UseQueryOptions<ApiResponse<ScoreApiResponse>>>
) {
  return useQuery({
    queryKey: careerImpactKeys.score(eventId, options),
    queryFn: () => CareerImpactApiClient.calculateScore(eventId!, options),
    enabled: !!eventId,
    staleTime: STALE_TIME,
    ...queryOptions,
  });
}

/**
 * Hook for fetching batch career impact scores
 *
 * Efficiently fetches scores for multiple events in a single request.
 * Prefer this over individual queries when dealing with lists.
 *
 * @param eventIds - Array of event IDs
 * @param options - Batch options (include events, calculation options)
 * @param queryOptions - Additional React Query options
 *
 * @example
 * const { data } = useBatchCareerImpact(['evt_1', 'evt_2'], {
 *   includeEvents: true,
 *   calculationOptions: { lite: true }
 * });
 */
export function useBatchCareerImpact(
  eventIds: string[],
  options: {
    includeEvents?: boolean;
    calculationOptions?: CareerImpactCalculationOptions;
  } = {},
  queryOptions?: Partial<UseQueryOptions<ApiResponse<BatchScoreApiResponse>>>
) {
  return useQuery({
    queryKey: careerImpactKeys.batch(eventIds, options),
    queryFn: () => CareerImpactApiClient.getBatchScores(eventIds, options),
    enabled: eventIds.length > 0,
    staleTime: STALE_TIME,
    ...queryOptions,
  });
}

/**
 * Hook for fetching career impact analytics
 *
 * Provides overview, breakdowns, and recommendations based on user's event history.
 *
 * @param options - Analytics filter options
 * @param queryOptions - Additional React Query options
 *
 * @example
 * const { data } = useCareerImpactAnalytics({ timeframe: 90, limit: 100 });
 * if (data?.success) {
 *   console.log(data.data.overview.averageScore);
 * }
 */
export function useCareerImpactAnalytics(
  options: { timeframe?: number; limit?: number } = {},
  queryOptions?: Partial<UseQueryOptions<ApiResponse<AnalyticsApiResponse>>>
) {
  return useQuery({
    queryKey: careerImpactKeys.analytics(options),
    queryFn: () => CareerImpactApiClient.getAnalytics(options),
    staleTime: STALE_TIME,
    ...queryOptions,
  });
}

/**
 * Hook for fetching cache statistics
 *
 * Useful for debugging and monitoring cache performance.
 *
 * @param queryOptions - Additional React Query options
 *
 * @example
 * const { data } = useCareerImpactCacheStats();
 * console.log(`Cache hit rate: ${data?.data.stats.hitRate}%`);
 */
export function useCareerImpactCacheStats(
  queryOptions?: Partial<UseQueryOptions<ApiResponse<CacheStatsApiResponse>>>
) {
  return useQuery({
    queryKey: careerImpactKeys.cache(),
    queryFn: () => CareerImpactApiClient.getCacheStats(),
    staleTime: CACHE_STATS_STALE_TIME,
    ...queryOptions,
  });
}

/**
 * Hook for invalidating career impact cache
 *
 * Returns mutation function to invalidate server-side and client-side caches.
 * Automatically refetches affected queries.
 *
 * @example
 * const { mutate: invalidateCache } = useInvalidateCareerCache();
 *
 * // Invalidate specific event
 * invalidateCache({ type: 'event', eventId: 'evt_123' });
 *
 * // Invalidate all career impact data
 * invalidateCache({ type: 'all' });
 */
export function useInvalidateCareerCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      eventId,
    }: {
      type: 'profile' | 'event' | 'all';
      eventId?: string;
    }) => {
      // Invalidate server-side cache
      const result = await CareerImpactApiClient.invalidateCache(type, eventId);

      // Also invalidate React Query cache
      if (type === 'all') {
        await queryClient.invalidateQueries({ queryKey: careerImpactKeys.all });
      } else if (type === 'event' && eventId) {
        await queryClient.invalidateQueries({
          queryKey: careerImpactKeys.score(eventId),
        });
      } else if (type === 'profile') {
        // Invalidate all scores since they depend on profile
        await queryClient.invalidateQueries({ queryKey: careerImpactKeys.scores() });
      }

      return result;
    },
  });
}

/**
 * Utility hook to prefetch career impact score
 *
 * Useful for optimistic loading before user interaction.
 *
 * @example
 * const prefetchScore = usePrefetchCareerImpact();
 * await prefetchScore('evt_123', { lite: true });
 */
export function usePrefetchCareerImpact() {
  const queryClient = useQueryClient();

  return async (
    eventId: string,
    options: { lite?: boolean; skipCache?: boolean } = {}
  ) => {
    await queryClient.prefetchQuery({
      queryKey: careerImpactKeys.score(eventId, options),
      queryFn: () => CareerImpactApiClient.getScore(eventId, options),
      staleTime: STALE_TIME,
    });
  };
}

/**
 * Utility hook to set career impact data directly in cache
 *
 * Useful for optimistic updates or setting data from SSR.
 *
 * @example
 * const setCareerImpact = useSetCareerImpact();
 * setCareerImpact('evt_123', { lite: true }, scoreData);
 */
export function useSetCareerImpact() {
  const queryClient = useQueryClient();

  return (
    eventId: string,
    options: { lite?: boolean; skipCache?: boolean } = {},
    data: ApiResponse<ScoreApiResponse>
  ) => {
    queryClient.setQueryData(careerImpactKeys.score(eventId, options), data);
  };
}
