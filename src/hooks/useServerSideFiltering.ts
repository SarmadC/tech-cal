// src/hooks/useServerSideFiltering.ts
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';

interface ServerFilterOptions {
  searchTerm?: string;
  categories?: string[];
  format?: 'all' | 'virtual' | 'in-person' | 'hybrid';
  cost?: 'all' | 'free' | 'paid';
  difficulty?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  sortBy?: 'date' | 'popularity' | 'career-impact';
  page?: number;
  pageSize?: number;
}

interface FilteredEventsData {
  events: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    applied: Record<string, unknown>;
    available: {
      categories: Array<{ id: string; name: string; count: number }>;
      difficulties: Array<{ value: string; count: number }>;
      formats: Array<{ value: string; count: number }>;
    };
  };
  stats: {
    processingTimeMs: number;
    filteredCount: number;
    totalCount: number;
  };
}

interface UseServerSideFilteringResult {
  data: FilteredEventsData | null;
  isLoading: boolean;
  error: string | null;
  filters: ServerFilterOptions;
  updateFilter: <K extends keyof ServerFilterOptions>(key: K, value: ServerFilterOptions[K]) => void;
  resetFilters: () => void;
  loadMore: () => void;
  refetch: () => void;
}

const DEFAULT_FILTERS: ServerFilterOptions = {
  searchTerm: '',
  categories: [],
  format: 'all',
  cost: 'all',
  difficulty: 'all',
  sortBy: 'date',
  page: 1,
  pageSize: 20
};

/**
 * Hook for server-side event filtering
 * Moves filtering logic from client to server for better performance and security
 */
export function useServerSideFiltering(
  initialFilters: Partial<ServerFilterOptions> = {}
): UseServerSideFilteringResult {
  const [filters, setFilters] = useState<ServerFilterOptions>({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });
  
  const [data, setData] = useState<FilteredEventsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(filters.searchTerm || '', 500);

  // Create stable filter object for API calls
  const apiFilters = useMemo(() => ({
    ...filters,
    searchTerm: debouncedSearchTerm,
    dateRange: filters.dateRange ? {
      start: filters.dateRange.start?.toISOString(),
      end: filters.dateRange.end?.toISOString()
    } : undefined
  }), [filters, debouncedSearchTerm]);

  const fetchFilteredEvents = useCallback(async (resetPagination = true) => {
    setIsLoading(true);
    setError(null);

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
          // Let higher-level retry logic handle this
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

      if (resetPagination || !data) {
        setData(result.data);
      } else {
        // Append to existing data for pagination
        setData(prev => prev ? {
          ...result.data,
          events: [...prev.events, ...result.data.events]
        } : result.data);
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
  }, [apiFilters, data]);

  // Auto-fetch when filters change
  useEffect(() => {
    fetchFilteredEvents(true);
  }, [debouncedSearchTerm, filters.categories, filters.format, filters.cost, filters.difficulty, filters.dateRange, filters.sortBy, fetchFilteredEvents]);

  const updateFilter = useCallback(<K extends keyof ServerFilterOptions>(
    key: K, 
    value: ServerFilterOptions[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const loadMore = useCallback(() => {
    if (data?.pagination.hasMore && !isLoading) {
      setFilters(prev => ({ ...prev, page: prev.page! + 1 }));
      fetchFilteredEvents(false);
    }
  }, [data?.pagination.hasMore, isLoading, fetchFilteredEvents]);

  const refetch = useCallback(() => {
    fetchFilteredEvents(true);
  }, [fetchFilteredEvents]);

  return {
    data,
    isLoading,
    error,
    filters,
    updateFilter,
    resetFilters,
    loadMore,
    refetch
  };
}
