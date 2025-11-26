'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from './useDebounce';

export interface LocationSuggestion {
  displayText: string;
  city: string;
  state: string;
  country: string;
  eventCount: number;
}

interface LocationSuggestionsResponse {
  suggestions: LocationSuggestion[];
  query: string;
}

export interface UseLocationSuggestionsProps {
  searchTerm: string;
  debounceMs?: number;
  enabled?: boolean;
}

export function useLocationSuggestions({
  searchTerm,
  debounceMs = 300,
  enabled = true
}: UseLocationSuggestionsProps) {
  const [isTyping, setIsTyping] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  // Track typing state
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setIsTyping(true);
    } else {
      setIsTyping(false);
    }
  }, [searchTerm, debouncedSearchTerm]);

  const { data, isLoading, error } = useQuery<LocationSuggestionsResponse>({
    queryKey: ['locationSuggestions', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 2) {
        return { suggestions: [], query: debouncedSearchTerm };
      }

      const response = await fetch(
        `/api/locations/suggestions?q=${encodeURIComponent(debouncedSearchTerm)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch location suggestions');
      }

      return response.json();
    },
    enabled: enabled && debouncedSearchTerm.length >= 2,
    staleTime: 1000 * 60 * 60, // 1 hour - locations don't change frequently
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });

  return {
    suggestions: data?.suggestions || [],
    isLoading: isLoading || isTyping,
    error: error?.message,
    hasResults: (data?.suggestions?.length || 0) > 0
  };
}
