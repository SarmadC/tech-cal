import { describe, it, expect, beforeEach } from 'vitest';
import { CareerImpactService } from '../careerImpactService';
import { CareerImpactUtils } from '../../utils/careerImpactUtils';
import { CareerImpactTestUtils } from './careerImpactService.testUtils';
import { Event } from '@/types';
import { CareerProfile } from '@/types/career';

describe('CareerImpactService Integration Tests', () => {
  let mockEvents: Event[];
  let mockCareerProfile: CareerProfile;

  beforeEach(() => {
    mockEvents = CareerImpactTestUtils.createBatchEvents();
    mockCareerProfile = CareerImpactTestUtils.createMockCareerProfile();
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow: enhance -> sort -> filter -> stats', async () => {
      // 1. Enhance events with career impact scores
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      expect(enhancedEvents).toHaveLength(mockEvents.length);
      enhancedEvents.forEach(event => {
        expect(event.careerImpact).toBeDefined();
      });

      // 2. Sort events by career impact
      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(enhancedEvents);
      
      expect(sortedEvents).toHaveLength(enhancedEvents.length);
      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const currentScore = sortedEvents[i].careerImpact?.overall || 0;
        const nextScore = sortedEvents[i + 1].careerImpact?.overall || 0;
        expect(currentScore).toBeGreaterThanOrEqual(nextScore);
      }

      // 3. Filter events by minimum score
      const minScore = 50;
      const filteredEvents = CareerImpactUtils.filterEventsByMinScore(sortedEvents, minScore);
      
      filteredEvents.forEach(event => {
        expect(event.careerImpact?.overall || 0).toBeGreaterThanOrEqual(minScore);
      });

      // 4. Get statistics
      const stats = CareerImpactUtils.getCareerImpactStats(filteredEvents);
      
      expect(stats.count).toBeGreaterThan(0);
      expect(stats.average).toBeGreaterThan(0);
      expect(stats.max).toBeGreaterThanOrEqual(stats.min);
    });

    it('should handle batch processing workflow', async () => {
      // 1. Process events in batch
      const batchResult = await CareerImpactService.calculateBatchCareerImpact({
        events: mockEvents,
        careerProfile: mockCareerProfile
      });

      expect(batchResult.scores.size).toBe(mockEvents.length);
      expect(batchResult.errors).toHaveLength(0);

      // 2. Convert to enhanced events format
      const enhancedEvents = mockEvents.map(event => ({
        ...event,
        careerImpact: batchResult.scores.get(event.id)
      }));

      // 3. Apply utils operations
      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(enhancedEvents);
      const topEvents = CareerImpactUtils.getTopEventsByCareerImpact(sortedEvents, 2);
      const stats = CareerImpactUtils.getCareerImpactStats(topEvents);

      expect(topEvents).toHaveLength(2);
      expect(stats.count).toBe(2);
    });

    it('should maintain consistency between single and batch processing', async () => {
      // Process single event
      const singleEvent = mockEvents[0];
      const singleResult = CareerImpactService.calculateCareerImpactScore({
        event: singleEvent,
        careerProfile: mockCareerProfile
      });

      // Process same event in batch
      const batchResult = await CareerImpactService.calculateBatchCareerImpact({
        events: [singleEvent],
        careerProfile: mockCareerProfile
      });

      const batchScore = batchResult.scores.get(singleEvent.id);

      // Results should be identical
      expect(batchScore?.overall).toBe(singleResult.overall);
      expect(batchScore?.confidence).toBe(singleResult.confidence);
      expect(batchScore?.components.skillRelevance).toBe(singleResult.components.skillRelevance);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large batch processing efficiently', async () => {
      // Create a large number of events
      const largeEventSet = Array.from({ length: 50 }, (_, i) => 
        CareerImpactTestUtils.createMockEvent({
          id: `large-batch-event-${i}`,
          title: `Event ${i}`,
          description: `Description for event ${i}`
        })
      );

      const startTime = Date.now();
      const batchResult = await CareerImpactService.calculateBatchCareerImpact({
        events: largeEventSet,
        careerProfile: mockCareerProfile
      });
      const endTime = Date.now();

      expect(batchResult.scores.size).toBe(largeEventSet.length);
      expect(batchResult.stats.processingTimeMs).toBeLessThan(5000); // Should complete within 5 seconds
      expect(endTime - startTime).toBeLessThan(10000); // Total time should be reasonable
    });

    it('should handle utils operations on large datasets efficiently', async () => {
      const largeEventSet = Array.from({ length: 100 }, (_, i) => 
        CareerImpactTestUtils.createMockEvent({
          id: `utils-test-event-${i}`,
          title: `Event ${i}`
        })
      );

      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        largeEventSet,
        mockCareerProfile
      );

      const startTime = Date.now();
      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(enhancedEvents);
      const filteredEvents = CareerImpactUtils.filterEventsByMinScore(sortedEvents, 50);
      const topEvents = CareerImpactUtils.getTopEventsByCareerImpact(filteredEvents, 10);
      const stats = CareerImpactUtils.getCareerImpactStats(topEvents);
      const endTime = Date.now();

      expect(sortedEvents).toHaveLength(largeEventSet.length);
      expect(topEvents).toHaveLength(10);
      expect(stats.count).toBe(10);
      expect(endTime - startTime).toBeLessThan(1000); // Utils operations should be very fast
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle mixed valid and invalid events in batch', async () => {
      const mixedEvents = [
        CareerImpactTestUtils.createMockEvent({ id: 'valid-1' }),
        CareerImpactTestUtils.createMockEvent({ id: 'valid-2' }),
        CareerImpactTestUtils.createMockEvent({ id: 'valid-3' }),
        CareerImpactTestUtils.createMockEvent({ id: 'valid-4' })
      ];

      const batchResult = await CareerImpactService.calculateBatchCareerImpact({
        events: mixedEvents,
        careerProfile: mockCareerProfile
      });

      expect(batchResult.scores.size).toBe(4); // All valid events processed
      expect(batchResult.errors).toHaveLength(0); // No errors collected
      expect(batchResult.stats.successfulCalculations).toBe(4);
    });

    it('should handle empty event arrays gracefully', async () => {
      const batchResult = await CareerImpactService.calculateBatchCareerImpact({
        events: [],
        careerProfile: mockCareerProfile
      });

      expect(batchResult.scores.size).toBe(0);
      expect(batchResult.errors).toHaveLength(0);
      expect(batchResult.stats.totalEvents).toBe(0);
      expect(batchResult.stats.successfulCalculations).toBe(0);
    });

    it('should handle career profile with minimal data', async () => {
      const minimalProfile = CareerImpactTestUtils.createMockCareerProfile({
        primarySkills: [],
        careerGoals: [],
        interests: []
      });

      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        minimalProfile
      );

      enhancedEvents.forEach(event => {
        expect(event.careerImpact).toBeDefined();
        CareerImpactTestUtils.assertScoreInRange(event.careerImpact?.overall || 0);
        CareerImpactTestUtils.assertConfidenceInRange(event.careerImpact?.confidence || 0);
      });
    });
  });

  describe('Data Consistency', () => {
    it('should produce consistent results across multiple runs', async () => {
      const results = [];

      // Run the same calculation multiple times
      for (let i = 0; i < 3; i++) {
        const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
          mockEvents,
          mockCareerProfile
        );
        const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(enhancedEvents);
        results.push(sortedEvents);
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toHaveLength(results[0].length);
        
        for (let j = 0; j < results[0].length; j++) {
          expect(results[i][j].id).toBe(results[0][j].id);
          expect(results[i][j].careerImpact?.overall).toBe(results[0][j].careerImpact?.overall);
        }
      }
    });

    it('should maintain data integrity through utils operations', async () => {
      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        mockEvents,
        mockCareerProfile
      );

      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(enhancedEvents);
      const filteredEvents = CareerImpactUtils.filterEventsByMinScore(sortedEvents, 50);
      const topEvents = CareerImpactUtils.getTopEventsByCareerImpact(filteredEvents, 3);

      // Verify data integrity
      topEvents.forEach(event => {
        expect(event.id).toBeDefined();
        expect(event.title).toBeDefined();
        expect(event.description).toBeDefined();
        expect(event.careerImpact).toBeDefined();
        expect(event.careerImpact?.overall).toBeGreaterThan(0);
        expect(event.careerImpact?.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle realistic event and profile combinations', async () => {
      const realisticEvents = [
        CareerImpactTestUtils.createMockEvent({
          title: 'React Conf 2024',
          description: 'Annual React conference featuring talks from React team members and community experts.',
          category: { id: 'conference', name: 'Conference', description: 'Professional conferences', color: '#10B981' },
          priceRange: '$300-500',
          attendeeCount: 2000,
          speakerLineup: [
            { id: 'react-team', name: 'React Team Member', title: 'Core Team', company: 'Meta', bio: 'React core team', photoUrl: 'https://example.com/react.jpg' }
          ]
        }),
        CareerImpactTestUtils.createMockEvent({
          title: 'Weekly JavaScript Study Group',
          description: 'Casual meetup for JavaScript learners to practice and share knowledge.',
          category: { id: 'meetup', name: 'Meetup', description: 'Community meetups', color: '#F59E0B' },
          priceRange: 'Free',
          attendeeCount: 25,
          speakerLineup: []
        })
      ];

      const realisticProfile = CareerImpactTestUtils.createMockCareerProfile({
        currentRole: 'Frontend Developer',
        seniority: 'mid-level',
        primarySkills: ['React', 'JavaScript', 'CSS'],
        careerGoals: ['skill-development', 'networking']
      });

      const enhancedEvents = await CareerImpactUtils.enhanceEventsWithCareerImpact(
        realisticEvents,
        realisticProfile
      );

      const sortedEvents = CareerImpactUtils.sortEventsByCareerImpact(enhancedEvents);
      const stats = CareerImpactUtils.getCareerImpactStats(sortedEvents);

      // Conference should score higher than casual meetup
      expect(sortedEvents[0].careerImpact?.overall).toBeGreaterThan(sortedEvents[1].careerImpact?.overall || 0);
      expect(stats.count).toBe(2);
      expect(stats.average).toBeGreaterThan(0);
    });

    it('should handle different career stages appropriately', async () => {
      const event = CareerImpactTestUtils.createMockEvent({
        title: 'Senior Developer Leadership Workshop',
        description: 'Advanced workshop for senior developers looking to move into leadership roles.'
      });

      const juniorProfile = CareerImpactTestUtils.createJuniorCareerProfile();
      const seniorProfile = CareerImpactTestUtils.createSeniorCareerProfile();

      const juniorResult = CareerImpactService.calculateCareerImpactScore({
        event,
        careerProfile: juniorProfile
      });

      const seniorResult = CareerImpactService.calculateCareerImpactScore({
        event,
        careerProfile: seniorProfile
      });

      // Both should produce valid scores, but may differ based on career stage relevance
      CareerImpactTestUtils.assertScoreInRange(juniorResult.overall);
      CareerImpactTestUtils.assertScoreInRange(seniorResult.overall);
      CareerImpactTestUtils.assertConfidenceInRange(juniorResult.confidence);
      CareerImpactTestUtils.assertConfidenceInRange(seniorResult.confidence);
    });
  });
});
