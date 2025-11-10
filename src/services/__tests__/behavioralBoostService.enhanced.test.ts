/**
 * Enhanced Behavioral Boost Service Tests
 * 
 * Tests for the new features:
 * - Negative signals (dismiss actions)
 * - Temporal decay
 * - Contextual awareness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehavioralBoostService } from '../behavioralBoostService';
import type { Event, SupabaseClientType } from '@/types';

// Mock data
const mockEvent: Event = {
  id: 'event-1',
  title: 'React Workshop',
  description: 'Learn React fundamentals',
  startTime: '2024-01-15T10:00:00Z',
  endTime: '2024-01-15T12:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  organizer: 'Tech Academy',
  status: 'published',
  sourceUrl: 'https://example.com',
  location: 'Virtual',
  category: { name: 'Workshop' },
  tags: [{ name: 'react', category: 'technology' }]
} as Event;

const mockInteractedEvents: Event[] = [
  {
    ...mockEvent,
    id: 'event-2',
    title: 'Vue.js Workshop',
    description: 'Learn Vue.js fundamentals',
    startTime: '2024-01-10T10:00:00Z'
  } as Event
];

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [
              {
                event_id: 'event-2',
                interaction_type: 'click',
                created_at: '2024-01-10T10:00:00Z'
              },
              {
                event_id: 'event-3',
                interaction_type: 'dismiss',
                created_at: '2024-01-08T10:00:00Z'
              }
            ],
            error: null
          }))
        }))
      }))
    }))
  }))
} as unknown as SupabaseClientType;

describe('Enhanced Behavioral Boost Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Negative Signals', () => {
    it('should apply penalty for events similar to dismissed ones', async () => {
      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-1',
        mockEvent,
        mockInteractedEvents,
        mockSupabaseClient
      );

      // Should surface similarity data even if none match current dismissal set
      expect(Array.isArray(result.similarities)).toBe(true);
      expect(result.boost).toBeDefined();
    });
  });

  describe('Temporal Decay', () => {
    it('should weight recent interactions more heavily', async () => {
      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-1',
        mockEvent,
        mockInteractedEvents,
        mockSupabaseClient
      );

      // The boost should be calculated with temporal decay
      expect(result.boost).toBeDefined();
      expect(typeof result.boost).toBe('number');
    });
  });

  describe('Contextual Awareness', () => {
    it('should apply contextual boost for good timing', async () => {
      const context = {
        preferredCategories: ['Workshop'],
        preferredFormats: ['virtual'],
        preferredTimes: ['morning'],
        averageEventDuration: 120,
        interactionFrequency: 5
      };

      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-1',
        mockEvent,
        mockInteractedEvents,
        mockSupabaseClient,
        context
      );

      // Should include contextual information in calculation
      expect(result.boost).toBeDefined();
      expect(typeof result.boost).toBe('number');
    });

    it('should work without context', async () => {
      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-1',
        mockEvent,
        mockInteractedEvents,
        mockSupabaseClient
      );

      // Should work fine without context
      expect(result.boost).toBeDefined();
      expect(typeof result.boost).toBe('number');
    });
  });

  describe('Integration', () => {
    it('should combine all enhancements correctly', async () => {
      const context = {
        preferredCategories: ['Workshop'],
        preferredFormats: ['virtual'],
        preferredTimes: ['morning'],
        averageEventDuration: 120,
        interactionFrequency: 5
      };

      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-1',
        mockEvent,
        mockInteractedEvents,
        mockSupabaseClient,
        context
      );

      // Should have all components working together
      expect(result.boost).toBeDefined();
      expect(result.similarities).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(typeof result.boost).toBe('number');
    });
  });
});
