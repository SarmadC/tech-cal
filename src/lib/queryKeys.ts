/**
 * Query Key Factory for React Query
 *
 * Provides type-safe, centralized query key management following TanStack Query best practices.
 * Each key is structured hierarchically for efficient invalidation and prefetching.
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

import { CareerImpactCalculationOptions } from '@/types/careerImpact';

/**
 * Career Impact Query Keys
 *
 * Hierarchical structure:
 * - ['careerImpact'] - All career impact queries
 * - ['careerImpact', 'scores'] - All score queries
 * - ['careerImpact', 'scores', eventId, options] - Specific score query
 * - ['careerImpact', 'scores', 'batch', eventIds, options] - Batch score query
 * - ['careerImpact', 'analytics', options] - Analytics queries
 * - ['careerImpact', 'cache'] - Cache stats queries
 */
export const careerImpactKeys = {
  /**
   * Base key for all career impact queries
   * Use to invalidate ALL career impact data
   */
  all: ['careerImpact'] as const,

  /**
   * Base key for all score queries
   * Use to invalidate all score data (single + batch)
   */
  scores: () => [...careerImpactKeys.all, 'scores'] as const,

  /**
   * Single event score query key
   * @param eventId - Event ID to score
   * @param options - Optional calculation options
   */
  score: (eventId: string | null, options?: { lite?: boolean; skipCache?: boolean }) =>
    [...careerImpactKeys.scores(), eventId, options] as const,

  /**
   * Batch event scores query key
   * @param eventIds - Array of event IDs
   * @param options - Optional batch calculation options
   */
  batch: (eventIds: string[], options?: {
    includeEvents?: boolean;
    calculationOptions?: CareerImpactCalculationOptions;
  }) => [...careerImpactKeys.scores(), 'batch', eventIds, options] as const,

  /**
   * Career impact analytics query key
   * @param options - Analytics filter options
   */
  analytics: (options?: { timeframe?: number; limit?: number }) =>
    [...careerImpactKeys.all, 'analytics', options] as const,

  /**
   * Cache statistics query key
   */
  cache: () => [...careerImpactKeys.all, 'cache'] as const,
} as const;

/**
 * Event-related Query Keys
 * For general event data queries
 */
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: unknown) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
} as const;

/**
 * User Profile Query Keys
 */
export const profileKeys = {
  all: ['profile'] as const,
  user: (userId?: string) => [...profileKeys.all, userId] as const,
  career: (userId?: string) => [...profileKeys.all, 'career', userId] as const,
} as const;

/**
 * Tracked Events Query Keys
 */
export const trackedEventKeys = {
  all: ['trackedEvents'] as const,
  list: (userId?: string) => [...trackedEventKeys.all, userId] as const,
  lightweight: (userId?: string) => ['lightweightTrackedEvents', userId] as const,
} as const;

/**
 * Analytics Query Keys
 */
export const analyticsKeys = {
  all: ['analytics'] as const,
  serverSide: (userId?: string, includeRecs?: boolean, limit?: number) =>
    ['serverSideAnalytics', userId, includeRecs, limit] as const,
} as const;

/**
 * Hackathon Query Keys
 */
export const hackathonKeys = {
  all: ['hackathonEvents'] as const,
  list: (userId?: string) => [...hackathonKeys.all, userId] as const,
} as const;

/**
 * Discovery & Recommendations Query Keys
 */
export const discoveryKeys = {
  all: ['discovery'] as const,
  personalized: (cacheKey: string | null) =>
    ['personalizedRecommendations', cacheKey] as const,
  opportunities: (categories?: string[]) =>
    ['upcomingOpportunities', categories] as const,
} as const;

/**
 * Type helper to extract query key type
 * Usage: QueryKey<typeof careerImpactKeys.score>
 */
export type QueryKey<T extends (...args: never[]) => readonly unknown[]> = ReturnType<T>;
