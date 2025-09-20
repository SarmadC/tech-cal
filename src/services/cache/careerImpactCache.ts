import { kv } from '@vercel/kv';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { CareerProfile } from '@/types/career';
import { Event } from '@/types';
import { createHash } from 'crypto';

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  lastReset: string;
}

/**
 * Redis-backed cache for career impact scores
 * Simple, robust implementation with TTL and batch operations
 */
export class CareerImpactCache {
  private static readonly CACHE_PREFIX = 'ci';
  private static readonly PROFILE_PREFIX = 'profile';
  private static readonly ALGORITHM_VERSION = '2.0.0';
  private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours
  private static readonly STATS_KEY = 'ci:stats';

  /**
   * Generate cache key for career impact score
   */
  private static generateCacheKey(eventId: string, profileHash: string): string {
    return `${this.CACHE_PREFIX}:${eventId}:${profileHash}:${this.ALGORITHM_VERSION}`;
  }

  /**
   * Generate profile hash for cache key
   */
  static generateProfileHash(profile: CareerProfile): string {
    const profileData = {
      primarySkills: profile.primarySkills?.sort() || [],
      skillsToLearn: profile.skillsToLearn?.sort() || [],
      seniority: profile.seniority || '',
      interests: profile.interests?.sort() || [],
      careerGoals: profile.careerGoals?.sort() || [],
      learningStyle: profile.learningStyle?.sort() || [],
      industry: profile.industry || ''
    };

    return createHash('md5')
      .update(JSON.stringify(profileData))
      .digest('hex')
      .substring(0, 12); // Short hash for performance
  }

  /**
   * Generate event hash for cache key
   */
  static generateEventHash(event: Event): string {
    const eventData = {
      id: event.id,
      title: event.title || '',
      category: event.category?.name || '',
      // Include only stable event properties that affect career impact
      updatedAt: event.updatedAt || event.createdAt
    };

    return createHash('md5')
      .update(JSON.stringify(eventData))
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Get single career impact score from cache
   */
  static async get(eventId: string, profileHash: string): Promise<CareerImpactScoreLite | null> {
    try {
      const key = this.generateCacheKey(eventId, profileHash);
      const cached = await kv.get<CareerImpactScoreLite>(key);

      // Update stats
      if (cached) {
        await this.incrementStat('hits');
      } else {
        await this.incrementStat('misses');
      }

      return cached;
    } catch (error) {
      console.warn('Cache get failed:', error);
      await this.incrementStat('misses');
      return null;
    }
  }

  /**
   * Set single career impact score in cache
   */
  static async set(eventId: string, profileHash: string, score: CareerImpactScoreLite, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const key = this.generateCacheKey(eventId, profileHash);
      await kv.setex(key, ttl, score);
    } catch (error) {
      console.warn('Cache set failed:', error);
    }
  }

  /**
   * Get multiple career impact scores (batch operation)
   */
  static async mget(eventIds: string[], profileHash: string): Promise<Map<string, CareerImpactScoreLite>> {
    if (eventIds.length === 0) return new Map();

    try {
      const keys = eventIds.map(eventId => this.generateCacheKey(eventId, profileHash));
      const results = await kv.mget<CareerImpactScoreLite[]>(...keys);

      const cached = new Map<string, CareerImpactScoreLite>();
      const hits = results.filter(Boolean).length;
      const misses = eventIds.length - hits;

      results.forEach((result, index) => {
        if (result) {
          cached.set(eventIds[index], result);
        }
      });

      // Update stats
      if (hits > 0) await this.incrementStat('hits', hits);
      if (misses > 0) await this.incrementStat('misses', misses);

      return cached;
    } catch (error) {
      console.warn('Cache mget failed:', error);
      await this.incrementStat('misses', eventIds.length);
      return new Map();
    }
  }

  /**
   * Set multiple career impact scores (batch operation)
   */
  static async mset(scores: Map<string, { score: CareerImpactScoreLite; eventId: string }>, profileHash: string, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (scores.size === 0) return;

    try {
      const pipeline = kv.pipeline();

      scores.forEach(({ score, eventId }) => {
        const key = this.generateCacheKey(eventId, profileHash);
        pipeline.setex(key, ttl, score);
      });

      await pipeline.exec();
    } catch (error) {
      console.warn('Cache mset failed:', error);
    }
  }

  /**
   * Invalidate cache entries for a specific profile
   */
  static async invalidateProfile(profileHash: string): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}:*:${profileHash}:*`;
      const keys = await kv.keys(pattern);

      if (keys.length === 0) return 0;

      await kv.del(...keys);
      return keys.length;
    } catch (error) {
      console.warn('Profile cache invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache entries for a specific event
   */
  static async invalidateEvent(eventId: string): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}:${eventId}:*`;
      const keys = await kv.keys(pattern);

      if (keys.length === 0) return 0;

      await kv.del(...keys);
      return keys.length;
    } catch (error) {
      console.warn('Event cache invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  static async invalidateAll(): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}:*`;
      const keys = await kv.keys(pattern);

      if (keys.length === 0) return 0;

      await kv.del(...keys);
      await this.resetStats();
      return keys.length;
    } catch (error) {
      console.warn('Full cache invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
    try {
      const stats = await kv.get<CacheStats>(this.STATS_KEY);

      if (!stats) {
        const defaultStats: CacheStats = {
          hits: 0,
          misses: 0,
          totalRequests: 0,
          hitRate: 0,
          lastReset: new Date().toISOString()
        };
        await kv.set(this.STATS_KEY, defaultStats);
        return defaultStats;
      }

      const totalRequests = stats.hits + stats.misses;
      return {
        ...stats,
        totalRequests,
        hitRate: totalRequests > 0 ? stats.hits / totalRequests : 0
      };
    } catch (error) {
      console.warn('Cache stats retrieval failed:', error);
      return {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0,
        lastReset: new Date().toISOString()
      };
    }
  }

  /**
   * Increment cache statistics
   */
  private static async incrementStat(stat: 'hits' | 'misses', count: number = 1): Promise<void> {
    try {
      await kv.hincrby(this.STATS_KEY, stat, count);
    } catch (_error) {
      // Silent failure for stats - don't impact core functionality
    }
  }

  /**
   * Reset cache statistics
   */
  private static async resetStats(): Promise<void> {
    try {
      const freshStats: CacheStats = {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0,
        lastReset: new Date().toISOString()
      };
      await kv.set(this.STATS_KEY, freshStats);
    } catch (error) {
      console.warn('Stats reset failed:', error);
    }
  }

  /**
   * Health check for cache service
   */
  static async ping(): Promise<boolean> {
    try {
      const testKey = `${this.CACHE_PREFIX}:health:${Date.now()}`;
      await kv.set(testKey, 'ok', { ex: 5 }); // 5 second TTL
      const result = await kv.get(testKey);
      await kv.del(testKey);
      return result === 'ok';
    } catch (_error) {
      console.warn('Cache health check failed:', _error);
      return false;
    }
  }
}