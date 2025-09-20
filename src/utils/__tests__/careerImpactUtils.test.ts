import { describe, it, expect, beforeEach } from 'vitest';
import { CareerImpactUtils, CareerImpactEvent } from '../careerImpactUtils';
import { CareerImpactTestUtils } from '../../services/__tests__/careerImpactService.testUtils';
import { CareerImpactCalculationOptions } from '@/types/careerImpact';
import { Event } from '@/types';
import { CareerProfile } from '@/types/career';

describe('CareerImpactUtils', () => {
  let mockEvents: Event[];
  let mockCareerProfile: CareerProfile;

  beforeEach(() => {
    mockEvents = CareerImpactTestUtils.createBatchEvents();
    mockCareerProfile = CareerImpactTestUtils.createMockCareerProfile();
  });

  describe('enhanceEventsWithCareerImpact', () => {
    it('should enhance events with career impact scores', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      expect(enhancedEvents).toHaveLength(mockEvents.length);
      
      enhancedEvents.forEach((event: CareerImpactEvent) => {
        expect(event.careerImpact).toBeDefined();
        expect(event.careerImpact?.overall).toBeGreaterThan(0);
        expect(event.careerImpact?.confidence).toBeGreaterThan(0);
        CareerImpactTestUtils.assertScoreInRange(event.careerImpact?.overall || 0);
        CareerImpactTestUtils.assertConfidenceInRange(event.careerImpact?.confidence || 0);
      });
    });

    it('should handle custom options', async () => {
      const options: CareerImpactCalculationOptions = {
        algorithmVersion: '2.0.0',
        includeExplanations: true
      };

      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile,
        options
      );

      enhancedEvents.forEach((event: CareerImpactEvent) => {
        expect(event.careerImpact?.metadata.algorithmVersion).toBe('2.0.0');
      });
    });

    it('should preserve original event properties', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      enhancedEvents.forEach((event: CareerImpactEvent, index) => {
        expect(event.id).toBe(mockEvents[index].id);
        expect(event.title).toBe(mockEvents[index].title);
        expect(event.description).toBe(mockEvents[index].description);
        expect(event.careerImpact).toBeDefined();
      });
    });
  });

  describe('sortEventsByCareerImpact', () => {
    it('should sort events by career impact score (highest first)', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(enhancedEvents);

      expect(sortedEvents).toHaveLength(enhancedEvents.length);
      
      // Check that scores are in descending order
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentScore = sortedEvents[i].careerImpact?.overall || 0;
        const nextScore = sortedEvents[i + 1].careerImpact?.overall || 0;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('should handle events with no career impact scores', () => {
      const eventsWithoutScores: CareerImpactEvent[] = mockEvents.map(event => ({
        ...event,
        careerImpact: undefined
      }));

      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(eventsWithoutScores);

      expect(sortedEvents).toHaveLength(eventsWithoutScores.length);
    });

    it('should maintain stable sort for equal scores', async () => {
      const sameScoreEvents = mockEvents.map((event, index) => ({
        ...event,
        id: `same-score-${index}`,
        careerImpact: {
          overall: 75,
          confidence: 0.8,
          components: {
            skillRelevance: 75,
            careerStageMatch: 75,
            networkingValue: 75,
            industryRelevance: 75,
            timingBonus: 75
          },
          explanation: {
            reasons: ['Test'],
            matchedSkills: [],
            speakerHighlights: [],
            careerImpactCategory: 'moderate' as const,
            confidenceFactors: []
          },
          metadata: {
            calculatedAt: '2024-01-01T00:00:00Z',
            algorithmVersion: '1.0.0',
            careerProfileHash: 'test',
            eventDataHash: 'test'
          }
        }
      }));

      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(sameScoreEvents);

      // Should maintain original order for equal scores
      expect(sortedEvents[0].id).toBe('same-score-0');
      expect(sortedEvents[1].id).toBe('same-score-1');
    });
  });

  describe('filterEventsByMinScore', () => {
    it('should filter events by minimum score', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const minScore = 60;
      const filteredEvents = CareerImpactUtils.filterEventsByMinScore(enhancedEvents, minScore);

      filteredEvents.forEach((event: CareerImpactEvent) => {
        expect(event.careerImpact?.overall || 0).toBeGreaterThanOrEqual(minScore);
      });
    });

    it('should handle empty results', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const highMinScore = 95;
      const filteredEvents = CareerImpactUtils.filterEventsByMinScore(enhancedEvents, highMinScore);

      expect(filteredEvents).toBeInstanceOf(Array);
      filteredEvents.forEach((event: CareerImpactEvent) => {
        expect(event.careerImpact?.overall || 0).toBeGreaterThanOrEqual(highMinScore);
      });
    });

    it('should handle events with no career impact scores', () => {
      const eventsWithoutScores: CareerImpactEvent[] = mockEvents.map(event => ({
        ...event,
        careerImpact: undefined
      }));

      const filteredEvents = CareerImpactUtils.filterEventsByMinScore(eventsWithoutScores, 50);

      expect(filteredEvents).toHaveLength(0);
    });
  });

  describe('getTopEventsByCareerImpact', () => {
    it('should return top N events by career impact', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const limit = 2;
      const topEvents = CareerImpactUtils.getTopEventsByCareerImpact(enhancedEvents, limit);

      expect(topEvents).toHaveLength(limit);
      
      // Check that they are sorted by score
      for (let i = 0; i < topEvents.length - 1; i++) {
        const currentScore = topEvents[i].careerImpact?.overall || 0;
        const nextScore = topEvents[i + 1].careerImpact?.overall || 0;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }
    });

    it('should handle limit larger than available events', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const largeLimit = 100;
      const topEvents = CareerImpactUtils.getTopEventsByCareerImpact(enhancedEvents, largeLimit);

      expect(topEvents).toHaveLength(enhancedEvents.length);
    });

    it('should handle zero limit', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const topEvents = CareerImpactUtils.getTopEventsByCareerImpact(enhancedEvents, 0);

      expect(topEvents).toHaveLength(0);
    });
  });

  describe('getCareerImpactStats', () => {
    it('should calculate correct statistics', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const stats = CareerImpactUtils.getCareerImpactStats(enhancedEvents);

      expect(stats).toHaveProperty('average');
      expect(stats).toHaveProperty('median');
      expect(stats).toHaveProperty('max');
      expect(stats).toHaveProperty('min');
      expect(stats).toHaveProperty('count');

      expect(stats.count).toBe(enhancedEvents.length);
      expect(stats.average).toBeGreaterThan(0);
      expect(stats.max).toBeGreaterThanOrEqual(stats.min);
      expect(stats.median).toBeGreaterThanOrEqual(stats.min);
      expect(stats.median).toBeLessThanOrEqual(stats.max);
    });

    it('should handle empty events array', () => {
      const stats = CareerImpactUtils.getCareerImpactStats([]);

      expect(stats.average).toBe(0);
      expect(stats.median).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.count).toBe(0);
    });

    it('should handle events with no career impact scores', () => {
      const eventsWithoutScores: CareerImpactEvent[] = mockEvents.map(event => ({
        ...event,
        careerImpact: undefined
      }));

      const stats = CareerImpactUtils.getCareerImpactStats(eventsWithoutScores);

      expect(stats.count).toBe(0);
      expect(stats.average).toBe(0);
    });

    it('should handle single event', async () => {
      const singleEvent = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        [mockEvents[0]],
        mockCareerProfile
      );

      const stats = CareerImpactUtils.getCareerImpactStats(singleEvent);

      expect(stats.count).toBe(1);
      expect(stats.average).toBe(singleEvent[0].careerImpact?.overall || 0);
      expect(stats.median).toBe(singleEvent[0].careerImpact?.overall || 0);
      expect(stats.max).toBe(singleEvent[0].careerImpact?.overall || 0);
      expect(stats.min).toBe(singleEvent[0].careerImpact?.overall || 0);
    });
  });

  describe('formatScore', () => {
    it('should format scores correctly', () => {
      expect(CareerImpactUtils.formatScore(90)).toBe('Excellent');
      expect(CareerImpactUtils.formatScore(80)).toBe('Excellent');
      expect(CareerImpactUtils.formatScore(70)).toBe('Good');
      expect(CareerImpactUtils.formatScore(60)).toBe('Good');
      expect(CareerImpactUtils.formatScore(50)).toBe('Fair');
      expect(CareerImpactUtils.formatScore(40)).toBe('Fair');
      expect(CareerImpactUtils.formatScore(30)).toBe('Poor');
      expect(CareerImpactUtils.formatScore(0)).toBe('Poor');
    });

    it('should handle edge cases', () => {
      expect(CareerImpactUtils.formatScore(79.9)).toBe('Good');
      expect(CareerImpactUtils.formatScore(80.1)).toBe('Excellent');
      expect(CareerImpactUtils.formatScore(100)).toBe('Excellent');
    });
  });

  describe('getScoreColor', () => {
    it('should return correct colors for score ranges', () => {
      expect(CareerImpactUtils.getScoreColor(90)).toBe('text-green-600');
      expect(CareerImpactUtils.getScoreColor(80)).toBe('text-green-600');
      expect(CareerImpactUtils.getScoreColor(70)).toBe('text-blue-600');
      expect(CareerImpactUtils.getScoreColor(60)).toBe('text-blue-600');
      expect(CareerImpactUtils.getScoreColor(50)).toBe('text-yellow-600');
      expect(CareerImpactUtils.getScoreColor(40)).toBe('text-yellow-600');
      expect(CareerImpactUtils.getScoreColor(30)).toBe('text-red-600');
      expect(CareerImpactUtils.getScoreColor(0)).toBe('text-red-600');
    });
  });

  describe('getScoreBadgeVariant', () => {
    it('should return correct badge variants for score ranges', () => {
      expect(CareerImpactUtils.getScoreBadgeVariant(90)).toBe('default');
      expect(CareerImpactUtils.getScoreBadgeVariant(80)).toBe('default');
      expect(CareerImpactUtils.getScoreBadgeVariant(70)).toBe('secondary');
      expect(CareerImpactUtils.getScoreBadgeVariant(60)).toBe('secondary');
      expect(CareerImpactUtils.getScoreBadgeVariant(50)).toBe('outline');
      expect(CareerImpactUtils.getScoreBadgeVariant(40)).toBe('outline');
      expect(CareerImpactUtils.getScoreBadgeVariant(30)).toBe('destructive');
      expect(CareerImpactUtils.getScoreBadgeVariant(0)).toBe('destructive');
    });
  });
});

