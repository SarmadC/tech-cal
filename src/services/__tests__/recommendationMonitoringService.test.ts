/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationMonitoringService } from '../recommendationMonitoringService';
import { MONITORING_CONFIG } from '@/config/monitoringConstants';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};

describe('RecommendationMonitoringService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.from.mockReset();
    mockSupabaseClient.from.mockReturnThis();
  });

  describe('getMonitoringSummary', () => {
    it('should return null when no analytics data', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        const chain = {
          select: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        };
        return chain;
      });

      const result = await RecommendationMonitoringService.getMonitoringSummary(
        mockSupabaseClient as any,
        7
      );

      expect(result).toBeNull();
    });

    it('should return monitoring summary with analytics data', async () => {
      const mockAnalytics = [
        {
          user_id: 'user1',
          event_id: 'event1',
          metric_type: 'click',
          algorithm_version: 'v2.0.0',
          measured_at: '2023-01-01T00:00:00Z'
        },
        {
          user_id: 'user1',
          event_id: 'event2',
          metric_type: 'click',
          algorithm_version: 'v2.0.0',
          measured_at: '2023-01-01T01:00:00Z'
        }
      ];

      const mockScores = [
        {
          event_id: 'event1',
          overall_score: 85,
          confidence: 0.9,
          scoring_triggers: ['type_pref_gate', 'beginner_boost'],
          algorithm_version: 'v2.0.0'
        },
        {
          event_id: 'event2',
          overall_score: 45,
          confidence: 0.7,
          scoring_triggers: ['networking_goal'],
          algorithm_version: 'v2.0.0'
        }
      ];

      // Mock analytics query
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'career_impact_analytics') {
          return {
            select: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockResolvedValue({ data: mockAnalytics, error: null })
          };
        }

        if (table === 'user_event_scores') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            not: vi.fn().mockResolvedValue({
              data: mockScores.map(s => ({
                event_id: s.event_id,
                overall_score: s.overall_score,
                confidence: s.confidence,
                metadata: { scoringTriggers: s.scoring_triggers },
                algorithm_version: s.algorithm_version
              })),
              error: null
            })
          };
        }

        return mockSupabaseClient;
      });

      const result = await RecommendationMonitoringService.getMonitoringSummary(
        mockSupabaseClient as any,
        7
      );

      expect(result).toBeDefined();
      expect(result?.totalEvents).toBe(2);
      expect(result?.totalInteractions).toBe(2);
      expect(result?.scoreRanges).toHaveLength(MONITORING_CONFIG.SCORE_RANGES.length);
      expect(result?.topTriggers.length).toBeGreaterThan(0);
      expect(result?.recommendations).toBeDefined();
    });
  });

  describe('getQuickMetrics', () => {
    it('should return null when no analytics data', async () => {
      mockSupabaseClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      }));

      const result = await RecommendationMonitoringService.getQuickMetrics(
        mockSupabaseClient as any,
        1
      );

      expect(result).toBeNull();
    });

    it('should return quick metrics with data', async () => {
      const mockAnalytics = [
        {
          user_id: 'user1',
          event_id: 'event1',
          metric_type: 'click',
          algorithm_version: 'v2.0.0',
          measured_at: '2023-01-01T00:00:00Z'
        }
      ];

      const mockScores = [
        {
          event_id: 'event1',
          overall_score: 80,
          confidence: 0.9,
          metadata: { scoringTriggers: ['trigger_a'] },
          algorithm_version: 'v2.0.0'
        }
      ];

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'event_analytics') {
          const analyticsQuery: any = {
            select: vi.fn(() => analyticsQuery),
            gte: vi.fn(() => analyticsQuery),
            lte: vi.fn(() => analyticsQuery),
            order: vi.fn(() => analyticsQuery),
            limit: vi.fn(() => Promise.resolve({ data: mockAnalytics, error: null }))
          };
          return analyticsQuery;
        }

        if (table === 'user_event_scores') {
          const scoreQuery: any = {
            select: vi.fn(() => scoreQuery),
            in: vi.fn(() => scoreQuery),
            not: vi.fn(() => Promise.resolve({ data: mockScores, error: null }))
          };
          return scoreQuery;
        }

        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              not: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        };
      });

      const result = await RecommendationMonitoringService.getQuickMetrics(
        mockSupabaseClient as any,
        1
      );

      expect(result).toBeDefined();
      expect(result?.totalEvents).toBe(1);
      expect(result?.totalClicks).toBe(1);
      expect(result?.ctr).toBe(1);
      expect(result?.topTriggers).toBeDefined();
    });
  });
});