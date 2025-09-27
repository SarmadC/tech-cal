// src/hooks/useUnifiedServerFiltering.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { Event, AppProfile, TrackedEvent, enrichWithTracking } from '@/types';
import { useTrackedEventIds } from './useTrackedEventsUnified';

interface UnifiedFilterOptions {
  // Basic filters
  searchTerm: string;
  categories: string[];
  dateRange: { start: Date | null; end: Date | null; };
  
  // Event properties
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
}

interface UseUnifiedServerFilteringResult {
  // Data
  filteredEvents: TrackedEvent[];
  isLoading: boolean;
  error: string | null;
  
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
}

const DEFAULT_FILTERS: UnifiedFilterOptions = {
  searchTerm: '',
  categories: [],
  dateRange: { start: null, end: null },
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
  userProfile: AppProfile | null,
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

  const { trackedEventIds } = useTrackedEventIds();

  // Debounce search term to avoid excessive API calls - increased delay for rate limiting
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 1500);

  // Create stable filter object for API calls
  const apiFilters = useMemo(() => ({
    ...filters,
    searchTerm: debouncedSearchTerm,
    dateRange: filters.dateRange.start || filters.dateRange.end ? {
      start: filters.dateRange.start?.toISOString(),
      end: filters.dateRange.end?.toISOString()
    } : undefined
  }), [filters, debouncedSearchTerm]);

  const fetchFilteredEvents = useCallback(async (resetPagination = true, retryCount = 0) => {
    // Check cache first (10 minute cache for better performance)
    const cacheKey = JSON.stringify(apiFilters);
    const cachedResult = requestCache.get(cacheKey);
    const now = Date.now();

    if (cachedResult && (now - cachedResult.timestamp) < 10 * 60 * 1000) {
      console.log('Using cached result for:', Object.keys(apiFilters).filter(k => apiFilters[k as keyof typeof apiFilters]));
      setData(cachedResult.data);
      return;
    }

    // Minimum 3 seconds between requests to prevent rate limiting (30 requests/minute = ~2 seconds)
    const timeSinceLastRequest = now - lastRequestTime;
    const minInterval = 3000; // 3 seconds - safer margin under 30 requests/minute

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      console.log(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    setIsLoading(true);
    setError(null);
    setLastRequestTime(Date.now());

    try {
      const requestFilters = resetPagination
        ? { ...apiFilters, page: 1 }
        : apiFilters;

      const response = await fetch('/api/events/filtered', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestFilters)
      });

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

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to filter events');
      }

      // Enrich events with tracking data
      const enrichedEvents = result.data.events.map((event: Event) => {
        const isTracked = trackedEventIds?.has(event.id) || false;
        return enrichWithTracking(event, isTracked);
      });

      const responseData = {
        ...result.data,
        events: enrichedEvents
      };

      if (resetPagination || !data) {
        setData(responseData);
        // Cache the response
        setRequestCache(prev => new Map(prev).set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        }));
      } else {
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter events';
      setError(errorMessage);
      console.error('Server-side filtering error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiFilters, data, trackedEventIds, lastRequestTime, requestCache]);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchFilteredEvents(true);
  }, [
    debouncedSearchTerm, 
    filters.categories, 
    filters.format, 
    filters.cost, 
    filters.difficulty, 
    filters.dateRange, 
    filters.availability,
    filters.popularity,
    filters.duration,
    filters.myTracked,
    filters.myNetwork,
    filters.recommended,
    filters.sortBy,
    fetchFilteredEvents
  ]);

  const updateFilter = useCallback(<K extends keyof UnifiedFilterOptions>(
    key: K, 
    value: UnifiedFilterOptions[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const loadMore = useCallback(() => {
    if (data?.pagination.hasMore && !isLoading) {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
      fetchFilteredEvents(false);
    }
  }, [data?.pagination.hasMore, isLoading, fetchFilteredEvents]);

  const refetch = useCallback(() => {
    fetchFilteredEvents(true);
  }, [fetchFilteredEvents]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.searchTerm) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
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
    setIsFilterPanelOpen
  };
}
