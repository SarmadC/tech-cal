// src/hooks/useUnifiedServerFiltering.ts
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDebounce } from './useDebounce';
import { Event, AppProfile, TrackedEvent, enrichWithTracking } from '@/types';
import { useTrackedEventIds } from './useTrackedEventsUnified';
import { FILTERING_CONSTANTS } from '@/config/filteringConstants';

interface UnifiedFilterOptions {
  // Basic filters
  searchTerm: string;
  categories: string[];
  dateRange: { start: Date | null; end: Date | null; };
  
  // Event properties
  budget: 'all' | 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited';
  format: 'all' | 'virtual' | 'in-person' | 'hybrid';
  cost: 'all' | 'free' | 'paid';
  difficulty: 'all' | 'beginner' | 'intermediate' | 'advanced';
  availability: 'all' | 'available' | 'no-conflicts';
  popularity: 'all' | 'trending' | 'high-attendance' | 'niche';
  duration: 'all' | 'short' | 'medium' | 'long' | 'multi-day';
  
  // Personal filters
  myTracked: boolean;
  myNetwork: boolean;
  recommended: boolean;
  
  // Sorting
  sortBy: 'default' | 'date' | 'popularity' | 'career-impact';
  
  // Pagination
  page: number;
  pageSize: number;
}

interface FilteredEventsData {
  events: TrackedEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  stats: {
    processingTimeMs: number;
    filteredCount: number;
    totalCount: number;
  };
  isColdStart?: boolean;
}

interface UseUnifiedServerFilteringResult {
  // Data
  filteredEvents: TrackedEvent[];
  isLoading: boolean;
  error: string | null;
  isColdStart: boolean;

  // Filter state
  filters: UnifiedFilterOptions;
  activeFilterCount: number;

  // Actions
  updateFilter: <K extends keyof UnifiedFilterOptions>(key: K, value: UnifiedFilterOptions[K]) => void;
  resetFilters: () => void;
  loadMore: () => void;
  refetch: () => void;
  applyQuickFilter: (filterType: string) => void;

  // UI state
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: (open: boolean) => void;
  rateLimitWaitMs: number;
}

const DEFAULT_FILTERS: UnifiedFilterOptions = {
  searchTerm: '',
  categories: [],
  dateRange: { start: null, end: null },
  budget: 'all',
  format: 'all',
  cost: 'all',
  difficulty: 'all',
  availability: 'all',
  popularity: 'all',
  duration: 'all',
  myTracked: false,
  myNetwork: false,
  recommended: false,
  sortBy: 'default',
  page: 1,
  pageSize: 50
};

/**
 * Unified server-side filtering hook that replaces useSmartFilters
 * Handles all filtering logic on the server with pagination
 */
export function useUnifiedServerFiltering(
  _userProfile: AppProfile | null,
  initialFilters: Partial<UnifiedFilterOptions> = {}
): UseUnifiedServerFilteringResult {
  const [filters, setFilters] = useState<UnifiedFilterOptions>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });
  
  const [data, setData] = useState<FilteredEventsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [requestCache, setRequestCache] = useState<Map<string, { data: FilteredEventsData; timestamp: number }>>(new Map());
  const [rateLimitWaitMs, setRateLimitWaitMs] = useState(0);

  const { trackedEventIds } = useTrackedEventIds();
  const isMountedRef = useRef(true);
  const rateLimitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(filters.searchTerm, FILTERING_CONSTANTS.SEARCH_DEBOUNCE_MS);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      setRateLimitWaitMs(0); // Clear wait state
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
        rateLimitTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // Create stable filter object for API calls
  const apiFilters = useMemo(() => ({
    ...filters,
    searchTerm: debouncedSearchTerm,
    dateRange: filters.dateRange.start || filters.dateRange.end ? {
      start: filters.dateRange.start?.toISOString(),
      end: filters.dateRange.end?.toISOString()
    } : undefined
  }), [filters, debouncedSearchTerm]);

  // Refs to store latest values to avoid dependency issues
  const apiFiltersRef = useRef(apiFilters);
  const dataRef = useRef(data);
  const trackedEventIdsRef = useRef(trackedEventIds);
  const lastRequestTimeRef = useRef(lastRequestTime);
  const requestCacheRef = useRef(requestCache);
  
  // Update refs when values change
  apiFiltersRef.current = apiFilters;
  dataRef.current = data;
  trackedEventIdsRef.current = trackedEventIds;
  lastRequestTimeRef.current = lastRequestTime;
  requestCacheRef.current = requestCache;

  const fetchFilteredEvents = useCallback(async (resetPagination = true, retryCount = 0) => {
    console.log('[Client] fetchFilteredEvents called with resetPagination:', resetPagination);
    // Cancel previous request if in flight
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Clear previous rate limit timer (coalesce to latest request)
    if (rateLimitTimerRef.current) {
      clearTimeout(rateLimitTimerRef.current);
      rateLimitTimerRef.current = null;
    }

    // Check cache first
    console.log('[Client] Checking cache...');
    const cacheKey = JSON.stringify(apiFiltersRef.current);
    const cachedResult = requestCacheRef.current.get(cacheKey);
    const now = Date.now();

    if (cachedResult && (now - cachedResult.timestamp) < FILTERING_CONSTANTS.FILTER_CACHE_DURATION_MS) {
      console.log('Using cached result for:', Object.keys(apiFiltersRef.current).filter(k => apiFiltersRef.current[k as keyof typeof apiFiltersRef.current]));
      setData(cachedResult.data);
      return;
    }
    console.log('[Client] No cache hit, proceeding with API call...');

    // Rate limiting with breadcrumb logging
    console.log('[Client] Checking rate limiting...');
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    console.log(`[Client] Time since last request: ${timeSinceLastRequest}ms, limit: ${FILTERING_CONSTANTS.RATE_LIMIT_INTERVAL_MS}ms`);
    
    // Temporarily disable rate limiting to debug
    if (false && timeSinceLastRequest < FILTERING_CONSTANTS.RATE_LIMIT_INTERVAL_MS) {
      const waitTime = FILTERING_CONSTANTS.RATE_LIMIT_INTERVAL_MS - timeSinceLastRequest;
      console.log(`[Client] Rate limited, waiting ${waitTime}ms before next request`);
      setRateLimitWaitMs(waitTime);

      await new Promise(resolve => {
        rateLimitTimerRef.current = setTimeout(resolve, waitTime);
      });

      if (!isMountedRef.current) return; // Exit early if unmounted

      rateLimitTimerRef.current = null;
      setRateLimitWaitMs(0);

      if (process.env.NODE_ENV !== 'production') {
        console.debug('[RateLimit] Wait complete, proceeding with request');
      }
    }
    console.log('[Client] Rate limiting check passed, making API call...');

    console.log('[Client] Setting loading state...');
    setIsLoading(true);
    setError(null);
    setLastRequestTime(Date.now());
    console.log('[Client] Loading state set, creating abort controller...');

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Note: We can still fetch events even without a profile (new users)
    // The API will use the authenticated user ID from the session

    try {
      const requestFilters = resetPagination
        ? { ...apiFiltersRef.current, page: 1 }
        : apiFiltersRef.current;

      console.log('[Client] Making API request to /api/events/filtered with filters:', requestFilters);
      const response = await fetch('/api/events/filtered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestFilters),
        signal: abortControllerRef.current.signal
      });

      console.log('[Client] API response received, status:', response.status);
      console.log('[Client] Response ok:', response.ok);

      if (!response.ok) {
        if (response.status === 429) {
          // Implement exponential backoff for rate limiting
          if (retryCount < 2) { // Reduced retries to avoid overwhelming server
            const delay = Math.pow(2, retryCount + 2) * 1000; // 4s, 8s (longer delays)
            console.log(`Rate limited, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchFilteredEvents(resetPagination, retryCount + 1);
          }
          throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
        }
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in again.');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      console.log('[Client] Parsing response JSON...');
      const result = await response.json();
      console.log('[Client] Response parsed successfully, result:', result);
      
      if (!result.success) {
        console.log('[Client] API returned success: false, error:', result.error);
        throw new Error(result.error || 'Failed to filter events');
      }
      
      console.log('[Client] API response successful, processing events...');

      // Enrich events with tracking data
      const enrichedEvents = result.data.events.map((event: Event) => {
        const isTracked = trackedEventIdsRef.current?.has(event.id) || false;
        return enrichWithTracking(event, isTracked);
      });

      const responseData = {
        ...result.data,
        events: enrichedEvents,
        isColdStart: result.data.isColdStart || false
      };

      console.log('[Client] Setting data with', enrichedEvents.length, 'events');
      if (resetPagination || !dataRef.current) {
        setData(responseData);
        console.log('[Client] Data set successfully, caching response');
        // Cache the response
        setRequestCache(prev => new Map(prev).set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        }));
      } else {
        console.log('[Client] Appending to existing data for pagination');
        // Append to existing data for pagination
        setData(prev => prev ? {
          ...result.data,
          events: [...prev.events, ...enrichedEvents]
        } : responseData);
      }

      // Update pagination in filters
      if (resetPagination) {
        setFilters(prev => ({ ...prev, page: 1 }));
      }

    } catch (err) {
      // Ignore abort errors (user initiated)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to filter events';
      setError(errorMessage);
      setRateLimitWaitMs(0); // Clear wait state on error

      // Clear timer on error
      if (rateLimitTimerRef.current) {
        clearTimeout(rateLimitTimerRef.current);
        rateLimitTimerRef.current = null;
      }

      console.error('Server-side filtering error:', err);
    } finally {
      console.log('[Client] Finally block executed, setting isLoading to false');
      setIsLoading(false); // Always set to false, regardless of mounted state
      console.log('[Client] isLoading set to false');
      abortControllerRef.current = null;
    }
  }, []); // Remove dependencies to prevent infinite loops

  // Single useEffect to handle initial fetch only
  useEffect(() => {
    console.log('[Client] useEffect triggered - calling fetchFilteredEvents(true)');
    fetchFilteredEvents(true);
  }, [fetchFilteredEvents]); // Include fetchFilteredEvents to satisfy ESLint

  const updateFilter = useCallback(<K extends keyof UnifiedFilterOptions>(
    key: K, 
    value: UnifiedFilterOptions[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    // Trigger a refetch when filters change
    fetchFilteredEvents(true);
  }, [fetchFilteredEvents]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const loadMore = useCallback(() => {
    if (data?.pagination.hasMore && !isLoading) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
      fetchFilteredEvents(false);
    }
  }, [data?.pagination.hasMore, isLoading, fetchFilteredEvents]); // Include fetchFilteredEvents to satisfy ESLint

  const refetch = useCallback(() => {
    fetchFilteredEvents(true);
  }, [fetchFilteredEvents]); // Include fetchFilteredEvents to satisfy ESLint

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.searchTerm) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.budget !== 'all') count++;
    if (filters.format !== 'all') count++;
    if (filters.cost !== 'all') count++;
    if (filters.difficulty !== 'all') count++;
    if (filters.availability !== 'all') count++;
    if (filters.popularity !== 'all') count++;
    if (filters.duration !== 'all') count++;
    if (filters.myTracked) count++;
    if (filters.myNetwork) count++;
    if (filters.recommended) count++;
    return count;
  }, [filters]);

  // Quick filter actions (from original useSmartFilters)
  const applyQuickFilter = useCallback((filterType: string) => {
    switch (filterType) {
      case 'this-week':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        setFilters(prev => ({
          ...prev,
          dateRange: { start: weekStart, end: weekEnd }
        }));
        break;

      case 'free-events':
        setFilters(prev => ({ ...prev, cost: 'free' }));
        break;

      case 'virtual-only':
        setFilters(prev => ({ ...prev, format: 'virtual' }));
        break;

      case 'my-level':
        setFilters(prev => ({ ...prev, difficulty: 'intermediate' }));
        break;

      case 'no-conflicts':
        setFilters(prev => ({ ...prev, availability: 'no-conflicts' }));
        break;

      case 'trending':
        setFilters(prev => ({ ...prev, popularity: 'trending' }));
        break;
    }
  }, []);

  return {
    // Data
    filteredEvents: data?.events || [],
    isLoading,
    error,
    isColdStart: data?.isColdStart || false,

    // Filter state
    filters,
    activeFilterCount,

    // Actions
    updateFilter,
    resetFilters,
    loadMore,
    refetch,
    applyQuickFilter,

    // UI state
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    rateLimitWaitMs
  };
}
