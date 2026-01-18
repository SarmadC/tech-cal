// src/hooks/useUnifiedServerFiltering.ts
'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useDebounce } from './useDebounce';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Event, AppProfile, TrackedEvent, enrichWithTracking } from '@/types';
import { useTrackedEventIds } from './useTrackedEventsUnified';
import { FILTERING_CONSTANTS } from '@/config/filteringConstants';
import { FilterCounts } from '@/utils/filterCountUtils';

export interface UnifiedFilterOptions {
  // Basic filters
  searchTerm: string;
  categories: string[];
  tags: string[];
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
  counts?: FilterCounts;
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
  counts: FilterCounts | null;
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
  applyNearMe: () => Promise<void>;

  // UI state
  isFilterPanelOpen: boolean;
  setIsFilterPanelOpen: (open: boolean) => void;
  rateLimitWaitMs: number;
  isDetectingLocation: boolean;
}

const DEFAULT_FILTERS: UnifiedFilterOptions = {
  searchTerm: '',
  categories: [],
  tags: [],
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
  sortBy: 'popularity',
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
  tags: overrides.tags ?? [],
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

  // Track typing state for fast search mode
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // When search term changes, mark as typing and set timeout to settle
  useEffect(() => {
    if (!filters.searchTerm) {
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, FILTERING_CONSTANTS.TYPING_SETTLE_MS); // Consider "settled" after typing stops
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [filters.searchTerm]);

  const sessionIdRef = useRef<string | null>(null);
  if (!sessionIdRef.current) {
    const randomId = typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `filters_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionIdRef.current = randomId;
  }

  // Create stable filter signature for debouncing (with date serialization)
  // This replaces the previous 4-layer chain: searchDebounce -> apiFilters -> signature -> parse
  const filtersSignature = useMemo(() => JSON.stringify({
    ...filters,
    dateRange: filters.dateRange.start || filters.dateRange.end ? {
      start: filters.dateRange.start?.toISOString(),
      end: filters.dateRange.end?.toISOString()
    } : undefined
  }), [filters]);

  // Single unified debounce for all filter changes (100ms)
  // This replaces dual debouncing (50ms search + 150ms filters) which caused 2-3 extra API calls
  const debouncedSignature = useDebounce(filtersSignature, FILTERING_CONSTANTS.UNIFIED_DEBOUNCE_MS);

  // Parse debounced filters - only runs when debounce settles
  const stableFilters = useMemo(
    () => JSON.parse(debouncedSignature) as Record<string, unknown>,
    [debouncedSignature]
  );

  // Final filters for API call
  const fetchFilters = useMemo(() => ({
    ...stableFilters,
    tags: filters.tags, // Explicitly include tags to ensure they are passed correctly
    page: filters.page,
    pageSize: filters.pageSize,
    sessionId: sessionIdRef.current ?? 'filters_fallback',
    surface,
    // Fast search mode: skip enrichment when user is actively typing
    fastSearch: isTyping && Boolean(filters.searchTerm),
  }), [stableFilters, filters.tags, filters.page, filters.pageSize, surface, isTyping, filters.searchTerm]);

  // React Query: paged query for filtered events
  // In development, use shorter staleTime to see changes immediately
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Query key factory for deterministic, consistent cache keys
  // Ensures arrays are sorted and properties are in consistent order
  const queryKeyVersion = 'v3'; // Bumped for query key factory changes
  const createFilterQueryKey = useCallback(
    (mode: 'paged' | 'infinite') => {
      // Create a deterministic key by sorting arrays and using consistent property order
      // Use the debounced signature for the main content to ensure consistency
      const stableKey = {
        // The signature already captures the debounced filter state
        signature: debouncedSignature,
        // These are not part of the signature but affect the query
        page: filters.page,
        pageSize: filters.pageSize,
        surface,
        fastSearch: isTyping && Boolean(filters.searchTerm),
      };
      return ['filtered-events', queryKeyVersion, mode, stableKey] as const;
    },
    [debouncedSignature, filters.page, filters.pageSize, surface, isTyping, filters.searchTerm]
  );

  const {
    data: pagedData,
    isLoading: pagedLoading,
    isFetching: pagedFetching,
    isPlaceholderData: pagedIsPlaceholder,
    error: pagedError,
    refetch: pagedRefetch,
  } = useQuery({
    queryKey: createFilterQueryKey('paged'),
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

      // Debug logging for tag filtering
      if (process.env.NODE_ENV === 'development' && fetchFilters.tags && (fetchFilters.tags as string[]).length > 0) {
        console.log('[useUnifiedServerFiltering] Fetching with tags:', fetchFilters.tags);
      }

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
    queryKey: createFilterQueryKey('infinite'),
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
  // isLoading = true only when NO data exists at all (true initial load)
  // isBackgroundRefetch = true when refetching with existing/placeholder data
  // Key insight: when using placeholderData, pagedData exists but isPlaceholderData is true
  // We should NOT show skeleton when we have placeholder data - just show the old results
  const isInitialLoading = isPagedMode
    ? (pagedLoading && !pagedData && !pagedIsPlaceholder)
    : (infiniteLoading && !infiniteData);

  // Treat placeholder data scenario as background refetch (subtle loading indicator only)
  const isBackgroundRefetch = isPagedMode
    ? (pagedFetching && (!!pagedData || pagedIsPlaceholder))
    : (infiniteFetching && !!infiniteData);

  const updateFilter: UpdateFilterHandler = useCallback((key, value) => {
    // Debug logging for tag updates
    if (key === 'tags' && process.env.NODE_ENV === 'development') {
      console.log('[useUnifiedServerFiltering] updateFilter called:', { key, value });
    }
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

  // Calculate active filter count - optimized with specific dependencies
  // This prevents recalculation when pagination changes (page/pageSize/sortBy/sortDirection)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.tags.length > 0) count++;
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
  }, [
    filters.categories.length,
    filters.tags.length,
    filters.locations.length,
    filters.searchTerm,
    filters.dateRange.start,
    filters.dateRange.end,
    filters.budget,
    filters.format,
    filters.cost,
    filters.difficulty,
    filters.availability,
    filters.popularity,
    filters.duration,
    filters.myTracked,
    filters.myNetwork,
    filters.recommended,
  ]);

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
  
  // Location detection state and action
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  
  // Timezone to location mapping for fallback location detection
  const timezoneToLocationMap: Record<string, { city: string; country: string }> = {
    'America/New_York': { city: 'New York', country: 'USA' },
    'America/Los_Angeles': { city: 'Los Angeles', country: 'USA' },
    'America/Chicago': { city: 'Chicago', country: 'USA' },
    'America/Denver': { city: 'Denver', country: 'USA' },
    'America/Toronto': { city: 'Toronto', country: 'Canada' },
    'America/Vancouver': { city: 'Vancouver', country: 'Canada' },
    'Europe/London': { city: 'London', country: 'UK' },
    'Europe/Berlin': { city: 'Berlin', country: 'Germany' },
    'Europe/Paris': { city: 'Paris', country: 'France' },
    'Europe/Amsterdam': { city: 'Amsterdam', country: 'Netherlands' },
    'Asia/Tokyo': { city: 'Tokyo', country: 'Japan' },
    'Asia/Singapore': { city: 'Singapore', country: 'Singapore' },
    'Asia/Hong_Kong': { city: 'Hong Kong', country: 'Hong Kong' },
    'Australia/Sydney': { city: 'Sydney', country: 'Australia' },
  };
  
  /**
   * Reverse geocode coordinates to get city name using free BigDataCloud API
   */
  const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        console.warn('[NearMe] Reverse geocoding API error:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      // Try to get the city name from various fields
      const city = data.city || data.locality || data.principalSubdivision || null;
      
      if (city) {
        console.log('[NearMe] Detected location:', city, data.countryName);
        return city;
      }
      
      return null;
    } catch (error) {
      console.warn('[NearMe] Reverse geocoding failed:', error);
      return null;
    }
  };
  
  /**
   * Get location from IP address using BigDataCloud's free IP geolocation API
   * This is useful when browser geolocation is denied but user is traveling
   */
  const getLocationFromIP = async (): Promise<string | null> => {
    try {
      console.log('[NearMe] Trying IP-based geolocation...');
      // Using BigDataCloud client-info - free, no API key required, HTTPS, returns city from IP
      const response = await fetch('https://api.bigdatacloud.net/data/client-info');
      
      if (!response.ok) {
        console.warn('[NearMe] IP geolocation API error:', response.status);
        return null;
      }
      
      const data = await response.json();
      console.log('[NearMe] IP geolocation response:', data);
      
      // BigDataCloud client-info returns location info based on IP
      const city = data.city || data.locality || data.location?.city || data.location?.locality || data.principalSubdivision || null;
      
      if (city) {
        console.log('[NearMe] IP-based location detected:', city, data.countryName || data.country);
        return city;
      }
      
      console.log('[NearMe] IP geolocation returned no city data');
      return null;
    } catch (error) {
      console.warn('[NearMe] IP geolocation failed:', error);
      return null;
    }
  };
  
  const applyNearMe = useCallback(async () => {
    setIsDetectingLocation(true);
    
    try {
      // 1. Try browser geolocation with reverse geocoding (most accurate)
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
            );
          });
          
          const { latitude, longitude } = position.coords;
          console.log('[NearMe] Got coordinates:', latitude, longitude);
          
          // Try reverse geocoding to get actual city name
          const city = await reverseGeocode(latitude, longitude);
          
          if (city) {
            setFilters(prev => ({ ...prev, locations: [city] }));
            return;
          }
          
          console.log('[NearMe] Reverse geocoding returned no city, trying IP geolocation');
        } catch (error) {
          console.warn('[NearMe] Geolocation failed:', error);
          // Fall through to IP-based detection
        }
      }
      
      // 2. Try IP-based geolocation (works when traveling, more accurate than timezone)
      try {
        const ipCity = await getLocationFromIP();
        if (ipCity) {
          setFilters(prev => ({ ...prev, locations: [ipCity] }));
          return;
        }
      } catch (error) {
        console.warn('[NearMe] IP geolocation failed:', error);
      }
      
      // 3. Final fallback: use timezone to guess location
      console.log('[NearMe] Falling back to timezone detection');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const locationData = timezoneToLocationMap[timezone];
      
      if (locationData) {
        setFilters(prev => ({ ...prev, locations: [locationData.city] }));
      } else {
        // Extract city from timezone
        const parts = timezone.split('/');
        if (parts.length > 1) {
          const city = parts[parts.length - 1].replace(/_/g, ' ');
          setFilters(prev => ({ ...prev, locations: [city] }));
        }
      }
    } finally {
      setIsDetectingLocation(false);
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
  const counts = useMemo<FilterCounts | null>(() => {
    if (isPagedMode) {
      return pagedData?.data.counts ?? null;
    }
    const firstPage = (infiniteData?.pages ?? [])[0] as { success: true; data: FilteredEventsData } | undefined;
    return firstPage?.data.counts ?? null;
  }, [isPagedMode, pagedData?.data.counts, infiniteData?.pages]);

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
    counts,
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
    applyNearMe,

    // UI state
    isFilterPanelOpen,
    setIsFilterPanelOpen,
    rateLimitWaitMs: 0,
    hasNextPage: effectiveHasNextPage,
    isFetchingNextPage: effectiveIsFetchingNextPage,
    isDetectingLocation,
  };
}
