// src/services/cache/careerImpactCache.ts
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { CareerProfile } from '@/types/career';
import { Event } from '@/types';
import { kv } from '@vercel/kv';
import { toBase64 } from '@/utils/base64';

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  lastReset: string;
}

interface CacheEntry {
  data: CareerImpactScoreLite;
  timestamp: number;
  ttl: number;
}

/**
 * Redis-based cache for career impact scores
 * Persistent across serverless function invocations
 */
export class CareerImpactCache {
  private static stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    lastReset: new Date().toISOString()
  };

  private static readonly DEFAULT_TTL = 12 * 60 * 60; // 12 hours in seconds (Redis TTL)
  private static readonly CACHE_PREFIX = 'career_impact:';
  private static readonly STATS_KEY = 'career_impact:stats';
  
  // Sliding window configuration
  // Refresh TTL when entry is accessed and is within the refresh threshold of expiring
  private static readonly REFRESH_THRESHOLD = 0.25; // Refresh when 25% TTL remaining
  private static refreshesPerformed = 0;

  /**
   * Generate cache key from event ID and profile hash
   */
  private static generateCacheKey(eventId: string, profileHash: string): string {
    return `${this.CACHE_PREFIX}${eventId}:${profileHash}`;
  }

  /**
   * Generate profile hash for cache key
   */
  static generateProfileHash(careerProfile: CareerProfile): string {
    // Simple hash based on key profile attributes
    const hashData = {
      currentRole: careerProfile.currentRole,
      seniority: careerProfile.seniority,
      primarySkills: careerProfile.primarySkills?.slice(0, 5), // Only first 5 skills for performance
      industry: careerProfile.industry
    };
    
    return toBase64(JSON.stringify(hashData)).slice(0, 16);
  }

  /**
   * Generate event hash for cache validation
   */
  static generateEventHash(event: Event): string {
    // Simple hash based on event attributes that affect career impact
    const hashData = {
      title: event.title,
      category: event.eventTypeId,
      organizer: event.organizer
    };
    
    return toBase64(JSON.stringify(hashData)).slice(0, 12);
  }

  /**
   * Get cached career impact score with sliding window TTL refresh
   */
  static async get(eventId: string, profileHash: string): Promise<CareerImpactScoreLite | null> {
    this.stats.totalRequests++;
    
    try {
      const key = this.generateCacheKey(eventId, profileHash);
      const cached = await kv.get<CacheEntry>(key);
      
      if (!cached) {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      const now = Date.now();
      const expiresAt = cached.timestamp + (cached.ttl * 1000);
      
      // Check if expired (Redis TTL handles this, but we check for safety)
      if (now > expiresAt) {
        await kv.del(key);
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }

      // Sliding window refresh: if entry is nearing expiration, refresh its TTL
      // This keeps frequently-accessed entries alive longer
      const remainingTTL = expiresAt - now;
      const refreshThresholdMs = cached.ttl * 1000 * this.REFRESH_THRESHOLD;
      
      if (remainingTTL < refreshThresholdMs) {
        // Refresh the entry with a new TTL (fire-and-forget, don't await)
        const refreshedEntry: CacheEntry = {
          data: cached.data,
          timestamp: now,
          ttl: cached.ttl
        };
        void kv.setex(key, cached.ttl, refreshedEntry).catch(err => {
          console.warn('Sliding window refresh failed:', err);
        });
        this.refreshesPerformed++;
      }

      this.stats.hits++;
      this.updateHitRate();
      return cached.data;
    } catch (error) {
      const cacheKey = this.generateCacheKey(eventId, profileHash);
      console.warn('Cache get error for key', cacheKey + ':', error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Get multiple cached career impact scores with sliding window TTL refresh
   */
  static async mget(eventIds: string[], profileHash: string): Promise<Map<string, CareerImpactScoreLite>> {
    const results = new Map<string, CareerImpactScoreLite>();
    
    try {
      const keys = eventIds.map(eventId => this.generateCacheKey(eventId, profileHash));
      const cachedEntries = await kv.mget(...keys) as (CacheEntry | null)[];
      
      const now = Date.now();
      const entriesToRefresh: { key: string; entry: CacheEntry }[] = [];
      
      cachedEntries.forEach((cached, index) => {
        if (cached) {
          const expiresAt = cached.timestamp + (cached.ttl * 1000);
          
          if (now <= expiresAt) {
            results.set(eventIds[index], cached.data);
            
            // Check if entry needs sliding window refresh
            const remainingTTL = expiresAt - now;
            const refreshThresholdMs = cached.ttl * 1000 * this.REFRESH_THRESHOLD;
            
            if (remainingTTL < refreshThresholdMs) {
              entriesToRefresh.push({
                key: keys[index],
                entry: {
                  data: cached.data,
                  timestamp: now,
                  ttl: cached.ttl
                }
              });
            }
          }
        }
      });
      
      // Batch refresh entries nearing expiration (fire-and-forget)
      if (entriesToRefresh.length > 0) {
        const refreshPipeline = kv.pipeline();
        for (const { key, entry } of entriesToRefresh) {
          refreshPipeline.setex(key, entry.ttl, entry);
        }
        void refreshPipeline.exec().catch(err => {
          console.warn('Batch sliding window refresh failed:', err);
        });
        this.refreshesPerformed += entriesToRefresh.length;
      }
      
      // Update stats
      this.stats.totalRequests += eventIds.length;
      this.stats.hits += results.size;
      this.stats.misses += eventIds.length - results.size;
      this.updateHitRate();
    } catch (error) {
      console.warn('Cache mget error for', eventIds.length, 'events with profile', profileHash + ':', error);
      // Fallback to individual gets (which includes sliding window refresh)
      for (const eventId of eventIds) {
        const score = await this.get(eventId, profileHash);
        if (score) {
          results.set(eventId, score);
        }
      }
    }
    
    return results;
  }

  /**
   * Set career impact score in cache
   */
  static async set(
    eventId: string, 
    profileHash: string, 
    score: CareerImpactScoreLite,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const key = this.generateCacheKey(eventId, profileHash);
      const entry: CacheEntry = {
        data: score,
        timestamp: Date.now(),
        ttl
      };
      
      await kv.setex(key, ttl, entry);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Set multiple career impact scores in cache
   * Accepts both Map<string, CareerImpactScoreLite> and Map<string, { score: CareerImpactScoreLite, eventId: string }>
   */
  static async mset(
    scores: Map<string, CareerImpactScoreLite | { score: CareerImpactScoreLite; eventId: string }>, 
    profileHash: string,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    try {
      const pipeline = kv.pipeline();
      const timestamp = Date.now();
      
      for (const [eventId, scoreData] of scores) {
        const key = this.generateCacheKey(eventId, profileHash);
        
        // Handle both data structures
        const score = 'score' in scoreData ? scoreData.score : scoreData;
        
        const entry: CacheEntry = {
          data: score,
          timestamp,
          ttl
        };
        pipeline.setex(key, ttl, entry);
      }
      
      await pipeline.exec();
    } catch (error) {
      console.warn('Cache mset error:', error);
      // Fallback to individual sets
      for (const [eventId, scoreData] of scores) {
        const score = 'score' in scoreData ? scoreData.score : scoreData;
        await this.set(eventId, profileHash, score, ttl);
      }
    }
  }

  /**
   * Invalidate cache entries for a specific profile
   */
  static async invalidateProfile(profileHash: string): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}*:${profileHash}`;
      const keys = await kv.keys(pattern);
      
      if (keys.length > 0) {
        // Process in batches to avoid overwhelming Redis
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await kv.del(...batch);
        }
      }
      
      return keys.length;
    } catch (error) {
      console.warn('Cache invalidateProfile error for profile', profileHash + ':', error);
      return 0;
    }
  }

  /**
   * Invalidate all cache entries for a user (more efficient than invalidateAll)
   * This method will be enhanced when we have user-specific cache keys
   */
  static async invalidateUser(_userId: string): Promise<number> {
    // For now, we'll invalidate all cache since we don't store userId in cache keys
    // This can be optimized later by including userId in cache key structure
    return await this.invalidateAll();
  }

  /**
   * Invalidate cache entries for a specific event
   */
  static async invalidateEvent(eventId: string): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}${eventId}:*`;
      const keys = await kv.keys(pattern);
      
      if (keys.length > 0) {
        // Process in batches to avoid overwhelming Redis
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await kv.del(...batch);
        }
      }
      
      return keys.length;
    } catch (error) {
      console.warn('Cache invalidateEvent error for event', eventId + ':', error);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   */
  static async invalidateAll(): Promise<number> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await kv.keys(pattern);
      
      if (keys.length > 0) {
        // Process in batches to avoid overwhelming Redis
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await kv.del(...batch);
        }
      }
      
      this.resetStats();
      return keys.length;
    } catch (error) {
      console.warn('Cache invalidateAll error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics including sliding window refresh counts
   */
  static async getStats(): Promise<CacheStats & { refreshes: number }> {
    try {
      // Try to get persisted stats from Redis
      const persistedStats = await kv.get<CacheStats>(this.STATS_KEY);
      if (persistedStats) {
        // Merge persisted stats with current session stats
        this.stats = {
          hits: persistedStats.hits + this.stats.hits,
          misses: persistedStats.misses + this.stats.misses,
          totalRequests: persistedStats.totalRequests + this.stats.totalRequests,
          hitRate: 0, // Will be recalculated
          lastReset: persistedStats.lastReset
        };
        this.updateHitRate();
      }
      
      // Persist merged stats
      await kv.setex(this.STATS_KEY, 24 * 60 * 60, this.stats);
      
      return { ...this.stats, refreshes: this.refreshesPerformed };
    } catch (error) {
      console.warn('Cache getStats error:', error);
      return { ...this.stats, refreshes: this.refreshesPerformed };
    }
  }

  /**
   * Private helper methods
   */
  private static updateHitRate(): void {
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
  }

  private static resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      lastReset: new Date().toISOString()
    };
  }

  /**
   * Reset cache statistics (useful for testing or manual reset)
   */
  static async resetCacheStats(): Promise<void> {
    this.resetStats();
    try {
      await kv.del(this.STATS_KEY);
    } catch (error) {
      console.warn('Failed to reset stats in Redis:', error);
    }
  }

}