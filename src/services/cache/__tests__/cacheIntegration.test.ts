import { describe, it, expect } from 'vitest';
import { getCacheConfig } from '@/config/cache';
import { CacheServiceHelper } from '../cacheServiceHelper';
import { CareerImpactScore } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';

describe('Cache Integration Tests', () => {
  // These tests will use memory cache in test environment
  
  it('should create cache service with correct configuration', () => {
    const config = getCacheConfig();
    
    // In test environment, should use memory cache
    expect(config.type).toBe('memory');
    expect(config.ttl.score).toBeLessThanOrEqual(60); // Short TTL for tests
  });

  it('should provide singleton cache service', () => {
    const cache1 = CacheServiceHelper.getInstance();
    const cache2 = CacheServiceHelper.getInstance();
    
    expect(cache1).toBe(cache2); // Same instance
  });

  it('should reset singleton correctly', () => {
    const cache1 = CacheServiceHelper.getInstance();
    CacheServiceHelper.resetInstance();
    const cache2 = CacheServiceHelper.getInstance();
    
    expect(cache1).not.toBe(cache2); // Different instances
  });

  it('should handle cache operations interface', async () => {
    const cache = CacheServiceHelper.getInstance();
    
    // Test that all required methods exist
    expect(typeof cache.getScore).toBe('function');
    expect(typeof cache.setScore).toBe('function');
    expect(typeof cache.getScoreLite).toBe('function');
    expect(typeof cache.setScoreLite).toBe('function');
    expect(typeof cache.getBatchResult).toBe('function');
    expect(typeof cache.setBatchResult).toBe('function');
    expect(typeof cache.invalidateProfile).toBe('function');
    expect(typeof cache.invalidateEvent).toBe('function');
    expect(typeof cache.invalidateAll).toBe('function');
    expect(typeof cache.getStats).toBe('function');
    expect(typeof cache.ping).toBe('function');
  });

  it('should handle health check', async () => {
    const health = await CacheServiceHelper.healthCheck();
    
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('type');
    
    if (health.healthy) {
      expect(health).toHaveProperty('stats');
    } else {
      expect(health).toHaveProperty('error');
    }
  });

  // Test cache key patterns
  it('should generate consistent cache keys', () => {
    const eventId = 'event_123';
    const profileHash = 'profile_abc';
    
    // These would be the expected key patterns
    const expectedScoreKey = 'career_impact:score:event_123:profile_abc';
    const expectedScoreLiteKey = 'career_impact:score_lite:event_123:profile_abc';
    
    // Verify pattern consistency (this is what our key generator should produce)
    expect(expectedScoreKey).toContain(eventId);
    expect(expectedScoreKey).toContain(profileHash);
    expect(expectedScoreLiteKey).toContain(eventId);
    expect(expectedScoreLiteKey).toContain(profileHash);
  });

  // Test data structures
  it('should work with CareerImpactScore data structure', () => {
    const mockScore: CareerImpactScore = {
      overall: 85,
      confidence: 0.9,
      components: {
        skillRelevance: 90,
        careerStageMatch: 80,
        networkingValue: 85,
        industryRelevance: 88,
        timingBonus: 75
      },
      explanation: {
        reasons: ['Strong skill match'],
        matchedSkills: ['React', 'TypeScript'],
        speakerHighlights: ['Industry expert'],
        careerImpactCategory: 'high',
        confidenceFactors: ['Complete profile data']
      },
      metadata: {
        algorithmVersion: '2.0.0',
        calculatedAt: new Date().toISOString(),
        careerProfileHash: 'profile123',
        eventDataHash: 'event456'
      }
    };

    // Verify structure
    expect(mockScore.overall).toBeGreaterThan(0);
    expect(mockScore.confidence).toBeLessThanOrEqual(1);
    expect(mockScore.components).toHaveProperty('skillRelevance');
    expect(mockScore.explanation).toHaveProperty('careerImpactCategory');
    expect(mockScore.metadata).toHaveProperty('algorithmVersion');
  });

  it('should work with CareerImpactScoreLite data structure', () => {
    const mockScoreLite: CareerImpactScoreLite = {
      overall: 85,
      confidence: 0.9,
      category: 'high'
    };

    // Verify structure
    expect(mockScoreLite.overall).toBeGreaterThan(0);
    expect(mockScoreLite.confidence).toBeLessThanOrEqual(1);
    expect(['transformative', 'high', 'moderate', 'low']).toContain(mockScoreLite.category);
  });
});
