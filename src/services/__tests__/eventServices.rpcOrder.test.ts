// src/services/__tests__/eventServices.rpcOrder.test.ts

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
      title: event.title,
      startTime: event.start_time,
    })),
  },
}));

describe('EventService - RPC Order Preservation', () => {
  let mockSupabase: any;
  let getEventsByIdsSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore the spy if it exists
    if (getEventsByIdsSpy) {
      getEventsByIdsSpy.mockRestore();
    }
  });

  describe('Order Preservation During Hydration', () => {
    it('should preserve RPC-returned order after hydration', async () => {
      // RPC returns IDs in this specific order (e.g., sorted by score)
      const rpcOrderedIds = ['event3', 'event1', 'event5', 'event2', 'event4'];
      const rpcData = rpcOrderedIds.map((id, _idx) => ({
        id,
        total_count: 5,
      }));

      // getEventsByIds might return events in a different order (e.g., database order)
      const hydratedEvents = [
        { id: 'event1', title: 'Event 1', startTime: '2024-01-01T10:00:00Z' },
        { id: 'event2', title: 'Event 2', startTime: '2024-01-02T10:00:00Z' },
        { id: 'event3', title: 'Event 3', startTime: '2024-01-03T10:00:00Z' },
        { id: 'event4', title: 'Event 4', startTime: '2024-01-04T10:00:00Z' },
        { id: 'event5', title: 'Event 5', startTime: '2024-01-05T10:00:00Z' },
      ];

      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
      };

      // Spy on getEventsByIds to return events in database order
      getEventsByIdsSpy = vi.spyOn(EventService, 'getEventsByIds').mockResolvedValue(hydratedEvents as any);

      const filters: EventFilters = { budget: 'low' };
      const result = await EventService.getEventsWithRPC(
        filters,
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      // Verify events are returned in the RPC's original order, not hydration order
      expect(result.events).toHaveLength(5);
      expect(result.events[0].id).toBe('event3'); // RPC order: first
      expect(result.events[1].id).toBe('event1'); // RPC order: second
      expect(result.events[2].id).toBe('event5'); // RPC order: third
      expect(result.events[3].id).toBe('event2'); // RPC order: fourth
      expect(result.events[4].id).toBe('event4'); // RPC order: fifth
    });

    it('should preserve order when hydration returns events in reverse order', async () => {
      const rpcOrderedIds = ['event1', 'event2', 'event3'];
      const rpcData = rpcOrderedIds.map(id => ({ id, total_count: 3 }));

      // Hydration returns in reverse order
      const hydratedEvents = [
        { id: 'event3', title: 'Event 3', startTime: '2024-01-03T10:00:00Z' },
        { id: 'event2', title: 'Event 2', startTime: '2024-01-02T10:00:00Z' },
        { id: 'event1', title: 'Event 1', startTime: '2024-01-01T10:00:00Z' },
      ];

      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
      };

      getEventsByIdsSpy = vi.spyOn(EventService, 'getEventsByIds').mockResolvedValue(hydratedEvents as any);

      const result = await EventService.getEventsWithRPC(
        {},
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      expect(result.events[0].id).toBe('event1'); // RPC order maintained
      expect(result.events[1].id).toBe('event2');
      expect(result.events[2].id).toBe('event3');
    });

    it('should preserve order when hydration returns partial results', async () => {
      const rpcOrderedIds = ['event1', 'event2', 'event3', 'event4'];
      const rpcData = rpcOrderedIds.map(id => ({ id, total_count: 4 }));

      // Hydration only returns 3 events (one missing)
      const hydratedEvents = [
        { id: 'event4', title: 'Event 4', startTime: '2024-01-04T10:00:00Z' },
        { id: 'event1', title: 'Event 1', startTime: '2024-01-01T10:00:00Z' },
        { id: 'event2', title: 'Event 2', startTime: '2024-01-02T10:00:00Z' },
      ];

      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
      };

      getEventsByIdsSpy = vi.spyOn(EventService, 'getEventsByIds').mockResolvedValue(hydratedEvents as any);

      const result = await EventService.getEventsWithRPC(
        {},
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      expect(result.events).toHaveLength(3);
      expect(result.events[0].id).toBe('event1'); // First in RPC order (that exists)
      expect(result.events[1].id).toBe('event2'); // Second in RPC order (that exists)
      expect(result.events[2].id).toBe('event4'); // Fourth in RPC order (that exists)
    });

    it('should handle single event correctly', async () => {
      const rpcData = [{ id: 'event1', total_count: 1 }];
      const hydratedEvents = [
        { id: 'event1', title: 'Event 1', startTime: '2024-01-01T10:00:00Z' },
      ];

      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
      };

      getEventsByIdsSpy = vi.spyOn(EventService, 'getEventsByIds').mockResolvedValue(hydratedEvents as any);

      const result = await EventService.getEventsWithRPC(
        {},
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      expect(result.events).toHaveLength(1);
      expect(result.events[0].id).toBe('event1');
    });

    it('should handle empty results', async () => {
      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const result = await EventService.getEventsWithRPC(
        {},
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      expect(result.events).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should preserve order for large result sets', async () => {
      // Generate 100 events in random RPC order
      const rpcOrderedIds = Array.from({ length: 100 }, (_, i) => `event${100 - i}`);
      const rpcData = rpcOrderedIds.map(id => ({ id, total_count: 100 }));

      // Hydration returns them in sequential order
      const hydratedEvents = Array.from({ length: 100 }, (_, i) => ({
        id: `event${i + 1}`,
        title: `Event ${i + 1}`,
        startTime: `2024-01-01T${String(i).padStart(2, '0')}:00:00Z`,
      }));

      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
      };

      getEventsByIdsSpy = vi.spyOn(EventService, 'getEventsByIds').mockResolvedValue(hydratedEvents as any);

      const result = await EventService.getEventsWithRPC(
        {},
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      expect(result.events).toHaveLength(100);
      // Verify first, middle, and last elements maintain RPC order
      expect(result.events[0].id).toBe('event100'); // RPC first
      expect(result.events[49].id).toBe('event51'); // RPC middle
      expect(result.events[99].id).toBe('event1'); // RPC last
    });
  });

  describe('Total Count Extraction', () => {
    it('should extract total_count from first RPC result', async () => {
      const rpcData = [
        { id: 'event1', total_count: 42 },
        { id: 'event2', total_count: 42 },
      ];

      const hydratedEvents = [
        { id: 'event1', title: 'Event 1', startTime: '2024-01-01T10:00:00Z' },
        { id: 'event2', title: 'Event 2', startTime: '2024-01-02T10:00:00Z' },
      ];

      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
      };

      getEventsByIdsSpy = vi.spyOn(EventService, 'getEventsByIds').mockResolvedValue(hydratedEvents as any);

      const result = await EventService.getEventsWithRPC(
        {},
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      expect(result.totalCount).toBe(42);
    });

    it('should default to 0 when total_count is missing', async () => {
      const rpcData = [{ id: 'event1' }]; // No total_count

      const hydratedEvents = [
        { id: 'event1', title: 'Event 1', startTime: '2024-01-01T10:00:00Z' },
      ];

      mockSupabase = {
        rpc: vi.fn().mockResolvedValue({ data: rpcData, error: null }),
      };

      getEventsByIdsSpy = vi.spyOn(EventService, 'getEventsByIds').mockResolvedValue(hydratedEvents as any);

      const result = await EventService.getEventsWithRPC(
        {},
        mockSupabase as unknown as SupabaseClient,
        1,
        100
      );

      expect(result.totalCount).toBe(0);
    });
  });
});
