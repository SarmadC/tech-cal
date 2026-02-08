'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from './useDebounce';
import { getLogoUrlFromInput } from '@/utils/logoUtils';
import type { SearchSuggestion, ApiResponse } from '@/types';

interface UseRemoteSearchSuggestionsProps {
  searchTerm: string;
  maxSuggestions?: number;
  debounceMs?: number;
}

export function useRemoteSearchSuggestions({
  searchTerm,
  maxSuggestions = 6,
  debounceMs = 250,
}: UseRemoteSearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  useEffect(() => {
    const term = debouncedSearchTerm.trim();
    if (term.length < 2) {
      setSuggestions((prev) => (prev.length ? [] : prev));
      setIsLoading((prev) => (prev ? false : prev));
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    (async () => {
      try {
        const response = await fetch('/api/events/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term, limit: maxSuggestions }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const result = (await response.json()) as ApiResponse<{ suggestions: SearchSuggestion[] }>;
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch suggestions');
        }

        const suggestions = (result.data?.suggestions ?? []).map((suggestion) => ({
          ...suggestion,
          organizerLogoUrl: getLogoUrlFromInput(suggestion.organizerLogoUrl, suggestion.organizer),
        }));

        setSuggestions(suggestions);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.warn('[useRemoteSearchSuggestions] Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [debouncedSearchTerm, maxSuggestions]);

  return { suggestions, isLoading, searchTerm: debouncedSearchTerm };
}
