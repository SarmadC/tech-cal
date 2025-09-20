import { describe, it, expect } from 'vitest';
import { getCacheConfig } from '@/config/cache';
import { CacheServiceHelper } from '../cacheServiceHelper';

describe('Redis Connection Tests', () => {
  it('should detect cache type from environment', () => {
    const config = getCacheConfig();
    
    // In test environment, should use memory unless explicitly overridden
    if (process.env.CACHE_TYPE === 'redis') {
      expect(config.type).toBe('redis');
      console.log('✅ Redis explicitly enabled via CACHE_TYPE');
    } else if (process.env.NODE_ENV === 'test') {
      expect(config.type).toBe('memory');
      console.log('✅ Memory cache used in test environment');
    } else if (process.env.KV_REST_API_URL) {
      expect(config.type).toBe('redis');
      console.log('✅ Redis detected from environment variables');
    } else {
      expect(config.type).toBe('database');
      console.log('ℹ️  Redis not available, using database fallback');
    }
  });

  it('should validate environment variables for Redis', () => {
    if (process.env.KV_REST_API_URL) {
      expect(process.env.KV_REST_API_URL).toContain('upstash.io');
      expect(process.env.KV_REST_API_TOKEN).toBeTruthy();
      console.log('✅ Redis environment variables are properly configured');
      console.log('   URL:', process.env.KV_REST_API_URL);
      console.log('   Token:', process.env.KV_REST_API_TOKEN ? '***configured***' : 'missing');
    } else {
      console.log('ℹ️  Skipping Redis environment validation - not configured');
    }
  });

  it('should create cache service without errors', async () => {
    try {
      const cache = CacheServiceHelper.createInstance();
      expect(cache).toBeTruthy();
      console.log('✅ Cache service created successfully');
      
      // Test ping for any cache type
      const pingResult = await cache.ping();
      console.log('Cache ping result:', pingResult ? '✅ Connected' : '❌ Failed');
      
      // Test Redis-specific operations if Redis is explicitly enabled
      if (process.env.CACHE_TYPE === 'redis') {
        
        if (pingResult) {
          // Test basic operations
          
          await cache.setScore('test-event', 'test-profile', {
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
              reasons: ['Test score'],
              matchedSkills: ['Testing'],
              speakerHighlights: ['Test speaker'],
              careerImpactCategory: 'high',
              confidenceFactors: ['Test data']
            },
            metadata: {
              algorithmVersion: '2.0.0',
              calculatedAt: new Date().toISOString(),
              careerProfileHash: 'test-profile',
              eventDataHash: 'test-event'
            }
          });
          
          const retrieved = await cache.getScore('test-event', 'test-profile');
          expect(retrieved.hit).toBe(true);
          expect(retrieved.data?.overall).toBe(85);
          
          // Cleanup
          await cache.invalidateEvent('test-event');
          
          console.log('✅ Basic Redis operations working correctly');
        }
      }
    } catch (error) {
      console.error('❌ Cache service creation failed:', error);
      throw error;
    }
  });

  it('should provide health check information', async () => {
    const health = await CacheServiceHelper.healthCheck();
    
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('type');
    
    console.log('Cache Health Check:');
    console.log('  Healthy:', health.healthy ? '✅' : '❌');
    console.log('  Type:', health.type);
    
    if (health.stats) {
      console.log('  Stats:', {
        hits: health.stats.hits,
        misses: health.stats.misses,
        hitRate: health.stats.hitRate,
        totalRequests: health.stats.totalRequests
      });
    }
    
    if (health.error) {
      console.log('  Error:', health.error);
    }
  });
});
