// src/services/__tests__/userEventService.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserEventService } from '../userEventService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = () => {
  type QueryResult = { data: unknown; error: unknown };
  let thenPromise: Promise<QueryResult> = Promise.resolve({ data: [], error: null });

  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) => {
      return thenPromise.then(onFulfilled, onRejected);
    }),
    // Helper to set what the then() promise resolves to
    __setThenValue: (value: QueryResult) => {
      thenPromise = Promise.resolve(value);
    },
    // Helper to set what the then() promise rejects with
    __setThenError: (error: unknown) => {
      thenPromise = Promise.reject(error);
    },
    rpc: vi.fn(),
  };
};

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock transformers
vi.mock('@/utils/transformers', () => ({
  trackedEventTransformer: {
    toApp: vi.fn((trackedEvent) => ({
      trackingId: trackedEvent.id,
      userId: trackedEvent.user_id,
      eventId: trackedEvent.event_id,
      status: trackedEvent.status,
      notes: trackedEvent.notes,
      trackedAt: trackedEvent.created_at,
      event: trackedEvent.events ? {
        id: trackedEvent.events.id,
        title: trackedEvent.events.title,
        startTime: trackedEvent.events.start_time,
      } : null,
    })),
  },
  eventTransformer: {
    toApp: vi.fn((event) => ({
      id: event.id,
      title: event.title || 'Untitled Event',
      startTime: event.start_time || new Date().toISOString(),
    })),
  },
  enrichEvent: vi.fn((event, options) => ({
    ...event,
    ...(options.eventType && { color: options.eventType.color, category: options.eventType }),
    ...(options.isTracked !== undefined && { isTracked: options.isTracked }),
  })),
}));

describe('UserEventService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('trackEvent', () => {
    it('should track an event successfully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, is_new_tracking: true },
        error: null,
      });

      await expect(UserEventService.trackEvent(
        'user1',
        'event1',
        'attending',
        '',
        mockSupabase as unknown as SupabaseClient
      )).resolves.toBeUndefined();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('track_event_and_update_profile', {
        p_user_id: 'user1',
        p_event_id: 'event1',
        p_status: 'attending',
        p_notes: '',
      });
    });

    it('should track an event with notes', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, is_new_tracking: false },
        error: null,
      });

      await expect(UserEventService.trackEvent(
        'user1',
        'event1',
        'attending',
        'Looking forward to this event',
        mockSupabase as unknown as SupabaseClient
      )).resolves.toBeUndefined();

      expect(mockSupabase.rpc).toHaveBeenLastCalledWith('track_event_and_update_profile', {
        p_user_id: 'user1',
        p_event_id: 'event1',
        p_status: 'attending',
        p_notes: 'Looking forward to this event',
      });
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database constraint violation');
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(UserEventService.trackEvent(
        'user1',
        'event1',
        'attending',
        '',
        mockSupabase as unknown as SupabaseClient
      )).rejects.toThrow('Failed to track event.');
    });

    it('should handle duplicate tracking attempts', async () => {
      const mockError = { code: '23505', message: 'duplicate key value violates unique constraint' };
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(UserEventService.trackEvent(
        'user1',
        'event1',
        'attending',
        '',
        mockSupabase as unknown as SupabaseClient
      )).rejects.toThrow('Failed to track event.');
    });
  });

  describe('untrackEvent', () => {
    it('should untrack an event successfully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: true, external_calendar_event_id: 'cal-1', external_provider: 'google' },
        error: null,
      });

      const result = await UserEventService.untrackEvent('user1', 'event1', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('untrack_event_and_update_profile', {
        p_user_id: 'user1',
        p_event_id: 'event1'
      });
      expect(result).toEqual({
        external_calendar_event_id: 'cal-1',
        external_provider: 'google'
      });
    });

    it('should handle event not found', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: { success: false, message: 'Event not found' },
        error: null,
      });

      await expect(UserEventService.untrackEvent('user1', 'nonexistent', mockSupabase as unknown as SupabaseClient))
        .rejects.toThrow('Failed to untrack event.');
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(UserEventService.untrackEvent('user1', 'event1', mockSupabase as unknown as SupabaseClient))
        .rejects.toThrow('Failed to untrack event.');
    });
  });

  describe('getTrackedEvents', () => {
    it('should fetch tracked events with details', async () => {
      const mockTrackedEvents = [
        {
          id: 'tracking1',
          user_id: 'user1',
          event_id: 'event1',
          status: 'attending',
          notes: '',
          created_at: '2024-01-01T10:00:00Z',
          events: {
            id: 'event1',
            title: 'Test Event',
            start_time: '2024-01-01T10:00:00Z',
            event_type: {
              id: 'type1',
              name: 'Conference',
              color: '#3B82F6',
            },
          },
        },
      ];

      mockSupabase.__setThenValue({
        data: mockTrackedEvents,
        error: null,
      });

      const result = await UserEventService.getTrackedEvents('user1', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_events');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user1');
      expect(result).toHaveLength(1);
    });

    it('should handle empty results', async () => {
      mockSupabase.__setThenValue({
        data: [],
        error: null,
      });

      const result = await UserEventService.getTrackedEvents('user1', mockSupabase as unknown as SupabaseClient);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      mockSupabase.__setThenValue({
        data: null,
        error: mockError,
      });

      await expect(UserEventService.getTrackedEvents('user1', mockSupabase as unknown as SupabaseClient))
        .rejects.toThrow('Failed to fetch tracked events.');
    });
  });

  describe('getLightweightTrackedEvents', () => {
    it('should fetch lightweight tracked events', async () => {
      const mockTrackedEvents = [
        {
          id: 'tracking1',
          user_id: 'user1',
          event_id: 'event1',
          status: 'attending',
          notes: '',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      mockSupabase.__setThenValue({
        data: mockTrackedEvents,
        error: null,
      });

      const result = await UserEventService.getLightweightTrackedEvents('user1', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_events');
      expect(mockSupabase.select).toHaveBeenCalledWith(expect.stringContaining('events ('));
      expect(result).toHaveLength(1);
    });
  });

  describe('getAllTrackedEventIds', () => {
    it('should fetch all tracked event IDs for a user', async () => {
      const mockTrackedEvents = [
        { event_id: 'event1' },
        { event_id: 'event2' },
        { event_id: 'event3' },
      ];

      mockSupabase.__setThenValue({
        data: mockTrackedEvents,
        error: null,
      });

      const result = await UserEventService.getAllTrackedEventIds('user1', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_events');
      expect(mockSupabase.select).toHaveBeenCalledWith('event_id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user1');
      expect(result).toEqual(['event1', 'event2', 'event3']);
    });

    it('should handle empty results', async () => {
      mockSupabase.__setThenValue({
        data: [],
        error: null,
      });

      const result = await UserEventService.getAllTrackedEventIds('user1', mockSupabase as unknown as SupabaseClient);

      expect(result).toEqual([]);
    });
  });

  // TODO: Add tests for updateEventStatus and getTrackedEventsByStatus methods when they are implemented

  describe('error handling', () => {
    it('should capture exceptions with Sentry', async () => {
      const mockError = new Error('Test error');
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { captureException } = await import('@sentry/nextjs');

      await expect(UserEventService.trackEvent('user1', 'event1', 'attending', '', mockSupabase as unknown as SupabaseClient))
        .rejects.toThrow('Failed to track event.');

      expect(captureException).toHaveBeenCalledWith(mockError, expect.anything());
    });
  });
});
