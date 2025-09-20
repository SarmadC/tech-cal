import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryCacheService } from '../memoryCacheService';
import { CacheConfig } from '@/types/cache';

describe('MemoryCacheService', () => {
  let cacheService: MemoryCacheService;
  let config: CacheConfig;

  beforeEach(() => {
    config = {
      type: 'memory',
      memory: {
        maxSize: 5,
        cleanupInterval: 100 // 100ms for testing
      },
      ttl: {
        default: 1, // 1 second for testing
        score: 1,
        scoreLite: 1,
        batch: 1
      },
      keys: {
        prefix: 'test',
        separator: ':',
        patterns: {
          score: 'score',
          scoreLite: 'score_lite',
          batch: 'batch',
          profile: '*',
          event: '*'
        }
      }
    } as CacheConfig;

    cacheService = new MemoryCacheService(config);
  });

  afterEach(() => {
    cacheService.destroy();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', async () => {
      await cacheService.set('test-key', 'test-value');
      
      const result = await cacheService.get<string>('test-key');
      
      expect(result.hit).toBe(true);
      expect(result.data).toBe('test-value');
      expect(result.key).toBe('test-key');
    });

    it('should return cache miss for non-existent keys', async () => {
      const result = await cacheService.get<string>('non-existent');
      
      expect(result.hit).toBe(false);
      expect(result.data).toBeNull();
      expect(result.key).toBe('non-existent');
    });

    it('should handle complex objects', async () => {
      const testObject = {
        id: 123,
        name: 'Test',
        nested: { value: 'nested-value' },
        array: [1, 2, 3]
      };

      await cacheService.set('object-key', testObject);
      const result = await cacheService.get<typeof testObject>('object-key');

      expect(result.hit).toBe(true);
      expect(result.data).toEqual(testObject);
    });
  });

  describe('TTL functionality', () => {
    it('should expire entries after TTL', async () => {
      await cacheService.set('expire-key', 'expire-value', 0.1); // 100ms
      
      // Should be available immediately
      let result = await cacheService.get<string>('expire-key');
      expect(result.hit).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      result = await cacheService.get<string>('expire-key');
      expect(result.hit).toBe(false);
    });

    it('should use default TTL when not specified', async () => {
      await cacheService.set('default-ttl-key', 'value');
      
      const result = await cacheService.get<string>('default-ttl-key');
      expect(result.hit).toBe(true);
    });
  });

  describe('delete operations', () => {
    it('should delete specific keys', async () => {
      await cacheService.set('delete-key', 'delete-value');
      
      const deleted = await cacheService.delete('delete-key');
      expect(deleted).toBe(true);
      
      const result = await cacheService.get<string>('delete-key');
      expect(result.hit).toBe(false);
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await cacheService.delete('non-existent');
      expect(deleted).toBe(false);
    });

    it('should delete keys matching pattern', async () => {
      await cacheService.set('test:user:1', 'user1');
      await cacheService.set('test:user:2', 'user2');
      await cacheService.set('test:post:1', 'post1');
      await cacheService.set('other:data', 'other');

      const deletedCount = await cacheService.deletePattern('test:user:*');
      
      expect(deletedCount).toBe(2);
      
      // Verify correct keys were deleted
      expect((await cacheService.get('test:user:1')).hit).toBe(false);
      expect((await cacheService.get('test:user:2')).hit).toBe(false);
      expect((await cacheService.get('test:post:1')).hit).toBe(true);
      expect((await cacheService.get('other:data')).hit).toBe(true);
    });
  });

  describe('exists operation', () => {
    it('should return true for existing keys', async () => {
      await cacheService.set('exists-key', 'value');
      
      const exists = await cacheService.exists('exists-key');
      expect(exists).toBe(true);
    });

    it('should return false for non-existent keys', async () => {
      const exists = await cacheService.exists('non-existent');
      expect(exists).toBe(false);
    });

    it('should return false for expired keys', async () => {
      await cacheService.set('expire-exists-key', 'value', 0.1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const exists = await cacheService.exists('expire-exists-key');
      expect(exists).toBe(false);
    });
  });

  describe('clear operation', () => {
    it('should clear all entries', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      await cacheService.clear();
      
      expect((await cacheService.get('key1')).hit).toBe(false);
      expect((await cacheService.get('key2')).hit).toBe(false);
    });
  });

  describe('ping operation', () => {
    it('should always return true for memory cache', async () => {
      const result = await cacheService.ping();
      expect(result).toBe(true);
    });
  });

  describe('size management', () => {
    it('should enforce max size by evicting old entries', async () => {
      // Fill cache to max size (5 entries)
      for (let i = 1; i <= 5; i++) {
        await cacheService.set(`key${i}`, `value${i}`);
      }
      
      // Add one more entry (should trigger eviction)
      await cacheService.set('key6', 'value6');
      
      // Some older entries should be evicted
      const stats = await cacheService.getMemoryStats();
      expect(stats.size).toBeLessThanOrEqual(5);
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', async () => {
      // Cache miss
      await cacheService.get('miss-key');
      
      // Cache set and hit
      await cacheService.set('hit-key', 'value');
      await cacheService.get('hit-key');
      
      const stats = await cacheService.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should provide memory-specific statistics', async () => {
      await cacheService.set('stat-key', 'value');
      
      const memStats = await cacheService.getMemoryStats();
      expect(memStats.size).toBe(1);
      expect(memStats.maxSize).toBe(5);
      expect(memStats.usage).toBe(0.2);
      expect(memStats.expiredEntries).toBe(0);
    });
  });

  describe('pattern matching', () => {
    it('should handle various glob patterns correctly', async () => {
      await cacheService.set('user:123:profile', 'profile');
      await cacheService.set('user:123:settings', 'settings');
      await cacheService.set('user:456:profile', 'profile2');
      await cacheService.set('post:123:content', 'content');

      // Test specific user pattern
      expect(await cacheService.deletePattern('user:123:*')).toBe(2);
      
      // Test all user patterns
      await cacheService.set('user:789:profile', 'profile3');
      expect(await cacheService.deletePattern('user:*')).toBe(2); // 456 and 789
      
      // Post should still exist
      expect((await cacheService.get('post:123:content')).hit).toBe(true);
    });
  });
});
