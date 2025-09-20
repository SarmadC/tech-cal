import { useState, useEffect, useCallback, useRef } from 'react';
import { Event } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { BatchCareerImpactService } from '@/services/batchCareerImpactService';

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
 * Optimized hook for loading career impact using batch API
 * Replaces the N+1 query pattern with efficient batch processing
 */
export function useOptimizedCareerImpact(
  events: Event[],
  options: UseOptimizedCareerImpactOptions = {}
): UseOptimizedCareerImpactResult {
  const {
    enabled = true,
    batchSize: _batchSize = 20, // Rename to indicate it's unused
    debounceMs = 500
  } = options;

  const [enhancedEvents, setEnhancedEvents] = useState<(Event & { careerImpactLite?: CareerImpactScoreLite })[]>(events);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    eventsWithImpact: 0,
    loadingTimeMs: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized event IDs to prevent unnecessary recalculations
  const eventIds = useRef<string>('');
  const eventsRef = useRef<Event[]>(events); // Store latest events in ref
  const currentEventIds = events.map(e => e.id).sort().join(',');
  
  // Update events ref when events change
  eventsRef.current = events;

  const loadCareerImpact = useCallback(async (eventsToProcess: Event[]) => {
    if (!enabled || eventsToProcess.length === 0) {
      setEnhancedEvents(eventsToProcess);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);
    const startTime = Date.now();

    try {
      // Use the optimized batch service
      const enhanced = await BatchCareerImpactService.enhanceEventsLite(eventsToProcess);
      
      if (!abortControllerRef.current?.signal.aborted) {
        setEnhancedEvents(enhanced);
        
        // Update stats
        const eventsWithImpact = enhanced.filter(e => e.careerImpactLite).length;
        setStats({
          totalEvents: eventsToProcess.length,
          eventsWithImpact,
          loadingTimeMs: Date.now() - startTime
        });
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load career impact';
        setError(errorMessage);
        console.error('Career impact loading failed:', err);
        
        // Fallback to events without career impact
        setEnhancedEvents(eventsToProcess);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  // Debounced effect to prevent excessive API calls
  useEffect(() => {
    // Skip if event IDs haven't changed
    if (currentEventIds === eventIds.current) {
      return;
    }
    eventIds.current = currentEventIds;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced timer - use ref to avoid stale closure
    debounceTimerRef.current = setTimeout(() => {
      // Use ref to get latest events and avoid stale closure
      loadCareerImpact(eventsRef.current);
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentEventIds, debounceMs, loadCareerImpact]); // Include loadCareerImpact but it's stable due to useCallback

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    enhancedEvents,
    isLoading,
    error,
    stats
  };
}

/**
 * Lightweight hook for career impact that only loads when needed
 */
export function useCareerImpactOnDemand() {
  const [cache, setCache] = useState<Map<string, CareerImpactScoreLite>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const getCareerImpact = useCallback(async (eventIds: string[]): Promise<Record<string, CareerImpactScoreLite>> => {
    // Check cache first
    const cached: Record<string, CareerImpactScoreLite> = {};
    const missing: string[] = [];

    eventIds.forEach(id => {
      const cachedScore = cache.get(id);
      if (cachedScore) {
        cached[id] = cachedScore;
      } else {
        missing.push(id);
      }
    });

    // If all are cached, return immediately
    if (missing.length === 0) {
      return cached;
    }

    // Mark as loading
    setLoading(prev => {
      const newLoading = new Set(prev);
      missing.forEach(id => newLoading.add(id));
      return newLoading;
    });

    try {
      // Fetch missing scores
      const newScores = await BatchCareerImpactService.getCareerImpactForEvents(missing, false);
      
      // Update cache
      setCache(prev => {
        const newCache = new Map(prev);
        Object.entries(newScores).forEach(([id, score]) => {
          newCache.set(id, score);
        });
        return newCache;
      });

      // Combine cached and new results
      return { ...cached, ...newScores };
    } catch (error) {
      console.error('On-demand career impact loading failed:', error);
      return cached;
    } finally {
      // Clear loading state
      setLoading(prev => {
        const newLoading = new Set(prev);
        missing.forEach(id => newLoading.delete(id));
        return newLoading;
      });
    }
  }, [cache]);

  const isEventLoading = useCallback((eventId: string): boolean => {
    return loading.has(eventId);
  }, [loading]);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  return {
    getCareerImpact,
    isEventLoading,
    clearCache,
    cacheSize: cache.size
  };
}
