/**
 * Tests for DiversityEnhancementService
 */

import { describe, it, expect } from 'vitest';
import { DiversityEnhancementService } from '../diversityEnhancementService';
import type { EventWithCareerImpact } from '@/types';

// Mock events with different types and categories
const createMockEvent = (
  id: string,
  category: string,
  location: string = 'San Francisco, CA',
  livestreamUrl: string | null = null,
  careerImpactScore: number = 0.8
): EventWithCareerImpact => ({
  id,
  title: `Event ${id}`,
  description: 'Test event',
  organizer: 'Test Organizer',
  location,
  status: 'active',
  startTime: '2024-01-01T10:00:00Z',
  endTime: '2024-01-01T12:00:00Z',
  sourceUrl: 'https://example.com',
  livestreamUrl,
  eventTypeId: '1',
  createdAt: '2024-01-01T00:00:00Z',
  category: { id: '1', name: category, color: '#000000', description: null },
  careerImpact: {
    overall: careerImpactScore,
    confidence: 0.9,
    components: {
      skillRelevance: 0,
      careerStageMatch: 0,
      networkingValue: 0,
      industryRelevance: 0,
      timingBonus: 0
    },
    explanation: {
      reasons: [],
      matchedSkills: [],
      speakerHighlights: [],
      careerImpactCategory: 'high',
      confidenceFactors: []
    },
    metadata: {
      algorithmVersion: 'v2.0.0',
      calculatedAt: '2024-01-01T00:00:00Z',
      careerProfileHash: 'test',
      eventDataHash: 'test'
    }
  },
  isCareerScored: true
});

describe('DiversityEnhancementService', () => {
  describe('enhanceRecommendations', () => {
    it('should not enhance when diversity is already good', () => {
      const events = [
        createMockEvent('1', 'workshop', 'San Francisco, CA'),
        createMockEvent('2', 'meetup', 'New York, NY'),
        createMockEvent('3', 'conference', 'London, UK'),
        createMockEvent('4', 'webinar', 'Online', 'https://zoom.us/123')
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events);

      expect(result.enhancedRanking).toEqual(events);
      expect(result.swapsApplied).toHaveLength(0);
      expect(result.diversityMetrics.needsEnhancement).toBe(false);
    });

    it('should enhance when too many events are of the same type', () => {
      const events = [
        createMockEvent('1', 'workshop', 'San Francisco, CA', null, 0.9),
        createMockEvent('2', 'workshop', 'New York, NY', null, 0.8),
        createMockEvent('3', 'workshop', 'London, UK', null, 0.7),
        createMockEvent('4', 'meetup', 'Online', 'https://zoom.us/123', 0.6),
        createMockEvent('5', 'conference', 'Berlin, DE', null, 0.5)
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events, 4);

      expect(result.swapsApplied.length).toBeGreaterThan(0);
      expect(result.diversityMetrics.needsEnhancement).toBe(true);
    });

    it('should not enhance when there are too few events', () => {
      const events = [
        createMockEvent('1', 'workshop', 'San Francisco, CA'),
        createMockEvent('2', 'workshop', 'New York, NY')
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events);

      expect(result.enhancedRanking).toEqual(events);
      expect(result.swapsApplied).toHaveLength(0);
    });

    it('should respect user preference for focused recommendations', () => {
      const events = [
        createMockEvent('1', 'workshop', 'San Francisco, CA', null, 0.9),
        createMockEvent('2', 'workshop', 'New York, NY', null, 0.8),
        createMockEvent('3', 'workshop', 'London, UK', null, 0.7),
        createMockEvent('4', 'meetup', 'Online', 'https://zoom.us/123', 0.6)
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events, 4, 'focused');

      expect(result.enhancedRanking).toEqual(events);
      expect(result.swapsApplied).toHaveLength(0);
    });

    it('should apply diversity bonus/penalty to scores', () => {
      const events = [
        createMockEvent('1', 'workshop', 'San Francisco, CA', null, 0.8),
        createMockEvent('2', 'workshop', 'New York, NY', null, 0.8),
        createMockEvent('3', 'workshop', 'London, UK', null, 0.8),
        createMockEvent('4', 'meetup', 'Online', 'https://zoom.us/123', 0.6)
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events, 4);

      // Check that scores have been adjusted
      const enhancedEvents = result.enhancedRanking as EventWithCareerImpact[];
      const hasAdjustedScores = enhancedEvents.some(event => 
        event.careerImpact?.overall !== 0.8 && event.careerImpact?.overall !== 0.6
      );
      
      expect(hasAdjustedScores).toBe(true);
    });

    it('should handle events without career impact scores', () => {
      const events = [
        { ...createMockEvent('1', 'workshop', 'San Francisco, CA'), careerImpact: undefined },
        { ...createMockEvent('2', 'workshop', 'New York, NY'), careerImpact: undefined },
        { ...createMockEvent('3', 'workshop', 'London, UK'), careerImpact: undefined },
        { ...createMockEvent('4', 'meetup', 'Online', 'https://zoom.us/123'), careerImpact: undefined }
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events, 4);

      expect(result.enhancedRanking).toBeDefined();
      expect(result.diversityMetrics).toBeDefined();
    });
  });

  describe('diversity metrics calculation', () => {
    it('should calculate correct diversity score for mixed events', () => {
      const events = [
        createMockEvent('1', 'workshop', 'San Francisco, CA'),
        createMockEvent('2', 'meetup', 'New York, NY'),
        createMockEvent('3', 'conference', 'London, UK'),
        createMockEvent('4', 'webinar', 'Online', 'https://zoom.us/123')
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events);
      
      // For mixed events, diversity should be good and no enhancement needed
      expect(result.diversityMetrics.diversityScore).toBeGreaterThan(0.5);
      expect(result.diversityMetrics.needsEnhancement).toBe(false);
    });

    it('should detect over-represented event types', () => {
      const events = [
        createMockEvent('1', 'workshop', 'San Francisco, CA'),
        createMockEvent('2', 'workshop', 'New York, NY'),
        createMockEvent('3', 'workshop', 'London, UK'),
        createMockEvent('4', 'meetup', 'Online', 'https://zoom.us/123')
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events, 4);
      
      expect(result.diversityMetrics.needsEnhancement).toBe(true);
    });
  });
});
