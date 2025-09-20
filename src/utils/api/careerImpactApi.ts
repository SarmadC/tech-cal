/**
 * Career Impact API Client
 * Provides typed client functions for career impact API endpoints
 */

import React from 'react';
import { CareerImpactCalculationOptions } from '@/types/careerImpact';
import { Event } from '@/types';

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ScoreApiResponse {
  eventId: string;
  careerImpact: {
    overall: number;
    confidence: number;
    category: string;
    components?: Record<string, number>;
    explanation?: {
      careerImpactCategory: string;
      reasons: string[];
      matchedSkills: string[];
      speakerHighlights: string[];
      confidenceFactors: string[];
    };
  };
  cached: boolean;
  processingTimeMs: number;
}

export interface BatchScoreApiResponse {
  scores: Record<string, {
    overall: number;
    confidence: number;
    category: string;
    components?: Record<string, number>;
    explanation?: {
      careerImpactCategory: string;
      reasons: string[];
      matchedSkills: string[];
      speakerHighlights: string[];
      confidenceFactors: string[];
    };
  }>;
  events?: Record<string, Event>; // Event data if requested
  stats: {
    total: number;
    successful: number;
    errors: number;
    cached: number;
    processingTimeMs: number;
  };
  errors?: Array<{ eventId: string; error: string }>;
}

export interface AnalyticsApiResponse {
  overview: {
    averageScore: number;
    totalEventsAnalyzed: number;
    highImpactEvents: number;
    improvementTrend: 'improving' | 'stable' | 'declining';
  };
  breakdown: {
    byCategory: Array<{
      category: string;
      averageScore: number;
      eventCount: number;
    }>;
    byTimeframe: Array<{
      period: string;
      averageScore: number;
      eventCount: number;
    }>;
  };
  recommendations: Array<{
    type: 'skill_gap' | 'career_stage' | 'networking' | 'industry';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface CacheStatsApiResponse {
  stats: {
    totalKeys: number;
    hitRate: number;
    memoryUsage?: string;
    cacheType: string;
  };
  health: {
    healthy: boolean;
    lastChecked: string;
  };
}

/**
 * Career Impact API Client Class
 */
export class CareerImpactApiClient {
  private static readonly BASE_URL = '/api/career-impact';

  /**
   * Get career impact score for a single event
   */
  static async getScore(
    eventId: string,
    options: {
      lite?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<ApiResponse<ScoreApiResponse>> {
    try {
      const params = new URLSearchParams({
        eventId,
        ...(options.lite && { lite: 'true' }),
        ...(options.skipCache && { skipCache: 'true' })
      });

      const response = await fetch(`${this.BASE_URL}/score?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Calculate career impact score with POST (for complex options)
   */
  static async calculateScore(
    eventId: string,
    options?: CareerImpactCalculationOptions
  ): Promise<ApiResponse<ScoreApiResponse>> {
    try {
      const response = await fetch(`${this.BASE_URL}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, options }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get career impact scores for multiple events
   */
  static async getBatchScores(
    eventIds: string[],
    options: {
      includeEvents?: boolean;
      calculationOptions?: CareerImpactCalculationOptions;
    } = {}
  ): Promise<ApiResponse<BatchScoreApiResponse>> {
    try {
      const response = await fetch(`${this.BASE_URL}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventIds,
          includeEvents: options.includeEvents,
          options: options.calculationOptions,
        }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get career impact analytics
   */
  static async getAnalytics(options: {
    timeframe?: number; // days
    limit?: number;
  } = {}): Promise<ApiResponse<AnalyticsApiResponse>> {
    try {
      const params = new URLSearchParams();
      if (options.timeframe) params.set('timeframe', options.timeframe.toString());
      if (options.limit) params.set('limit', options.limit.toString());

      const response = await fetch(`${this.BASE_URL}/analytics?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<ApiResponse<CacheStatsApiResponse>> {
    try {
      const response = await fetch(`${this.BASE_URL}/cache`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Invalidate cache entries
   */
  static async invalidateCache(
    type: 'profile' | 'event' | 'all',
    eventId?: string
  ): Promise<ApiResponse<{ type: string; invalidatedCount: number; timestamp: string }>> {
    try {
      const response = await fetch(`${this.BASE_URL}/cache`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          ...(eventId && { id: eventId }),
        }),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

/**
 * React hook for career impact score
 */
export function useCareerImpactScore(eventId: string | null, options: { lite?: boolean } = {}) {
  const [data, setData] = React.useState<ScoreApiResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!eventId) {
      setData(null);
      return;
    }

    let cancelled = false;

    async function fetchScore() {
      setLoading(true);
      setError(null);

      if (!eventId) return;
      const result = await CareerImpactApiClient.getScore(eventId, options);

      if (!cancelled) {
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch career impact score');
        }
        setLoading(false);
      }
    }

    fetchScore();

    return () => {
      cancelled = true;
    };
  }, [eventId, options]);

  return { data, loading, error };
}

/**
 * React hook for career impact analytics
 */
export function useCareerImpactAnalytics(options: { timeframe?: number } = {}) {
  const [data, setData] = React.useState<AnalyticsApiResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);

      const result = await CareerImpactApiClient.getAnalytics(options);

      if (!cancelled) {
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error || 'Failed to fetch career impact analytics');
        }
        setLoading(false);
      }
    }

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [options]);

  const refetch = React.useCallback(async () => {
    if (!loading) {
      setLoading(true);
      setError(null);

      const result = await CareerImpactApiClient.getAnalytics(options);

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to fetch career impact analytics');
      }
      setLoading(false);
    }
  }, [loading, options]);

  return { data, loading, error, refetch };
}

