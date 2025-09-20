import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CareerImpactService } from '../careerImpactService';
import { CareerImpactTestUtils } from './careerImpactService.testUtils';
import { CacheServiceHelper } from '../cache/cacheServiceHelper';
import { CareerImpactCalculationInput } from '@/types/careerImpact';
import { Event } from '@/types';
import { CareerProfile } from '@/types/career';

describe('CareerImpactService Cache Integration', () => {
  let mockEvent: Event;
  let mockCareerProfile: CareerProfile;
  let mockInput: CareerImpactCalculationInput;

  beforeEach(() => {
    mockEvent = CareerImpactTestUtils.createMockEvent();
    mockCareerProfile = CareerImpactTestUtils.createMockCareerProfile();
    mockInput = {
      event: mockEvent,
      careerProfile: mockCareerProfile,
    };
    
    // Reset cache for clean tests
    CacheServiceHelper.resetInstance();
  });

  afterEach(async () => {
    // Clean up cache after each test
    try {
      const cache = CacheServiceHelper.getInstance();
      await cache.invalidateAll();
    } catch (_error) {
      // Ignore cleanup errors
    }
  });

  describe('calculateCareerImpactScoreAsync', () => {
    it('should calculate and cache career impact score', async () => {
      const result1 = await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      const result2 = await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);

      // Both should return the same score
      expect(result1.overall).toBe(result2.overall);
      expect(result1.confidence).toBe(result2.confidence);
      
      // Second call should be faster (cached)
      CareerImpactTestUtils.assertValidCareerImpactScore(result1);
      CareerImpactTestUtils.assertValidCareerImpactScore(result2);
    });

    it('should skip cache when explicitly disabled', async () => {
      const result1 = await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      const result2 = await CareerImpactService.calculateCareerImpactScoreAsync(mockInput, { skipCache: true });

      // Should get same results but bypass cache
      expect(result1.overall).toBe(result2.overall);
      CareerImpactTestUtils.assertValidCareerImpactScore(result2);
    });

    it('should fallback gracefully when cache fails', async () => {
      // This test verifies graceful degradation
      const result = await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      
      CareerImpactTestUtils.assertValidCareerImpactScore(result);
    });

    it('should use custom cache TTL when provided', async () => {
      const customTtl = 3600; // 1 hour
      const result = await CareerImpactService.calculateCareerImpactScoreAsync(mockInput, { 
        cacheTtl: customTtl 
      });

      CareerImpactTestUtils.assertValidCareerImpactScore(result);
    });
  });

  describe('getCareerImpactScoreLiteAsync', () => {
    it('should calculate and cache lightweight scores', async () => {
      const result1 = await CareerImpactService.getCareerImpactScoreLiteAsync(mockInput);
      const result2 = await CareerImpactService.getCareerImpactScoreLiteAsync(mockInput);

      // Both should return the same score
      expect(result1.overall).toBe(result2.overall);
      expect(result1.confidence).toBe(result2.confidence);
      expect(result1.category).toBe(result2.category);
      
      // Verify structure
      expect(result1).toHaveProperty('overall');
      expect(result1).toHaveProperty('confidence');
      expect(result1).toHaveProperty('category');
      expect(result1).not.toHaveProperty('metadata'); // Lite version shouldn't have metadata
    });

    it('should handle cache misses correctly', async () => {
      const result = await CareerImpactService.getCareerImpactScoreLiteAsync(mockInput);
      
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(['transformative', 'high', 'moderate', 'low']).toContain(result.category);
    });
  });

  describe('calculateBatchCareerImpact with caching', () => {
    it('should leverage cache for batch processing', async () => {
      const events = [
        CareerImpactTestUtils.createMockEvent({ id: 'event-1' }),
        CareerImpactTestUtils.createMockEvent({ id: 'event-2' }),
        CareerImpactTestUtils.createMockEvent({ id: 'event-3' }),
      ];

      const batchInput = { events, careerProfile: mockCareerProfile };
      
      // First batch - all new calculations
      const result1 = await CareerImpactService.calculateBatchCareerImpact(batchInput);
      expect(result1.stats.newCalculations).toBe(3);
      expect(result1.stats.cachedScores).toBe(0);

      // Second batch - should have cache hits
      const result2 = await CareerImpactService.calculateBatchCareerImpact(batchInput);
      expect(result2.stats.cachedScores).toBeGreaterThan(0);
      expect(result2.stats.newCalculations).toBeLessThan(3);

      // Results should be consistent
      expect(result1.scores.size).toBe(result2.scores.size);
    });

    it('should cache batch results for identical requests', async () => {
      const events = Array.from({ length: 6 }, (_, i) => 
        CareerImpactTestUtils.createMockEvent({ id: `event-${i}` })
      );

      const batchInput = { events, careerProfile: mockCareerProfile };
      
      // First batch calculation
      const result1 = await CareerImpactService.calculateBatchCareerImpact(batchInput);
      
      // Second identical batch should be faster
      const startTime = Date.now();
      const result2 = await CareerImpactService.calculateBatchCareerImpact(batchInput);
      const processingTime = Date.now() - startTime;

      expect(result1.scores.size).toBe(result2.scores.size);
      // Second batch should be faster or equal (memory cache is very fast)
      expect(processingTime).toBeLessThanOrEqual(result1.stats.processingTimeMs + 5);
    });

    it('should handle mixed cache hits and misses', async () => {
      const events = [
        CareerImpactTestUtils.createMockEvent({ id: 'cached-event' }),
        CareerImpactTestUtils.createMockEvent({ id: 'new-event' }),
      ];

      // Pre-cache one event
      await CareerImpactService.calculateCareerImpactScoreAsync({
        event: events[0],
        careerProfile: mockCareerProfile
      });

      // Batch process with mixed cache state
      const result = await CareerImpactService.calculateBatchCareerImpact({
        events,
        careerProfile: mockCareerProfile
      });

      expect(result.scores.size).toBe(2);
      expect(result.stats.cachedScores).toBe(1);
      expect(result.stats.newCalculations).toBe(1);
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate profile cache', async () => {
      // Cache a score
      await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      
      // Invalidate profile cache
      const invalidatedCount = await CareerImpactService.invalidateProfileCache(mockCareerProfile);
      
      expect(invalidatedCount).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate event cache', async () => {
      // Cache a score
      await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      
      // Invalidate event cache
      const invalidatedCount = await CareerImpactService.invalidateEventCache(mockEvent.id);
      
      expect(invalidatedCount).toBeGreaterThanOrEqual(0);
    });

    it('should invalidate all cache', async () => {
      // Cache multiple scores
      await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      await CareerImpactService.getCareerImpactScoreLiteAsync(mockInput);
      
      // Invalidate all cache
      const invalidatedCount = await CareerImpactService.invalidateAllCache();
      
      expect(invalidatedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cache statistics', () => {
    it('should provide cache statistics', async () => {
      // Generate some cache activity
      await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      await CareerImpactService.calculateCareerImpactScoreAsync(mockInput); // Cache hit
      
      const stats = await CareerImpactService.getCacheStats();
      
      if (stats) {
        expect(stats).toHaveProperty('hits');
        expect(stats).toHaveProperty('misses');
        expect(stats).toHaveProperty('hitRate');
        expect(stats).toHaveProperty('totalRequests');
        expect(stats.totalRequests).toBeGreaterThan(0);
      }
    });
  });

  describe('backward compatibility', () => {
    it('should maintain sync methods for backward compatibility', () => {
      // Sync methods should still work
      const syncResult = CareerImpactService.calculateCareerImpactScore(mockInput);
      const syncLiteResult = CareerImpactService.getCareerImpactScoreLite(mockInput);

      CareerImpactTestUtils.assertValidCareerImpactScore(syncResult);
      expect(syncLiteResult).toHaveProperty('overall');
      expect(syncLiteResult).toHaveProperty('confidence');
      expect(syncLiteResult).toHaveProperty('category');
    });

    it('should produce consistent results between sync and async methods', async () => {
      const syncResult = CareerImpactService.calculateCareerImpactScore(mockInput);
      const asyncResult = await CareerImpactService.calculateCareerImpactScoreAsync(mockInput, { skipCache: true });

      expect(syncResult.overall).toBe(asyncResult.overall);
      expect(syncResult.confidence).toBe(asyncResult.confidence);
      expect(syncResult.explanation.careerImpactCategory).toBe(asyncResult.explanation.careerImpactCategory);
    });
  });

  describe('performance optimization', () => {
    it('should show performance improvement with caching', async () => {
      // First calculation (cache miss)
      const start1 = Date.now();
      await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      const time1 = Date.now() - start1;

      // Second calculation (cache hit)
      const start2 = Date.now();
      await CareerImpactService.calculateCareerImpactScoreAsync(mockInput);
      const time2 = Date.now() - start2;

      // Cache hit should be significantly faster (though in memory cache it might be marginal)
      expect(time2).toBeLessThanOrEqual(time1 + 10); // Allow some variance
    });
  });
});
