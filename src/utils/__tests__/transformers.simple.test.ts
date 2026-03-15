// src/utils/__tests__/transformers.simple.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  eventTransformer,
  eventTypeTransformer,
  enrichEvent,
  isValidEvent,
  isValidSupabaseEvent,
} from '../transformers';
import type { Event } from '../../types';

// Mock color2k
vi.mock('color2k', () => ({
  transparentize: vi.fn((color, alpha) => `${color}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`),
}));

describe('transformers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('eventTransformer', () => {
    describe('toApp', () => {
      it('should transform basic Supabase event to app event', () => {
        const supabaseEvent = {
          id: '1',
          title: 'Test Event',
          description: 'Test description',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          timezone: 'America/New_York',
          location: 'Test location',
          status: 'confirmed',
          source_url: 'https://example.com',
          livestream_url: 'https://example.com/stream',
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

        expect(result).toMatchObject({
          id: '1',
          title: 'Test Event',
          updatedAt: '2024-01-01T09:00:00Z',
          startTime: '2024-01-01T10:00:00Z',
          timezone: 'America/New_York',
          eventTypeId: 'type1',
          organizer: 'Test Organizer',
        });
      });

      it('should handle missing optional fields', () => {
        const supabaseEvent = {
          id: '1',
          title: 'Test Event',
          description: null,
          start_time: '2024-01-01T10:00:00Z',
          end_time: null,
          timezone: null,
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

        expect(result.description).toBe('');
        expect(result.location).toBe('Online');
        expect(result.status).toBe('confirmed');
        expect(result.sourceUrl).toBe('#');
        expect(result.timezone).toBeNull();
      });
    });

    describe('toSupabase', () => {
      it('should transform app event to Supabase event', () => {
        const appEvent = {
          id: '1',
          title: 'Test Event',
          startTime: '2024-01-01T10:00:00Z',
          eventTypeId: 'type1',
        };

        const result = eventTransformer.toSupabase(appEvent);

        expect(result).toEqual({
          id: '1',
          title: 'Test Event',
          start_time: '2024-01-01T10:00:00Z',
          event_type_id: 'type1',
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

  describe('enrichEvent', () => {
    it('should enrich event with event type', () => {
      const event = {
        id: '1',
        title: 'Test Event',
        startTime: '2024-01-01T10:00:00Z',
      } as unknown as Event;

      const eventType = {
        id: 'type1',
        name: 'Conference',
        color: '#3B82F6',
        description: 'Conference events',
      };

      const result = enrichEvent(event, { eventType });

      expect(result).toMatchObject({
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
      } as unknown as Event;

      const result = enrichEvent(event, { isTracked: true });

      expect(result).toMatchObject({
        ...event,
        isTracked: true,
      });
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
});
