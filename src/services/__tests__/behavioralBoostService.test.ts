/**
 * DEPRECATED TEST FILE
 * 
 * This file tests an old API that no longer exists.
 * The service was refactored - use behavioralBoostService.enhanced.test.ts instead.
 * 
 * Methods being tested here (calculateSimilarity, findSimilarEvents, getUserInteractions, getABTestGroup)
 * are now private or removed. The public API is only calculateBehavioralBoost().
 * 
 * Keeping this file for reference but skipping all tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehavioralBoostService } from '../behavioralBoostService';
import { BEHAVIORAL_CONFIG } from '@/config/behavioralConstants';
import type { Event } from '@/types';

// Mock events for testing
const mockEventA: Event = {
  id: 'event-a',
  title: 'React Workshop',
  description: 'Learn React fundamentals',
  category: { name: 'Development' },
  tags: ['react', 'javascript', 'frontend'],
  speakers: [{ name: 'John Doe' }],
  location: 'San Francisco'
} as Event;

const mockEventB: Event = {
  id: 'event-b',
  title: 'Vue.js Training',
  description: 'Build apps with Vue',
  category: { name: 'Development' },
  tags: ['vue', 'javascript', 'frontend'],
  speakers: [{ name: 'Jane Smith' }],
  location: 'San Francisco'
} as Event;

const mockEventC: Event = {
  id: 'event-c',
  title: 'Design Thinking',
  description: 'UX design principles',
  category: { name: 'Design' },
  tags: ['design', 'ux'],
  speakers: [{ name: 'Bob Wilson' }],
  location: 'New York'
} as Event;

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ error: null })
};

describe.skip('BehavioralBoostService [DEPRECATED - See behavioralBoostService.enhanced.test.ts]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getABTestGroup', () => {
    it('should return consistent AB group for same user ID', () => {
      const userId = 'user-123';
      const group1 = BehavioralBoostService.getABTestGroup(userId);
      const group2 = BehavioralBoostService.getABTestGroup(userId);
      
      expect(group1).toBe(group2);
      expect(['CONTROL', 'LOW', 'MEDIUM', 'HIGH']).toContain(group1);
    });

    it('should distribute users across groups', () => {
      const groups = new Set();
      for (let i = 0; i < 100; i++) {
        const group = BehavioralBoostService.getABTestGroup(`user-${i}`);
        groups.add(group);
      }
      
      // Should have multiple groups represented
      expect(groups.size).toBeGreaterThan(1);
    });
  });

  describe('getBoostStrength', () => {
    it('should return correct boost strength for each group', () => {
      expect(BehavioralBoostService.getBoostStrength('CONTROL')).toBe(0);
      expect(BehavioralBoostService.getBoostStrength('LOW')).toBe(5);
      expect(BehavioralBoostService.getBoostStrength('MEDIUM')).toBe(10);
      expect(BehavioralBoostService.getBoostStrength('HIGH')).toBe(15);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate high similarity for similar events', () => {
      const similarity = BehavioralBoostService.calculateSimilarity(mockEventA, mockEventB);
      
      // Both are Development category, JavaScript, frontend, same location
      expect(similarity).toBeGreaterThan(BEHAVIORAL_CONFIG.MIN_SIMILARITY_THRESHOLD);
    });

    it('should calculate low similarity for different events', () => {
      const similarity = BehavioralBoostService.calculateSimilarity(mockEventA, mockEventC);
      
      // Different categories, tags, speakers, locations
      expect(similarity).toBeLessThan(BEHAVIORAL_CONFIG.MIN_SIMILARITY_THRESHOLD);
    });

    it('should return 1.0 for identical events', () => {
      const similarity = BehavioralBoostService.calculateSimilarity(mockEventA, mockEventA);
      expect(similarity).toBe(1.0);
    });
  });

  describe('findSimilarEvents', () => {
    it('should find similar events above threshold', () => {
      const interactedEvents = [mockEventB, mockEventC];
      const similarities = BehavioralBoostService.findSimilarEvents(mockEventA, interactedEvents);
      
      // Should find mockEventB as similar (both development/JS)
      expect(similarities.length).toBeGreaterThan(0);
      expect(similarities[0].eventId).toBe('event-b');
      expect(similarities[0].score).toBeGreaterThan(BEHAVIORAL_CONFIG.MIN_SIMILARITY_THRESHOLD);
    });

    it('should include similarity reasons', () => {
      const interactedEvents = [mockEventB];
      const similarities = BehavioralBoostService.findSimilarEvents(mockEventA, interactedEvents);
      
      expect(similarities[0].reasons.length).toBeGreaterThan(0);
      expect(similarities[0].reasons.join(' ')).toContain('same category');
    });

    it('should return empty array when no similar events', () => {
      const interactedEvents = [mockEventC];
      const similarities = BehavioralBoostService.findSimilarEvents(mockEventA, interactedEvents);
      
      expect(similarities.length).toBe(0);
    });
  });

  describe('getUserInteractions', () => {
    it('should fetch user interactions from analytics', async () => {
      const mockAnalytics = [
        {
          event_id: 'event-1',
          metric_type: 'click',
          measured_at: '2023-01-01T00:00:00Z'
        },
        {
          event_id: 'event-2',
          metric_type: 'save',
          measured_at: '2023-01-02T00:00:00Z'
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAnalytics, error: null })
      });

      const interactions = await BehavioralBoostService.getUserInteractions(
        'user-123',
        mockSupabaseClient as unknown as Parameters<typeof BehavioralBoostService.getUserInteractions>[1]
      );

      expect(interactions).toHaveLength(2);
      expect(interactions[0].event_id).toBe('event-1');
      expect(interactions[0].interaction_type).toBe('click');
    });
  });

  describe('calculateBehavioralBoost', () => {
    it('should return zero boost for control group', async () => {
      vi.spyOn(BehavioralBoostService, 'getABTestGroup').mockReturnValue('CONTROL');
      
      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-123',
        mockEventA,
        [mockEventB],
        mockSupabaseClient as unknown as Parameters<typeof BehavioralBoostService.calculateBehavioralBoost>[3]
      );

      expect(result.boost).toBe(0);
      expect(result.application).toBeNull();
    });

    it('should calculate boost for test groups with similar events', async () => {
      vi.spyOn(BehavioralBoostService, 'getABTestGroup').mockReturnValue('MEDIUM');
      vi.spyOn(BehavioralBoostService, 'getUserInteractions').mockResolvedValue([
        { event_id: 'event-b', interaction_type: 'click', created_at: '2023-01-01T00:00:00Z' }
      ]);
      
      const result = await BehavioralBoostService.calculateBehavioralBoost(
        'user-123',
        mockEventA,
        [mockEventB],
        mockSupabaseClient as unknown as Parameters<typeof BehavioralBoostService.calculateBehavioralBoost>[3]
      );

      expect(result.boost).toBeGreaterThan(0);
      expect(result.boost).toBeLessThanOrEqual(10); // MEDIUM group max
      expect(result.application).toBeDefined();
      expect(result.similarities.length).toBeGreaterThan(0);
    });
  });
});