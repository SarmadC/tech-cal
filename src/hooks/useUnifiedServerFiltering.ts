// src/hooks/useUnifiedServerFiltering.ts
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Event, AppProfile, TrackedEvent, enrichWithTracking } from '@/types';
import { useTrackedEventIds } from './useTrackedEventsUnified';
import { FILTERING_CONSTANTS } from '@/config/filteringConstants';

export interface UnifiedFilterOptions {
  // Basic filters
  searchTerm: string;
  categories: string[];
  locations: string[];
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
  sortBy: 'default' | 'date' | 'popularity' | 'career-impact' | 'title' | 'location';
  sortDirection: 'asc' | 'desc';
  
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

type FilterSurface = 'calendar' | 'discover' | 'default';

interface UnifiedFilteringOptions {
  surface?: FilterSurface;
  autoLoadAllPages?: boolean;
}

export type UpdateFilterHandler = <K extends keyof UnifiedFilterOptions>(key: K, value: UnifiedFilterOptions[K]) => void;

interface UseUnifiedServerFilteringResult {
  // Data
  filteredEvents: TrackedEvent[];
  isLoading: boolean;
  isBackgroundRefetch: boolean;
  error: string | null;
  isColdStart: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  totalCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };

  // Filter state
  filters: UnifiedFilterOptions;
  activeFilterCount: number;

  // Actions
  updateFilter: UpdateFilterHandler;
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
  locations: [],
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
  sortDirection: 'asc',
  page: 1,
  pageSize: 50
};

export const createDefaultUnifiedFilters = (
  overrides: Partial<UnifiedFilterOptions> = {}
): UnifiedFilterOptions => ({
  ...DEFAULT_FILTERS,
  ...overrides,
  categories: overrides.categories ?? [],
  locations: overrides.locations ?? [],
  dateRange: overrides.dateRange ?? { start: null, end: null }
});

/**
 * Unified server-side filtering hook that replaces useSmartFilters
 * Handles all filtering logic on the server with pagination
 */
export function useUnifiedServerFiltering(
  _userProfile: AppProfile | null,
  initialFilters: Partial<UnifiedFilterOptions> = {},
  options: UnifiedFilteringOptions = {}
): UseUnifiedServerFilteringResult {
  const surface: FilterSurface = options.surface ?? 'discover';
  const autoLoadAllPages = options.autoLoadAllPages ?? false;
  const isPagedMode = !autoLoadAllPages;

  const normalizedInitialFilters = useMemo(() => initialFilters, [initialFilters]);

  const mergedDefaultFilters = useMemo<UnifiedFilterOptions>(() => ({
    ...DEFAULT_FILTERS,
    ...normalizedInitialFilters,
    ...(surface === 'calendar'
      ? { pageSize: Math.min(100, normalizedInitialFilters.pageSize ?? 100) }
      : {})
  }), [normalizedInitialFilters, surface]);

  const [filters, setFilters] = useState<UnifiedFilterOptions>(() => mergedDefaultFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const { trackedEventIds } = useTrackedEventIds();

  const sessionIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) {
    const randomId = typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `filters_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionIdRef.current = randomId;
  }

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

  const fetchFilters = useMemo(() => ({
    ...stableFilters,
    page: filters.page,
    pageSize: filters.pageSize,
    sessionId: sessionIdRef.current ?? 'filters_fallback',
    surface,
  }), [stableFilters, filters.page, filters.pageSize, surface]);

  // React Query: paged query for filtered events
  // In development, use shorter staleTime to see changes immediately
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Versioned query key for cache busting (v2 for tag enrichment improvements)
  const queryKeyVersion = 'v2';
  
  const {
    data: pagedData,
    isLoading: pagedLoading,
    isFetching: pagedFetching,
    error: pagedError,
    refetch: pagedRefetch,
  } = useQuery({
    queryKey: ['filtered-events', queryKeyVersion, 'paged', fetchFilters],
    enabled: isPagedMode,
    placeholderData: (previousData) => previousData,
    staleTime: isDevelopment ? 0 : FILTERING_CONSTANTS.FILTER_CACHE_DURATION_MS,
    gcTime: isDevelopment ? 0 : FILTERING_CONSTANTS.FILTER_CACHE_DURATION_MS * 2,
    refetchOnMount: isDevelopment ? true : false, // Always refetch in dev
    queryFn: async () => {
      const requestId = typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const requestTimestamp = new Date().toISOString();

      const response = await fetch('/api/events/filtered', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Request-Id': requestId,
          'X-Request-Timestamp': requestTimestamp
        },
        body: JSON.stringify(fetchFilters),
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
    retry: (failureCount, error) => {
      if (error instanceof Error && /401|403|412|429/.test(error.message)) return false;
      return failureCount < 2;
    },
  });

  // React Query: infinite query for filtered events when auto loading pages
  const {
    data: infiniteData,
    isLoading: infiniteLoading,
    isFetching: infiniteFetching,
    isFetchingNextPage,
    error: infiniteError,
    refetch: infiniteRefetch,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['filtered-events', queryKeyVersion, 'infinite', fetchFilters],
    enabled: autoLoadAllPages,
    initialPageParam: 1,
    placeholderData: (previousData) => previousData,
    staleTime: isDevelopment ? 0 : FILTERING_CONSTANTS.FILTER_CACHE_DURATION_MS,
    gcTime: isDevelopment ? 0 : FILTERING_CONSTANTS.FILTER_CACHE_DURATION_MS * 2,
    refetchOnMount: isDevelopment ? true : false,
    queryFn: async ({ pageParam = 1 }) => {
      const requestId = typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const requestTimestamp = new Date().toISOString();

      const response = await fetch('/api/events/filtered', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'X-Request-Id': requestId,
          'X-Request-Timestamp': requestTimestamp
        },
        body: JSON.stringify({ ...fetchFilters, page: pageParam }),
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
    getNextPageParam: (lastPage: { success: true; data: FilteredEventsData }) => {
      const { page, hasMore } = lastPage.data.pagination;
      return hasMore ? page + 1 : undefined;
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && /401|403|412|429/.test(error.message)) return false;
      return failureCount < 2;
    },
  });

  const activeQueryError = isPagedMode ? pagedError : infiniteError;
  const queryError = activeQueryError instanceof Error ? activeQueryError.message : null;

  // Separate initial loading from background refetching
  // isLoading = true only when NO data exists (initial load)
  // isBackgroundRefetch = true when refetching with existing data
  const isInitialLoading = isPagedMode
    ? (pagedLoading && !pagedData)
    : (infiniteLoading && !infiniteData);

  const isBackgroundRefetch = isPagedMode
    ? (pagedFetching && !!pagedData)
    : (infiniteFetching && !!infiniteData);

  const updateFilter: UpdateFilterHandler = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(mergedDefaultFilters);
  }, [mergedDefaultFilters]);

  const loadMore = useCallback(() => {
    if (autoLoadAllPages) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    } else {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
    }
  }, [autoLoadAllPages, fetchNextPage, hasNextPage, isFetchingNextPage]);

  const refetch = useCallback(() => {
    if (isPagedMode) {
      pagedRefetch();
    } else {
      infiniteRefetch();
    }
  }, [isPagedMode, pagedRefetch, infiniteRefetch]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.locations.length > 0) count++;
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
  const pagedEvents = useMemo(() => {
    const events = pagedData?.data.events ?? [];
    return events.map((event: Event) => enrichWithTracking(event, trackedEventIds?.has(event.id) || false));
  }, [pagedData?.data.events, trackedEventIds]);

  const infiniteEvents = useMemo(() => {
    const pages = (infiniteData?.pages ?? []) as Array<{ success: true; data: FilteredEventsData }>;
    const events = pages.flatMap(p => p.data.events || []);
    return events.map((event: Event) => enrichWithTracking(event, trackedEventIds?.has(event.id) || false));
  }, [infiniteData?.pages, trackedEventIds]);

  const filteredEvents = isPagedMode ? pagedEvents : infiniteEvents;

  const currentPagination = useMemo(() => {
    if (isPagedMode) {
      const pagination = pagedData?.data.pagination;
      const total = pagination?.total ?? pagedData?.data.stats.totalCount ?? 0;
      const pageSize = pagination?.pageSize ?? filters.pageSize;
      const page = pagination?.page ?? filters.page;
      const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
      return {
        page,
        pageSize,
        totalPages,
        totalItems: total,
        hasMore: pagination?.hasMore ?? (page < totalPages),
      };
    }

    const pages = (infiniteData?.pages ?? []) as Array<{ success: true; data: FilteredEventsData }>;
    const firstPage = pages[0]?.data;
    const lastPage = pages[pages.length - 1]?.data;
    const total = firstPage?.pagination.total ?? firstPage?.stats.totalCount ?? 0;
    const pageSize = filters.pageSize;
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
    const currentPage = lastPage?.pagination.page ?? filters.page;
    const hasMore = Boolean(hasNextPage);

    return {
      page: currentPage,
      pageSize,
      totalPages,
      totalItems: total,
      hasMore,
    };
  }, [isPagedMode, pagedData?.data, filters.page, filters.pageSize, infiniteData?.pages, hasNextPage]);

  const totalCount = currentPagination.totalItems;

  const combinedIsColdStart = useMemo(() => {
    if (isPagedMode) {
      return pagedData?.data.isColdStart ?? false;
    }
    const pages = (infiniteData?.pages ?? []) as Array<{ success: true; data: FilteredEventsData }>;
    if (pages.length === 0) return false;
    return pages[0].data.isColdStart || false;
  }, [isPagedMode, pagedData?.data, infiniteData?.pages]);

  useEffect(() => {
    if (!autoLoadAllPages) return;
    if (hasNextPage && !isFetchingNextPage && !infiniteFetching) {
      fetchNextPage();
    }
  }, [autoLoadAllPages, hasNextPage, isFetchingNextPage, infiniteFetching, fetchNextPage]);

  const effectiveHasNextPage = isPagedMode ? currentPagination.hasMore : Boolean(hasNextPage);
  const effectiveIsFetchingNextPage = autoLoadAllPages ? Boolean(isFetchingNextPage) : false;

  return {
    // Data
    filteredEvents,
    isLoading: isInitialLoading,
    isBackgroundRefetch,
    error: queryError,
    isColdStart: combinedIsColdStart,
    totalCount,
    pagination: currentPagination,

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
    hasNextPage: effectiveHasNextPage,
    isFetchingNextPage: effectiveIsFetchingNextPage,
  };
}
