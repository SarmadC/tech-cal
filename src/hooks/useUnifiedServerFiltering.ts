// src/hooks/useUnifiedServerFiltering.ts
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { useInfiniteQuery } from '@tanstack/react-query';
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
  events: Event[];
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
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const { trackedEventIds } = useTrackedEventIds();

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(filters.searchTerm, FILTERING_CONSTANTS.SEARCH_DEBOUNCE_MS);

  // Create stable filter object for API calls
  const apiFilters = useMemo(() => ({
    ...filters,
    searchTerm: debouncedSearchTerm,
    dateRange: filters.dateRange.start || filters.dateRange.end ? {
      start: filters.dateRange.start?.toISOString(),
      end: filters.dateRange.end?.toISOString()
    } : undefined
  }), [filters, debouncedSearchTerm]);
  // Debounce all filters (including non-search) to coalesce rapid changes
  const apiFiltersSignature = useMemo(() => JSON.stringify(apiFilters), [apiFilters]);
  const debouncedFiltersSignature = useDebounce(apiFiltersSignature, FILTERING_CONSTANTS.FILTERS_DEBOUNCE_MS);
  const stableFilters = useMemo(() => JSON.parse(debouncedFiltersSignature) as typeof apiFilters, [debouncedFiltersSignature]);

  // React Query: infinite query for filtered events
  const {
    data: queryData,
    isLoading,
    isFetching,
    isFetchingNextPage,
    error: queryError,
    refetch: queryRefetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['filtered-events', stableFilters],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch('/api/events/filtered', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...stableFilters, page: pageParam }),
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to filter events');
      }
      return result as { success: true; data: FilteredEventsData };
    },
    getNextPageParam: (lastPage) => {
      const { page, hasMore } = lastPage.data.pagination;
      return hasMore ? page + 1 : undefined;
    },
    staleTime: FILTERING_CONSTANTS.FILTER_CACHE_DURATION_MS,
    gcTime: FILTERING_CONSTANTS.FILTER_CACHE_DURATION_MS * 2,
    retry: (failureCount, error) => {
      if (error instanceof Error && /401|403|412|429/.test(error.message)) return false;
      return failureCount < 2;
    },
  });

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
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const refetch = useCallback(() => {
    queryRefetch();
  }, [queryRefetch]);

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

  // Flatten pages and enrich tracking info
  const flattenedEvents: TrackedEvent[] = useMemo(() => {
    const pages = queryData?.pages ?? [];
    const events = pages.flatMap(p => p.data.events || []);
    return events.map((event: Event) => enrichWithTracking(event, trackedEventIds?.has(event.id) || false));
  }, [queryData?.pages, trackedEventIds]);

  const combinedIsColdStart = useMemo(() => {
    const pages = queryData?.pages ?? [];
    if (pages.length === 0) return false;
    return pages[0].data.isColdStart || false;
  }, [queryData?.pages]);

  return {
    // Data
    filteredEvents: flattenedEvents,
    isLoading: isLoading || isFetching,
    error: queryError instanceof Error ? queryError.message : null,
    isColdStart: combinedIsColdStart,

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
    rateLimitWaitMs: 0,
  };
}
