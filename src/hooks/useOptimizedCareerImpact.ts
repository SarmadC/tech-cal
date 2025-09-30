import { useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { BatchCareerImpactService } from '@/services/batchCareerImpactService';
import { careerImpactKeys } from '@/lib/queryKeys';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

interface UseOptimizedCareerImpactOptions {
  enabled?: boolean;
  batchSize?: number;
  debounceMs?: number;
}

interface UseOptimizedCareerImpactResult {
  enhancedEvents: (Event & { careerImpactLite?: CareerImpactScoreLite })[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalEvents: number;
    eventsWithImpact: number;
    loadingTimeMs: number;
  };
}

/**
 * Optimized hook for loading career impact using batch API with React Query
 *
 * Powered by React Query for automatic caching, deduplication, and retry logic.
 * Replaces the N+1 query pattern with efficient batch processing.
 *
 * @param events - Events to enhance with career impact scores
 * @param options - Configuration options
 */
export function useOptimizedCareerImpact(
  events: Event[],
  options: UseOptimizedCareerImpactOptions = {}
): UseOptimizedCareerImpactResult {
  const { enabled = true } = options;

  // Stable query key based on sorted event IDs
  const eventIds = useMemo(() => events.map(e => e.id).sort(), [events]);

  // Store events in ref to avoid stale closures
  const eventsRef = useRef<Event[]>(events);
  eventsRef.current = events;

  // Use React Query - it handles debouncing via staleTime
  const {
    data: queryData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: [...careerImpactKeys.batch(eventIds), 'lite'],
    queryFn: async () => {
      const startTime = Date.now();
      const enhanced = await BatchCareerImpactService.enhanceEventsLite(eventsRef.current);
      const eventsWithImpact = enhanced.filter(e => e.careerImpactLite).length;

      return {
        enhanced,
        stats: {
          totalEvents: eventsRef.current.length,
          eventsWithImpact,
          loadingTimeMs: Date.now() - startTime
        }
      };
    },
    enabled: enabled && events.length > 0,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    retry: 2,
  });

  // Return fallback data while loading or disabled
  const enhancedEvents = queryData?.enhanced || events;
  const stats = queryData?.stats || { totalEvents: 0, eventsWithImpact: 0, loadingTimeMs: 0 };
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load career impact' : null;

  return {
    enhancedEvents,
    isLoading: isLoading && enabled,
    error,
    stats
  };
}
