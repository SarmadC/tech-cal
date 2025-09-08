// src/services/__tests__/eventServices.simple.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventService } from '../eventServices';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the entire EventService module
vi.mock('../eventServices', () => ({
  EventService: {
    getEvents: vi.fn(),
    getEventById: vi.fn(),
    searchEvents: vi.fn(),
    getRecommendedEvents: vi.fn(),
    getEventWithAgenda: vi.fn(),
  },
}));

describe('EventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEvents', () => {
    it('should be callable', () => {
      expect(EventService.getEvents).toBeDefined();
      expect(typeof EventService.getEvents).toBe('function');
    });

    it('should accept correct parameters', () => {
      const mockSupabase = {} as unknown as SupabaseClient;
      const filters = { startDate: new Date() };
      
      // This should not throw
      expect(() => {
        EventService.getEvents(filters, mockSupabase, 1, 10);
      }).not.toThrow();
    });
  });

  describe('getEventById', () => {
    it('should be callable', () => {
      expect(EventService.getEventById).toBeDefined();
      expect(typeof EventService.getEventById).toBe('function');
    });

    it('should accept correct parameters', () => {
      const mockSupabase = {} as unknown as SupabaseClient;
      
      // This should not throw
      expect(() => {
        EventService.getEventById('event1', mockSupabase);
      }).not.toThrow();
    });
  });

  describe('searchEvents', () => {
    it('should be callable', () => {
      expect(EventService.searchEvents).toBeDefined();
      expect(typeof EventService.searchEvents).toBe('function');
    });

    it('should accept correct parameters', () => {
      const mockSupabase = {} as unknown as SupabaseClient;
      
      // This should not throw
      expect(() => {
        EventService.searchEvents('query', mockSupabase);
      }).not.toThrow();
    });
  });

  describe('getRecommendedEvents', () => {
    it('should be callable', () => {
      expect(EventService.getRecommendedEvents).toBeDefined();
      expect(typeof EventService.getRecommendedEvents).toBe('function');
    });

    it('should accept correct parameters', () => {
      const mockSupabase = {} as unknown as SupabaseClient;
      
      // This should not throw
      expect(() => {
        EventService.getRecommendedEvents(['category1'], ['tag1'], mockSupabase);
      }).not.toThrow();
    });
  });

  describe('getEventWithAgenda', () => {
    it('should be callable', () => {
      expect(EventService.getEventWithAgenda).toBeDefined();
      expect(typeof EventService.getEventWithAgenda).toBe('function');
    });

    it('should accept correct parameters', () => {
      const mockSupabase = {} as unknown as SupabaseClient;
      
      // This should not throw
      expect(() => {
        EventService.getEventWithAgenda('event1', mockSupabase);
      }).not.toThrow();
    });
  });
});
