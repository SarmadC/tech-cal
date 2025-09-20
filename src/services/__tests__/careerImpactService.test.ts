import { describe, it, expect, beforeEach } from 'vitest';
import { CareerImpactService } from '../careerImpactService';
import { CareerImpactTestUtils } from './careerImpactService.testUtils';
import { CareerImpactCalculationInput, CareerImpactCalculationOptions } from '@/types/careerImpact';
import { Event } from '@/types';
import { CareerProfile } from '@/types/career';

describe('CareerImpactService', () => {
  let mockEvent: Event;
  let mockCareerProfile: CareerProfile;
  let mockInput: CareerImpactCalculationInput;

  beforeEach(() => {
    mockEvent = CareerImpactTestUtils.createMockEvent();
    mockCareerProfile = CareerImpactTestUtils.createMockCareerProfile();
    mockInput = {
      event: mockEvent,
      careerProfile: mockCareerProfile
    };
  });

  describe('calculateCareerImpactScore', () => {
    it('should calculate a valid career impact score', () => {
      const result = CareerImpactService.calculateCareerImpactScore(mockInput);

      // Validate overall score
      CareerImpactTestUtils.assertScoreInRange(result.overall);
      expect(result.overall).toBeGreaterThan(0);

      // Validate confidence
      CareerImpactTestUtils.assertConfidenceInRange(result.confidence);

      // Validate components
      expect(result.components).toHaveProperty('skillRelevance');
      expect(result.components).toHaveProperty('careerStageMatch');
      expect(result.components).toHaveProperty('networkingValue');
      expect(result.components).toHaveProperty('industryRelevance');
      expect(result.components).toHaveProperty('timingBonus');

      // Validate explanation
      expect(result.explanation).toHaveProperty('reasons');
      expect(result.explanation).toHaveProperty('matchedSkills');
      expect(result.explanation).toHaveProperty('speakerHighlights');
      expect(result.explanation).toHaveProperty('careerImpactCategory');
      expect(result.explanation).toHaveProperty('confidenceFactors');

      // Validate metadata
      expect(result.metadata).toHaveProperty('calculatedAt');
      expect(result.metadata).toHaveProperty('algorithmVersion');
      expect(result.metadata).toHaveProperty('careerProfileHash');
      expect(result.metadata).toHaveProperty('eventDataHash');
    });

    it('should give higher scores to high-impact events', () => {
      const highImpactEvent = CareerImpactTestUtils.createHighImpactEvent();
      const lowImpactEvent = CareerImpactTestUtils.createLowImpactEvent();

      const highImpactInput = { event: highImpactEvent, careerProfile: mockCareerProfile };
      const lowImpactInput = { event: lowImpactEvent, careerProfile: mockCareerProfile };

      const highImpactScore = CareerImpactService.calculateCareerImpactScore(highImpactInput);
      const lowImpactScore = CareerImpactService.calculateCareerImpactScore(lowImpactInput);

      expect(highImpactScore.overall).toBeGreaterThan(lowImpactScore.overall);
    });

    it('should handle different career profiles appropriately', () => {
      const seniorProfile = CareerImpactTestUtils.createSeniorCareerProfile();
      const juniorProfile = CareerImpactTestUtils.createJuniorCareerProfile();

      const seniorInput = { event: mockEvent, careerProfile: seniorProfile };
      const juniorInput = { event: mockEvent, careerProfile: juniorProfile };

      const seniorScore = CareerImpactService.calculateCareerImpactScore(seniorInput);
      const juniorScore = CareerImpactService.calculateCareerImpactScore(juniorInput);

      // Both should be valid scores
      CareerImpactTestUtils.assertScoreInRange(seniorScore.overall);
      CareerImpactTestUtils.assertScoreInRange(juniorScore.overall);
      CareerImpactTestUtils.assertConfidenceInRange(seniorScore.confidence);
      CareerImpactTestUtils.assertConfidenceInRange(juniorScore.confidence);
    });

    it('should handle custom algorithm options', () => {
      const customOptions: CareerImpactCalculationOptions = {
        algorithmVersion: '2.0.0',
        includeExplanations: true,
        debugMode: true
      };

      const result = CareerImpactService.calculateCareerImpactScore(mockInput, customOptions);

      expect(result.metadata.algorithmVersion).toBe('2.0.0');
      expect(result.explanation.reasons.length).toBeGreaterThan(0);
    });

    it('should handle events with minimal data gracefully', () => {
      const minimalEvent = CareerImpactTestUtils.createMockEvent({
        description: '',
        speakerLineup: [],
        category: undefined,
        priceRange: undefined
      });

      const minimalInput = { event: minimalEvent, careerProfile: mockCareerProfile };
      const result = CareerImpactService.calculateCareerImpactScore(minimalInput);

      // Should still produce valid scores
      CareerImpactTestUtils.assertScoreInRange(result.overall);
      CareerImpactTestUtils.assertConfidenceInRange(result.confidence);
      
      // Confidence should be reasonable even with minimal data
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });

    it('should handle different event types correctly', () => {
      const eventTypes = ['workshop', 'conference', 'meetup', 'webinar', 'training', 'course', 'networking', 'social'];
      
      eventTypes.forEach(eventType => {
        const event = CareerImpactTestUtils.createMockEvent({
          category: { id: eventType, name: eventType, description: `${eventType} event`, color: '#000000' }
        });
        
        const input = { event, careerProfile: mockCareerProfile };
        const result = CareerImpactService.calculateCareerImpactScore(input);
        
        CareerImpactTestUtils.assertScoreInRange(result.overall);
        CareerImpactTestUtils.assertConfidenceInRange(result.confidence);
      });
    });

    it('should calculate consistent scores for identical inputs', () => {
      const result1 = CareerImpactService.calculateCareerImpactScore(mockInput);
      const result2 = CareerImpactService.calculateCareerImpactScore(mockInput);

      expect(result1.overall).toBe(result2.overall);
      expect(result1.confidence).toBe(result2.confidence);
      expect(result1.components.skillRelevance).toBe(result2.components.skillRelevance);
    });
  });

  describe('calculateBatchCareerImpact', () => {
    it('should process multiple events successfully', async () => {
      const events = CareerImpactTestUtils.createBatchEvents();
      const batchInput = {
        events,
        careerProfile: mockCareerProfile
      };

      const result = await CareerImpactService.calculateBatchCareerImpact(batchInput);

      expect(result.scores.size).toBe(events.length);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.totalEvents).toBe(events.length);
      expect(result.stats.successfulCalculations).toBe(events.length);
      expect(result.stats.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors gracefully in batch processing', async () => {
      const events = [
        CareerImpactTestUtils.createMockEvent({ id: 'valid-event' }),
        CareerImpactTestUtils.createMockEvent({ id: 'invalid-event', title: '' }) // Invalid event
      ];

      const batchInput = {
        events,
        careerProfile: mockCareerProfile
      };

      const result = await CareerImpactService.calculateBatchCareerImpact(batchInput);

      // Should process valid events and collect errors for invalid ones
      expect(result.scores.size).toBeGreaterThan(0);
      expect(result.stats.successfulCalculations).toBeGreaterThan(0);
    });

    it('should track processing time accurately', async () => {
      const events = CareerImpactTestUtils.createBatchEvents();
      const batchInput = {
        events,
        careerProfile: mockCareerProfile
      };

      const startTime = Date.now();
      const result = await CareerImpactService.calculateBatchCareerImpact(batchInput);
      const endTime = Date.now();

      expect(result.stats.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.stats.processingTimeMs).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some tolerance
    });
  });

  describe('getCareerImpactScoreLite', () => {
    it('should return lightweight score with essential data only', () => {
      const result = CareerImpactService.getCareerImpactScoreLite(mockInput);

      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('category');
      
      // Should not include detailed components or explanations
      expect(result).not.toHaveProperty('components');
      expect(result).not.toHaveProperty('explanation');
      expect(result).not.toHaveProperty('metadata');

      CareerImpactTestUtils.assertScoreInRange(result.overall);
      CareerImpactTestUtils.assertConfidenceInRange(result.confidence);
      CareerImpactTestUtils.assertValidImpactCategory(result.category);
    });

    it('should match overall score with full calculation', () => {
      const fullResult = CareerImpactService.calculateCareerImpactScore(mockInput);
      const liteResult = CareerImpactService.getCareerImpactScoreLite(mockInput);

      expect(liteResult.overall).toBe(fullResult.overall);
      expect(liteResult.confidence).toBe(fullResult.confidence);
      expect(liteResult.category).toBe(fullResult.explanation.careerImpactCategory);
    });
  });

  describe('Edge Cases', () => {
    it('should handle events with very long descriptions', () => {
      const longDescriptionEvent = CareerImpactTestUtils.createMockEvent({
        description: 'A'.repeat(10000) // Very long description
      });

      const input = { event: longDescriptionEvent, careerProfile: mockCareerProfile };
      const result = CareerImpactService.calculateCareerImpactScore(input);

      CareerImpactTestUtils.assertScoreInRange(result.overall);
      CareerImpactTestUtils.assertConfidenceInRange(result.confidence);
    });

    it('should handle events with many speakers', () => {
      const manySpeakersEvent = CareerImpactTestUtils.createMockEvent({
        speakerLineup: Array.from({ length: 20 }, (_, i) => ({
          id: `speaker-${i}`,
          name: `Speaker ${i}`,
          title: 'Expert',
          company: 'Tech Corp',
          bio: 'Expert in field',
          photoUrl: `https://example.com/speaker${i}.jpg`
        }))
      });

      const input = { event: manySpeakersEvent, careerProfile: mockCareerProfile };
      const result = CareerImpactService.calculateCareerImpactScore(input);

      CareerImpactTestUtils.assertScoreInRange(result.overall);
      CareerImpactTestUtils.assertConfidenceInRange(result.confidence);
    });

    it('should handle events with future dates far in the future', () => {
      const futureEvent = CareerImpactTestUtils.createMockEvent({
        startTime: '2025-12-31T09:00:00Z',
        endTime: '2025-12-31T17:00:00Z'
      });

      const input = { event: futureEvent, careerProfile: mockCareerProfile };
      const result = CareerImpactService.calculateCareerImpactScore(input);

      CareerImpactTestUtils.assertScoreInRange(result.overall);
      CareerImpactTestUtils.assertConfidenceInRange(result.confidence);
    });

    it('should handle career profiles with minimal data', () => {
      const minimalProfile = CareerImpactTestUtils.createMockCareerProfile({
        primarySkills: [],
        careerGoals: [],
        interests: []
      });

      const input = { event: mockEvent, careerProfile: minimalProfile };
      const result = CareerImpactService.calculateCareerImpactScore(input);

      CareerImpactTestUtils.assertScoreInRange(result.overall);
      CareerImpactTestUtils.assertConfidenceInRange(result.confidence);
      
      // Confidence should be reasonable even with minimal profile data
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });
});
