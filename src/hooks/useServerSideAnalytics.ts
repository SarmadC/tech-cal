// src/hooks/useServerSideAnalytics.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ServerAnalyticsOptions {
  includeRecommendations?: boolean;
  eventLimit?: number;
  enabled?: boolean;
}

interface AnalyticsData {
  analytics: unknown;
  recommendations?: unknown[];
  stats: {
    processingTimeMs: number;
    eventsProcessed: number;
    trackedEventsCount: number;
  };
}

interface UseServerSideAnalyticsResult {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for server-side analytics generation
 * Moves heavy computation from client to server
 */
export function useServerSideAnalytics(
  options: ServerAnalyticsOptions = {}
): UseServerSideAnalyticsResult {
  const { user } = useAuth();
  const {
    includeRecommendations = true,
    eventLimit = 50,
    enabled = true
  } = options;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user || !enabled) return;

    setIsLoading(true);
    setError(null);

    // Retry logic with exponential backoff for rate limits
    const maxRetries = 3;
    let lastError: unknown;
    const timeoutIds: NodeJS.Timeout[] = [];

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch('/api/dashboard/analytics', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              includeRecommendations,
              eventLimit
            })
          });

          if (!response.ok) {
            if (response.status === 429) {
              if (attempt < maxRetries) {
                const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
                console.warn(`Rate limited, retrying in ${Math.round(delay/1000 * 10)/10}s (attempt ${attempt + 2}/${maxRetries + 1})`);
                
                // Store timeout ID for cleanup
                const timeoutId = setTimeout(() => {}, delay);
                timeoutIds.push(timeoutId);
                
                await new Promise(resolve => {
                  const id = setTimeout(resolve, delay);
                  timeoutIds.push(id);
                });
                continue; // Retry
              }
              throw new Error('Too many requests. Please wait a moment and try again.');
            }
            if (response.status === 401) {
              throw new Error('Authentication required. Please sign in again.');
            }
            throw new Error(`Server error: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Failed to generate analytics');
          }

          setData(result.data);
          return; // Success, exit retry loop

        } catch (err) {
          lastError = err;

          // Only retry on rate limit errors
          const isRateLimit = err instanceof Error && err.message.includes('Too many requests');
          if (!isRateLimit || attempt === maxRetries) {
            break; // Don't retry non-rate-limit errors or if max retries reached
          }
        }
      }

      // Handle final error
      const errorMessage = lastError instanceof Error ? lastError.message : 'Failed to load analytics';
      setError(errorMessage);
      console.error('Server-side analytics error:', lastError);
    } finally {
      setIsLoading(false);
      // Clean up any pending timeouts
      timeoutIds.forEach(id => clearTimeout(id));
    }
  }, [user, includeRecommendations, eventLimit, enabled]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const refetch = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    isLoading,
    error,
    refetch
  };
}
