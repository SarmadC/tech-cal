// src/utils/__tests__/transformers.test.ts

import { describe, it, expect, vi } from 'vitest';
import {
  eventTransformer,
  eventTypeTransformer,
  trackedEventTransformer,
  profileTransformer,
  enrichEvent,
  enrichEventType,
  transformEventsToApp,
  transformEventTypesToApp,
  isValidEvent,
  isValidSupabaseEvent,
  toFullCalendarEvent,
  toFullCalendarEvents,
  isEventLive,
  isEventUpcoming,
  getEventTimeStatus,
  enhancedEventTransformer,
} from '../transformers';
import type { Event, EventType } from '@/types';

// Mock color2k
vi.mock('color2k', () => ({
  transparentize: vi.fn((color, alpha) => `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`),
}));

describe('eventTransformer', () => {
  describe('toApp', () => {
    it('should transform Supabase event to app event', () => {
      const supabaseEvent = {
        id: '1',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        location: 'Test Location',
        status: 'confirmed',
        source_url: 'https://example.com',
        livestream_url: 'https://stream.example.com',
        event_type_id: 'type1',
        organizer_id: 'org1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
        agenda_url: null,
        organizer: {
          id: 'org1',
          name: 'Test Organizer',
          logo_url: 'https://logo.example.com/logo.png',
        },
        tags: [
          { id: 'tag1', name: 'React', color: '#61DAFB', category: 'Technology' },
        ],
      };

      const result = eventTransformer.toApp(supabaseEvent);

      expect(result).toEqual({
        id: '1',
        createdAt: '2024-01-01T09:00:00Z',
        title: 'Test Event',
        description: 'Test Description',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        organizer: 'Test Organizer',
        location: 'Test Location',
        status: 'confirmed',
        sourceUrl: 'https://example.com',
        livestreamUrl: 'https://stream.example.com',
        eventTypeId: 'type1',
        agendaUrl: null,
        tags: [
          { id: 'tag1', name: 'React', color: '#61DAFB', category: 'Technology' },
        ],
        organization: {
          id: 'org1',
          name: 'Test Organizer',
          logo: 'https://logo.example.com/logo.png',
        },
      });
    });

    it('should handle missing optional fields', () => {
      const supabaseEvent = {
        id: '1',
        title: 'Test Event',
        description: null,
        start_time: '2024-01-01T10:00:00Z',
        end_time: null,
        location: null,
        status: 'confirmed',
        source_url: null,
        livestream_url: null,
        event_type_id: 'type1',
        organizer_id: 'org1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
        agenda_url: null,
        organizer: {
          id: 'org1',
          name: 'Test Organizer',
        },
        tags: [],
      };

      const result = eventTransformer.toApp(supabaseEvent);

      expect(result).toEqual({
        id: '1',
        createdAt: '2024-01-01T09:00:00Z',
        title: 'Test Event',
        description: '',
        startTime: '2024-01-01T10:00:00Z',
        endTime: null,
        organizer: 'Test Organizer',
        location: 'Online',
        status: 'confirmed',
        sourceUrl: '#',
        livestreamUrl: null,
        eventTypeId: 'type1',
        agendaUrl: null,
        organization: {
          id: 'org1',
          name: 'Test Organizer',
        },
      });
    });

    it('should handle missing organizer', () => {
      const supabaseEvent = {
        id: '1',
        title: 'Test Event',
        description: 'Test description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        location: 'Online',
        status: 'confirmed',
        source_url: 'https://example.com',
        livestream_url: 'https://example.com/stream',
        event_type_id: 'type1',
        organizer_id: null,
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
        agenda_url: null,
        organizer: null,
        tags: [],
      };

      const result = eventTransformer.toApp(supabaseEvent);

      expect(result.organizer).toBe('Unknown Organizer');
      expect(result.organization?.name).toBe('Unknown Organizer');
    });
  });

  describe('toSupabase', () => {
    it('should transform app event to Supabase event', () => {
      const appEvent = {
        id: '1',
        title: 'Test Event',
        description: 'Test Description',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        location: 'Test Location',
        status: 'confirmed',
        sourceUrl: 'https://example.com',
        livestreamUrl: 'https://stream.example.com',
        eventTypeId: 'type1',
      };

      const result = eventTransformer.toSupabase(appEvent);

      expect(result).toEqual({
        id: '1',
        title: 'Test Event',
        description: 'Test Description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        location: 'Test Location',
        status: 'confirmed',
        source_url: 'https://example.com',
        livestream_url: 'https://stream.example.com',
        event_type_id: 'type1',
      });
    });

    it('should handle partial app event', () => {
      const appEvent = {
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
      };

      const result = eventTransformer.toSupabase(appEvent);

      expect(result).toEqual({
        title: 'Test Event',
        start_time: '2024-01-01T10:00:00Z',
      });
    });
  });
});

describe('eventTypeTransformer', () => {
  describe('toApp', () => {
    it('should transform Supabase event type to app event type', () => {
      const supabaseEventType = {
        id: '1',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Tech conferences',
      };

      const result = eventTypeTransformer.toApp(supabaseEventType);

      expect(result).toEqual({
        id: '1',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Tech conferences',
      });
    });

    it('should handle missing optional fields', () => {
      const supabaseEventType = {
        id: '1',
        name: 'Conference',
        color: '#3B82F6',
      };

      const result = eventTypeTransformer.toApp(supabaseEventType);

      expect(result).toEqual({
        id: '1',
        name: 'Conference',
        color: '#3B82F6',
        description: undefined,
      });
    });
  });

  describe('toSupabase', () => {
    it('should transform app event type to Supabase event type', () => {
      const appEventType = {
        id: '1',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Tech conferences',
      };

      const result = eventTypeTransformer.toSupabase(appEventType);

      expect(result).toEqual({
        id: '1',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Tech conferences',
      });
    });
  });
});

describe('trackedEventTransformer', () => {
  describe('toApp', () => {
    it('should transform Supabase tracked event to app tracked event', () => {
      const supabaseTrackedEvent = {
        id: 'tracking1',
        user_id: 'user1',
        event_id: 'event1',
        status: 'bookmarked' as const,
        notes: 'Test notes',
        created_at: '2024-01-01T10:00:00Z',
        events: {
          id: 'event1',
          title: 'Test Event',
          description: 'Test event description',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          location: 'Online',
          status: 'confirmed',
          source_url: 'https://example.com',
          livestream_url: 'https://example.com/stream',
          event_type_id: 'type1',
          organizer_id: 'org1',
          created_at: '2024-01-01T09:00:00Z',
          updated_at: '2024-01-01T09:00:00Z',
          agenda_url: null,
          event_type: {
            id: 'type1',
            name: 'Conference',
            color: '#3B82F6',
            description: 'Conference events',
          },
          organizer: {
            id: 'org1',
            name: 'Test Organizer',
          },
          tags: [],
        },
      };

      const result = trackedEventTransformer.toApp(supabaseTrackedEvent);

      expect(result).toEqual(expect.objectContaining({
        trackingId: 'tracking1',
        userId: 'user1',
        eventId: 'event1',
        status: 'bookmarked',
        notes: 'Test notes',
        trackedAt: '2024-01-01T10:00:00Z',
        isBookmarked: false,
        bookmarkedAt: null,
      }));
      expect(result.event).toEqual(expect.objectContaining({
        id: 'event1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
      }));
    });

    it('should handle missing event data', () => {
      const supabaseTrackedEvent = {
        id: 'tracking1',
        user_id: 'user1',
        event_id: 'event1',
        status: 'bookmarked' as const,
        notes: '',
        created_at: '2024-01-01T10:00:00Z',
        events: null,
      };

      const result = trackedEventTransformer.toApp(supabaseTrackedEvent);

      expect(result.event).toBeNull();
    });
  });
});

describe('profileTransformer', () => {
  describe('toApp', () => {
    it('should transform Supabase profile to app profile', () => {
      const supabaseProfile = {
        id: 'user1',
        full_name: 'John Doe',
        avatar_url: 'https://avatar.example.com/avatar.jpg',
        timezone: 'America/New_York',
        preferences: { theme: 'dark' },
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      const result = profileTransformer.toApp(supabaseProfile);

      expect(result).toEqual({
        id: 'user1',
        fullName: 'John Doe',
        avatarUrl: 'https://avatar.example.com/avatar.jpg',
        timezone: 'America/New_York',
        preferences: { theme: 'dark' },
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      });
    });
  });
});

describe('enrichEvent', () => {
  it('should enrich event with event type', () => {
    const event = {
      id: '1',
      title: 'Test Event',
      startTime: '2024-01-01T10:00:00Z',
    } as Event;

    const eventType = {
      id: 'type1',
      name: 'Conference',
      color: '#3B82F6',
    } as EventType;

    const result = enrichEvent(event, { eventType });

    expect(result).toEqual({
      ...event,
      color: '#3B82F6',
      category: eventType,
    });
  });

  it('should enrich event with tracking status', () => {
    const event = {
      id: '1',
      title: 'Test Event',
      startTime: '2024-01-01T10:00:00Z',
    } as Event;

    const result = enrichEvent(event, { isTracked: true });

    expect(result).toEqual({
      ...event,
      isTracked: true,
    });
  });
});

describe('enrichEventType', () => {
  it('should enrich event type with count', () => {
    const eventType = {
      id: 'type1',
      name: 'Conference',
      color: '#3B82F6',
    } as EventType;

    const result = enrichEventType(eventType, 5);

    expect(result).toEqual({
      ...eventType,
      eventCount: 5,
    });
  });
});

describe('array transformers', () => {
  it('should transform events array', () => {
    const supabaseEvents = [
      {
        id: '1',
        title: 'Event 1',
        description: 'Event 1 description',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        location: 'Online',
        status: 'confirmed',
        source_url: 'https://example.com',
        livestream_url: 'https://example.com/stream',
        event_type_id: 'type1',
        organizer_id: 'org1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
        agenda_url: null,
        organizer: { id: 'org1', name: 'Org 1' },
        tags: [],
      },
      {
        id: '2',
        title: 'Event 2',
        description: 'Event 2 description',
        start_time: '2024-01-02T10:00:00Z',
        end_time: '2024-01-02T11:00:00Z',
        location: 'Online',
        status: 'confirmed',
        source_url: 'https://example.com',
        livestream_url: 'https://example.com/stream',
        event_type_id: 'type2',
        organizer_id: 'org2',
        created_at: '2024-01-02T09:00:00Z',
        updated_at: '2024-01-02T09:00:00Z',
        agenda_url: null,
        organizer: { id: 'org2', name: 'Org 2' },
        tags: [],
      },
    ];

    const result = transformEventsToApp(supabaseEvents);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Event 1');
    expect(result[1].title).toBe('Event 2');
  });

  it('should transform event types array', () => {
    const supabaseEventTypes = [
      {
        id: 'type1',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Conference events',
      },
      {
        id: 'type2',
        name: 'Workshop',
        color: '#10B981',
        description: 'Workshop events',
      },
    ];

    const result = transformEventTypesToApp(supabaseEventTypes);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Conference');
    expect(result[1].name).toBe('Workshop');
  });
});

describe('validation utilities', () => {
  describe('isValidEvent', () => {
    it('should validate valid event', () => {
      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        eventTypeId: 'type1',
      };

      expect(isValidEvent(event)).toBe(true);
    });

    it('should reject invalid event', () => {
      const invalidEvent = {
        id: '1',
        title: 'Test Event',
        // missing startTime and eventTypeId
      };

      expect(isValidEvent(invalidEvent)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(isValidEvent(null)).toBe(false);
      expect(isValidEvent(undefined)).toBe(false);
      expect(isValidEvent('string')).toBe(false);
    });
  });

  describe('isValidSupabaseEvent', () => {
    it('should validate valid Supabase event', () => {
      const event = {
        id: '1',
        title: 'Test Event',
        start_time: '2024-01-01T10:00:00Z',
        event_type_id: 'type1',
      };

      expect(isValidSupabaseEvent(event)).toBe(true);
    });

    it('should reject invalid Supabase event', () => {
      const invalidEvent = {
        id: '1',
        title: 'Test Event',
        // missing start_time and event_type_id
      };

      expect(isValidSupabaseEvent(invalidEvent)).toBe(false);
    });
  });
});

describe('FullCalendar utilities', () => {
  describe('toFullCalendarEvent', () => {
    it('should transform event to FullCalendar format', () => {
      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
        color: '#3B82F6',
      } as Event;

      const result = toFullCalendarEvent(event);

      expect(result).toEqual({
        id: '1',
        title: 'Test Event',
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T12:00:00Z',
        extendedProps: event,
        backgroundColor: '#3B82F6d9',
        borderColor: '#3B82F6',
        textColor: 'var(--foreground-primary)',
      });
    });

    it('should handle event without end time', () => {
      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        color: '#3B82F6',
      } as Event;

      const result = toFullCalendarEvent(event);

      expect(result.end).toBeUndefined();
    });
  });

  describe('toFullCalendarEvents', () => {
    it('should transform events array to FullCalendar format', () => {
      const events = [
        {
          id: '1',
          title: 'Event 1',
          startTime: '2024-01-01T10:00:00Z',
          color: '#3B82F6',
        },
        {
          id: '2',
          title: 'Event 2',
          startTime: '2024-01-02T10:00:00Z',
          color: '#10B981',
        },
      ] as Event[];

      const result = toFullCalendarEvents(events);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Event 1');
      expect(result[1].title).toBe('Event 2');
    });
  });
});

describe('date utilities', () => {
  describe('isEventLive', () => {
    it('should return true for live event', () => {
      const now = new Date('2024-01-01T11:00:00Z');
      vi.setSystemTime(now);

      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
      } as Event;

      expect(isEventLive(event)).toBe(true);
    });

    it('should return false for past event', () => {
      const now = new Date('2024-01-01T13:00:00Z');
      vi.setSystemTime(now);

      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
      } as Event;

      expect(isEventLive(event)).toBe(false);
    });

    it('should return false for future event', () => {
      const now = new Date('2024-01-01T09:00:00Z');
      vi.setSystemTime(now);

      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
      } as Event;

      expect(isEventLive(event)).toBe(false);
    });
  });

  describe('isEventUpcoming', () => {
    it('should return true for upcoming event', () => {
      const now = new Date('2024-01-01T09:00:00Z');
      vi.setSystemTime(now);

      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
      } as Event;

      expect(isEventUpcoming(event)).toBe(true);
    });

    it('should return false for past event', () => {
      const now = new Date('2024-01-01T11:00:00Z');
      vi.setSystemTime(now);

      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
      } as Event;

      expect(isEventUpcoming(event)).toBe(false);
    });
  });

  describe('getEventTimeStatus', () => {
    it('should return correct status for different event times', () => {
      const now = new Date('2024-01-01T11:00:00Z');
      vi.setSystemTime(now);

      const pastEvent = {
        id: '1',
        title: 'Past Event',
        startTime: '2024-01-01T09:00:00Z',
        endTime: '2024-01-01T10:00:00Z',
      } as Event;

      const liveEvent = {
        id: '2',
        title: 'Live Event',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-01T12:00:00Z',
      } as Event;

      const futureEvent = {
        id: '3',
        title: 'Future Event',
        startTime: '2024-01-01T13:00:00Z',
        endTime: '2024-01-01T15:00:00Z',
      } as Event;

      expect(getEventTimeStatus(pastEvent)).toBe('past');
      expect(getEventTimeStatus(liveEvent)).toBe('live');
      expect(getEventTimeStatus(futureEvent)).toBe('upcoming');
    });
  });
});

describe('enhancedEventTransformer', () => {
  describe('toApp', () => {
    it('should transform enhanced event with multi-day data', () => {
      const supabaseEvent = {
        id: '1',
        title: 'Multi-day Conference',
        description: null,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-03T18:00:00Z',
        location: null,
        status: 'confirmed',
        source_url: null,
        livestream_url: null,
        event_type_id: 'type1',
        organizer_id: 'org1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
        agenda_url: null,
        organizer: { id: 'org1', name: 'Test Org' },
        tags: [],
        is_multi_day: true,
        daily_schedule: {
          type: 'daily_recurring',
          daily_start: '09:00',
          daily_end: '17:00',
          timezone: 'America/New_York',
        },
        event_pattern: 'multi_day',
        event_type: {
          id: 'type1',
          name: 'Conference',
          color: '#3B82F6',
          description: 'Conference events',
        },
      };

      const result = enhancedEventTransformer.toApp(supabaseEvent);

      expect(result).toEqual(expect.objectContaining({
        id: '1',
        createdAt: '2024-01-01T09:00:00Z',
        title: 'Multi-day Conference',
        description: '',
        startTime: '2024-01-01T10:00:00Z',
        endTime: '2024-01-03T18:00:00Z',
        organizer: 'Test Org',
        location: 'Online',
        status: 'confirmed',
        sourceUrl: '#',
        livestreamUrl: null,
        agendaUrl: null,
        eventTypeId: 'type1',
        organization: expect.objectContaining({
          id: 'org1',
          name: 'Test Org',
        }),
        color: '#3B82F6',
        category: expect.objectContaining({
          id: 'type1',
          name: 'Conference',
          color: '#3B82F6',
          description: 'Conference events',
        }),
        isMultiDay: true,
        eventPattern: 'multi_day',
      }));
      expect(result.dailySchedule).toEqual(expect.objectContaining({
        type: 'daily_recurring',
        dailyStart: '09:00',
        dailyEnd: '17:00',
        timezone: 'America/New_York',
      }));
    });

    it('should handle single day event', () => {
      const supabaseEvent = {
        id: '1',
        title: 'Single Day Event',
        description: null,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T12:00:00Z',
        location: null,
        status: 'confirmed',
        source_url: null,
        livestream_url: null,
        event_type_id: 'type1',
        organizer_id: 'org1',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T09:00:00Z',
        agenda_url: null,
        organizer: { id: 'org1', name: 'Test Org' },
        tags: [],
        is_multi_day: false,
        daily_schedule: null,
        event_pattern: 'single',
        event_type: {
          id: 'type1',
          name: 'Workshop',
          color: '#10B981',
          description: 'Workshop events',
        },
      };

      const result = enhancedEventTransformer.toApp(supabaseEvent);

      expect(result.isMultiDay).toBe(false);
      expect(result.eventPattern).toBe('single');
      expect(result.dailySchedule).toBeUndefined();
    });
  });
});
