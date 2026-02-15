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

  describe('hybrid event detection', () => {
    it('should classify event with livestreamUrl AND physical location as hybrid, not virtual', () => {
      // Event with both a livestream and a physical location (not virtual-sounding)
      const events = [
        createMockEvent('1', 'conference', 'San Francisco Convention Center', 'https://stream.example.com'),
        createMockEvent('2', 'conference', 'San Francisco, CA'),
        createMockEvent('3', 'conference', 'New York, NY'),
        createMockEvent('4', 'meetup', 'Boston, MA'),
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events, 4);

      // The hybrid event MUST appear in the hybrid bucket, NOT the virtual bucket
      expect(result.diversityMetrics.formatDistribution.get('hybrid')).toBe(1);
      expect(result.diversityMetrics.formatDistribution.has('virtual')).toBe(false);
    });

    it('should classify event with livestreamUrl and virtual location as virtual, not hybrid', () => {
      // Use enough same-type events to trigger enhancement and get real metrics
      const events = [
        createMockEvent('1', 'webinar', 'Online', 'https://zoom.us/123', 0.9),
        createMockEvent('2', 'webinar', 'Virtual', 'https://stream.example.com', 0.85),
        createMockEvent('3', 'webinar', 'San Francisco, CA', null, 0.8),
        createMockEvent('4', 'webinar', 'New York, NY', null, 0.7),
        createMockEvent('5', 'conference', 'Boston, MA', null, 0.5),
      ];

      const result = DiversityEnhancementService.enhanceRecommendations(events, 5);

      // When enhancement is needed, metrics are calculated
      // Virtual-location + livestream should be virtual, not hybrid
      expect(result.diversityMetrics.formatDistribution.get('virtual')).toBe(2);
      expect(result.diversityMetrics.formatDistribution.has('hybrid')).toBe(false);
    });
  });

  describe('diversity swap with underrepresented types', () => {
    it('should swap in underrepresented types, not just completely novel ones', () => {
      // Set up: 8 conferences, 1 workshop, 1 meetup in top 10
      // Workshop and meetup are underrepresented (10% each < 30% threshold)
      // Remaining events include more workshops that should be eligible for swap
      const topEvents = [
        ...Array.from({ length: 8 }, (_, i) =>
          createMockEvent(`conf-${i}`, 'conference', `City ${i}`, null, 90 - i)
        ),
        createMockEvent('ws-1', 'workshop', 'City A', null, 70),
        createMockEvent('mu-1', 'meetup', 'City B', null, 65),
      ];
      const remainingEvents = [
        createMockEvent('ws-2', 'workshop', 'City C', null, 80),
        createMockEvent('mu-2', 'meetup', 'City D', null, 75),
      ];
      const allEvents = [...topEvents, ...remainingEvents];

      const result = DiversityEnhancementService.enhanceRecommendations(allEvents, 10);

      expect(result.diversityMetrics.needsEnhancement).toBe(true);
      // At least one swap must occur — conferences are overrepresented at 80%
      expect(result.swapsApplied.length).toBeGreaterThan(0);
      // The swapped-in event should be a workshop or meetup (underrepresented, not absent)
      const swappedInTypes = result.swapsApplied.map(s => s.reason);
      expect(swappedInTypes.every(r => r.includes('workshop') || r.includes('meetup'))).toBe(true);
    });
  });
});
