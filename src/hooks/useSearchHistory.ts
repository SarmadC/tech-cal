'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SearchHistoryItem {
  id: string;
  term: string;
  location: string;
  dateRange: { start: Date | null; end: Date | null };
  timestamp: number;
}

interface UseSearchHistoryOptions {
  maxItems?: number;
  expirationDays?: number;
  respectAnalyticsConsent?: boolean;
}

const STORAGE_KEY = 'tech-cal-search-history';
const DEFAULT_MAX_ITEMS = 10;
const DEFAULT_EXPIRATION_DAYS = 30;

export function useSearchHistory({
  maxItems = DEFAULT_MAX_ITEMS,
  expirationDays = DEFAULT_EXPIRATION_DAYS,
  respectAnalyticsConsent = true
}: UseSearchHistoryOptions = {}) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SearchHistoryItem[] = JSON.parse(stored);

        // Filter out expired items
        const now = Date.now();
        const expirationMs = expirationDays * 24 * 60 * 60 * 1000;
        const valid = parsed.filter(item => {
          return (now - item.timestamp) < expirationMs;
        });

        // Parse dates from JSON
        const withDates = valid.map(item => ({
          ...item,
          dateRange: {
            start: item.dateRange.start ? new Date(item.dateRange.start) : null,
            end: item.dateRange.end ? new Date(item.dateRange.end) : null
          }
        }));

        setHistory(withDates);
      }
    } catch (error) {
      console.error('[useSearchHistory] Failed to load history:', error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [expirationDays]);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
      } catch (error) {
        console.error('[useSearchHistory] Failed to save history:', error);
      }
    }
  }, [history, isLoading]);

  // Add a search to history
  const addSearch = useCallback((
    term: string,
    location: string,
    dateRange: { start: Date | null; end: Date | null }
  ) => {
    // Skip if analytics consent is required and not given
    if (respectAnalyticsConsent) {
      const consent = localStorage.getItem('analytics_consent');
      if (!consent || consent !== 'true') {
        return; // Don't store if no consent
      }
    }

    // Skip empty searches
    if (!term.trim() && !location.trim() && !dateRange.start && !dateRange.end) {
      return;
    }

    const newItem: SearchHistoryItem = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      term: term.trim(),
      location: location.trim(),
      dateRange,
      timestamp: Date.now()
    };

    setHistory(prev => {
      // Check for duplicate (same term and location)
      const isDuplicate = prev.some(
        item => item.term === newItem.term && item.location === newItem.location
      );

      if (isDuplicate) {
        // Move existing item to top by removing and re-adding
        const filtered = prev.filter(
          item => !(item.term === newItem.term && item.location === newItem.location)
        );
        return [newItem, ...filtered].slice(0, maxItems);
      }

      // Add new item to top, limit to maxItems
      return [newItem, ...prev].slice(0, maxItems);
    });
  }, [maxItems, respectAnalyticsConsent]);

  // Remove a specific search from history
  const removeSearch = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('[useSearchHistory] Failed to clear history:', error);
    }
  }, []);

  // Get formatted display text for a history item
  const getDisplayText = useCallback((item: SearchHistoryItem): string => {
    const parts: string[] = [];

    if (item.term) parts.push(`"${item.term}"`);
    if (item.location) parts.push(`in ${item.location}`);

    if (item.dateRange.start || item.dateRange.end) {
      const formatDate = (date: Date) =>
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (item.dateRange.start && item.dateRange.end) {
        parts.push(`${formatDate(item.dateRange.start)} - ${formatDate(item.dateRange.end)}`);
      } else if (item.dateRange.start) {
        parts.push(`from ${formatDate(item.dateRange.start)}`);
      } else if (item.dateRange.end) {
        parts.push(`until ${formatDate(item.dateRange.end)}`);
      }
    }

    return parts.join(' ') || 'Recent search';
  }, []);

  return {
    history,
    isLoading,
    addSearch,
    removeSearch,
    clearHistory,
    getDisplayText,
    hasHistory: history.length > 0
  };
}
