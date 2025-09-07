// src/services/__tests__/eventServices.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventService } from '../eventServices';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { EventFilters } from '@/types';

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockQuery = {
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
    textSearch: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    then: vi.fn(),
  };

  return {
    from: vi.fn().mockReturnValue(mockQuery),
    ...mockQuery,
  };
};

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock transformers
vi.mock('@/utils/transformers', () => ({
  eventTransformer: {
    toApp: vi.fn((event) => ({
      id: event.id,
      title: event.title || 'Untitled Event',
      description: event.description || '',
      startTime: event.start_time || new Date().toISOString(),
      endTime: event.end_time,
      organizer: event.organizer?.name || 'Unknown Organizer',
      location: event.location || 'Online',
      status: event.status || 'confirmed',
      sourceUrl: event.source_url || '#',
      livestreamUrl: event.livestream_url,
      eventTypeId: event.event_type_id || '',
      organization: {
        id: event.organizer?.id || '',
        name: event.organizer?.name || 'Unknown Organizer',
        logo: event.organizer?.logo_url,
      },
    })),
  },
  eventTypeTransformer: {
    toApp: vi.fn((eventType) => ({
      id: eventType.id,
      name: eventType.name || 'Unnamed Category',
      color: eventType.color || '#808080',
      description: eventType.description,
    })),
  },
  enrichEvent: vi.fn((event, options) => ({
    ...event,
    ...(options.eventType && { color: options.eventType.color, category: options.eventType }),
    ...(options.isTracked !== undefined && { isTracked: options.isTracked }),
  })),
  enhancedEventTransformer: {
    toApp: vi.fn((event) => ({
      ...event,
      isMultiDay: event.is_multi_day || false,
      dailySchedule: event.daily_schedule,
      eventPattern: event.event_pattern || 'single',
    })),
  },
}));

// Mock security utils
vi.mock('@/lib/securityUtils', () => ({
  sanitizeFtsQuery: vi.fn((query) => query.replace(/[<>]/g, '')),
}));

describe('EventService', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getEvents', () => {
    it('should fetch events with basic filters', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Test Event 1',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T12:00:00Z',
          organizer: { id: 'org1', name: 'Test Org' },
        },
        {
          id: '2',
          title: 'Test Event 2',
          start_time: '2024-01-02T10:00:00Z',
          end_time: '2024-01-02T12:00:00Z',
          organizer: { id: 'org2', name: 'Test Org 2' },
        },
      ];

      // Mock the query chain to return a promise
      const mockQuery = mockSupabase.from('events');
      mockQuery.then.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const filters: EventFilters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
      };

      const result = await EventService.getEvents(filters, mockSupabase as unknown as SupabaseClient, 1, 10);

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.gte).toHaveBeenCalledWith('start_time', '2024-01-01T00:00:00.000Z');
      expect(mockQuery.lte).toHaveBeenCalledWith('start_time', '2024-01-31T23:59:59.999Z');
      expect(result).toHaveLength(2);
    });

    it('should handle empty results', async () => {
      mockSupabase.then.mockResolvedValue({
        data: [],
        error: null,
      });

      const filters: EventFilters = {
        startDate: new Date('2024-01-01'),
      };

      const result = await EventService.getEvents(filters, mockSupabase as unknown as SupabaseClient, 1, 10);

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database connection failed');
      mockSupabase.then.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const filters: EventFilters = {
        startDate: new Date('2024-01-01'),
      };

      await expect(EventService.getEvents(filters, mockSupabase as unknown as SupabaseClient, 1, 10))
        .rejects.toThrow('Database connection failed');
    });

    it('should apply search filters', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'React Conference',
          start_time: '2024-01-01T10:00:00Z',
          organizer: { id: 'org1', name: 'React Org' },
        },
      ];

      mockSupabase.then.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const filters: EventFilters = {
        startDate: new Date('2024-01-01'),
        searchTerm: 'react',
      };

      await EventService.getEvents(filters, mockSupabase as unknown as SupabaseClient, 1, 10);

      expect(mockSupabase.textSearch).toHaveBeenCalledWith('title,description', 'react');
    });

    it('should apply event type filters', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'Conference',
          start_time: '2024-01-01T10:00:00Z',
          event_type_id: 'type1',
          organizer: { id: 'org1', name: 'Test Org' },
        },
      ];

      mockSupabase.then.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const filters: EventFilters = {
        startDate: new Date('2024-01-01'),
        categories: ['type1', 'type2'],
      };

      await EventService.getEvents(filters, mockSupabase as unknown as SupabaseClient, 1, 10);

      expect(mockSupabase.in).toHaveBeenCalledWith('event_type_id', ['type1', 'type2']);
    });
  });

  describe('getEventById', () => {
    it('should fetch a single event by ID', async () => {
      const mockEvent = {
        id: '1',
        title: 'Test Event',
        start_time: '2024-01-01T10:00:00Z',
        organizer: { id: 'org1', name: 'Test Org' },
      };

      mockSupabase.single.mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      const result = await EventService.getEventById('1', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
      expect(mockSupabase.single).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null if event not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await EventService.getEventById('nonexistent', mockSupabase as unknown as SupabaseClient);

      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      const mockError = new Error('Database error');
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(EventService.getEventById('1', mockSupabase as unknown as SupabaseClient))
        .rejects.toThrow('Database error');
    });
  });

  describe('getRecommendedEvents', () => {
    it('should fetch recommended events based on categories', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'React Conference',
          start_time: '2024-01-01T10:00:00Z',
          organizer: { id: 'org1', name: 'React Org' },
        },
      ];

      mockSupabase.then.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const result = await EventService.getRecommendedEvents(
        ['React', 'JavaScript'],
        ['tag1', 'tag2'],
        mockSupabase as unknown as SupabaseClient
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(result).toHaveLength(1);
    });

    it('should handle empty categories', async () => {
      mockSupabase.then.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await EventService.getRecommendedEvents(
        [],
        [],
        mockSupabase as unknown as SupabaseClient
      );

      expect(result).toEqual([]);
    });
  });

  describe('searchEvents', () => {
    it('should search events with query', async () => {
      const mockEvents = [
        {
          id: '1',
          title: 'React Conference',
          start_time: '2024-01-01T10:00:00Z',
          organizer: { id: 'org1', name: 'React Org' },
        },
      ];

      mockSupabase.then.mockResolvedValue({
        data: mockEvents,
        error: null,
      });

      const result = await EventService.searchEvents('react', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.textSearch).toHaveBeenCalledWith('fts', 'react', {
        type: 'websearch',
        config: 'english'
      });
      expect(result).toHaveLength(1);
    });

    it('should sanitize search query', async () => {
      mockSupabase.then.mockResolvedValue({
        data: [],
        error: null,
      });

      await EventService.searchEvents('react<script>', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.textSearch).toHaveBeenCalledWith('fts', 'reactscript', {
        type: 'websearch',
        config: 'english'
      });
    });

    it('should handle empty query', async () => {
      const result = await EventService.searchEvents('', mockSupabase as unknown as SupabaseClient);

      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('getEventWithAgenda', () => {
    it('should fetch event with agenda', async () => {
      const mockEvent = {
        id: '1',
        title: 'Test Event',
        start_time: '2024-01-01T10:00:00Z',
        organizer: { id: 'org1', name: 'Test Org' },
        agenda: [
          {
            id: '1',
            event_id: 'event1',
            title: 'Opening Keynote',
            start_time: '2024-01-01T10:00:00Z',
            end_time: '2024-01-01T11:00:00Z',
            type: 'keynote',
          },
        ],
      };

      mockSupabase.single.mockResolvedValue({
        data: mockEvent,
        error: null,
      });

      const result = await EventService.getEventWithAgenda('event1', mockSupabase as unknown as SupabaseClient);

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'event1');
      expect(result).toBeDefined();
    });

    it('should return null if event not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await EventService.getEventWithAgenda('nonexistent', mockSupabase as unknown as SupabaseClient);

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should capture exceptions with Sentry', async () => {
      const mockError = new Error('Test error');
      mockSupabase.then.mockRejectedValue(mockError);

      const { captureException } = await import('@sentry/nextjs');

      await expect(EventService.getEvents({ startDate: new Date() }, mockSupabase as unknown as SupabaseClient, 1, 10))
        .rejects.toThrow('Test error');

      expect(captureException).toHaveBeenCalledWith(mockError);
    });
  });
});
