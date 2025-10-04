// src/services/__tests__/eventServices.budget.test.ts

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventService } from '../eventServices';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventFilters } from '@/types';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock transformers
vi.mock('@/utils/transformers', () => ({
  eventDetailedTransformer: {
    toApp: vi.fn((event) => ({
      id: event.id,
      title: event.title || 'Untitled Event',
      startTime: event.start_time || new Date().toISOString(),
    })),
  },
}));

describe('EventService - Budget Filtering', () => {
  let mockRpc: ReturnType<typeof vi.fn>;
  let mockSupabase: any;

  beforeEach(() => {
    mockRpc = vi.fn().mockResolvedValue({
      data: { events: [], total_count: 0 },
      error: null,
    });

    mockSupabase = {
      rpc: mockRpc,
    };

    vi.clearAllMocks();
  });

  describe('USD Currency Gate - RPC Parameter', () => {
    it('should pass p_currency as USD when budget is free-only', async () => {
      const filters: EventFilters = {
        budget: 'free-only',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'free-only',
        p_currency: 'USD',
      }));
    });

    it('should pass p_currency as USD when budget is low', async () => {
      const filters: EventFilters = {
        budget: 'low',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'low',
        p_currency: 'USD',
      }));
    });

    it('should pass p_currency as USD when budget is moderate', async () => {
      const filters: EventFilters = {
        budget: 'moderate',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'moderate',
        p_currency: 'USD',
      }));
    });

    it('should pass p_currency as USD when budget is high', async () => {
      const filters: EventFilters = {
        budget: 'high',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'high',
        p_currency: 'USD',
      }));
    });

    it('should pass p_currency as USD when budget is unlimited', async () => {
      const filters: EventFilters = {
        budget: 'unlimited',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'unlimited',
        p_currency: 'USD',
      }));
    });

    it('should pass p_currency as null when budget is "all"', async () => {
      const filters: EventFilters = {
        budget: 'all',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'all',
        p_currency: null,
      }));
    });

    it('should pass p_currency as null when budget is undefined', async () => {
      const filters: EventFilters = {};

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'all',
        p_currency: null,
      }));
    });
  });

  describe('Budget Tier Values', () => {
    it('should pass correct budget tier value for each tier', async () => {
      const tiers: Array<'free-only' | 'low' | 'moderate' | 'high' | 'unlimited' | 'all'> = [
        'free-only',
        'low',
        'moderate',
        'high',
        'unlimited',
        'all',
      ];

      for (const tier of tiers) {
        vi.clearAllMocks();

        const filters: EventFilters = { budget: tier };
        await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

        expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
          p_budget: tier,
        }));
      }
    });
  });

  describe('Currency Gate Logic', () => {
    it('should gate to USD for all non-"all" budget tiers', async () => {
      const usdTiers: Array<'free-only' | 'low' | 'moderate' | 'high' | 'unlimited'> = [
        'free-only',
        'low',
        'moderate',
        'high',
        'unlimited',
      ];

      for (const tier of usdTiers) {
        vi.clearAllMocks();

        const filters: EventFilters = { budget: tier };
        await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

        expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
          p_currency: 'USD',
        }));
      }
    });

    it('should NOT gate to USD for "all" tier', async () => {
      const filters: EventFilters = { budget: 'all' };
      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_currency: null,
      }));
    });
  });

  describe('Default Behavior', () => {
    it('should default to budget="all" and currency=null when no budget filter provided', async () => {
      const filters: EventFilters = {};

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'all',
        p_currency: null,
      }));
    });
  });

  describe('Integration with Other Filters', () => {
    it('should combine budget filter with category filter', async () => {
      const filters: EventFilters = {
        budget: 'low',
        categories: ['type1', 'type2'],
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'low',
        p_currency: 'USD',
        p_categories: ['type1', 'type2'],
      }));
    });

    it('should combine budget filter with search term', async () => {
      const filters: EventFilters = {
        budget: 'moderate',
        searchTerm: 'react',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'moderate',
        p_currency: 'USD',
        p_search_term: 'react',
      }));
    });

    it('should combine budget filter with format filter', async () => {
      const filters: EventFilters = {
        budget: 'high',
        format: 'in-person',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'high',
        p_currency: 'USD',
        p_event_format: 'in-person',
      }));
    });
  });

  describe('RPC Call Structure', () => {
    it('should include all required RPC parameters', async () => {
      const filters: EventFilters = {
        budget: 'low',
      };

      await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);

      expect(mockRpc).toHaveBeenCalledWith('filter_events', {
        p_search_term: null,
        p_categories: null,
        p_start_date: null,
        p_end_date: null,
        p_event_format: 'all',
        p_budget: 'low',
        p_currency: 'USD',
        p_cost: 'all',
        p_popularity: 'all',
        p_duration: 'all',
        p_my_network: false,
        p_recommended: false,
        p_page_num: 1,
        p_page_size: 100,
        p_sort_by: 'date',
      });
    });
  });

  describe('Error Handling', () => {
    it('should call RPC with correct parameters even when it fails', async () => {
      const mockError = new Error('RPC failed');
      mockRpc.mockResolvedValueOnce({ data: null, error: mockError });

      // Add from method for fallback
      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      const filters: EventFilters = {
        budget: 'low',
      };

      try {
        await EventService.getEventsWithRPC(filters, mockSupabase as unknown as SupabaseClient, 1, 100);
      } catch (_error) {
        // Error is expected due to fallback requiring full mock
      }

      // Verify RPC was still called with correct params
      expect(mockRpc).toHaveBeenCalledWith('filter_events', expect.objectContaining({
        p_budget: 'low',
        p_currency: 'USD',
      }));
    });
  });
});
