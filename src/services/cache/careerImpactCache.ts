// src/services/cache/careerImpactCache.ts
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { CareerProfile } from '@/types/career';
import { Event } from '@/types';

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  lastReset: string;
}

/**
 * Simple in-memory cache for career impact scores
 * Focused implementation without over-engineering
 */
export class CareerImpactCache {
  private static cache = new Map<string, { 
    data: CareerImpactScoreLite; 
    timestamp: number; 
    ttl: number; 
  }>();
  
  private static stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    lastReset: new Date().toISOString()
  };

  private static readonly DEFAULT_TTL = 12 * 60 * 60 * 1000; // 12 hours
  private static readonly MAX_CACHE_SIZE = 1000; // Prevent memory bloat

  /**
   * Generate cache key from event ID and profile hash
   */
  private static generateCacheKey(eventId: string, profileHash: string): string {
    return `career_impact:${eventId}:${profileHash}`;
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
    
    return btoa(JSON.stringify(hashData)).slice(0, 16);
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
    
    return btoa(JSON.stringify(hashData)).slice(0, 12);
  }

  /**
   * Get cached career impact score
   */
  static async get(eventId: string, profileHash: string): Promise<CareerImpactScoreLite | null> {
    this.stats.totalRequests++;
    
    const key = this.generateCacheKey(eventId, profileHash);
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return cached.data;
  }

  /**
   * Get multiple cached career impact scores
   */
  static async mget(eventIds: string[], profileHash: string): Promise<Map<string, CareerImpactScoreLite>> {
    const results = new Map<string, CareerImpactScoreLite>();
    
    for (const eventId of eventIds) {
      const score = await this.get(eventId, profileHash);
      if (score) {
        results.set(eventId, score);
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
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    const key = this.generateCacheKey(eventId, profileHash);
    this.cache.set(key, {
      data: score,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Set multiple career impact scores in cache
   */
  static async mset(
    scores: Map<string, CareerImpactScoreLite>, 
    profileHash: string,
    ttl: number = this.DEFAULT_TTL
  ): Promise<void> {
    for (const [eventId, score] of scores) {
      await this.set(eventId, profileHash, score, ttl);
    }
  }

  /**
   * Invalidate cache entries for a specific profile
   */
  static async invalidateProfile(profileHash: string): Promise<number> {
    let invalidated = 0;
    
    for (const [key] of this.cache) {
      if (key.includes(`:${profileHash}`)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  /**
   * Invalidate cache entries for a specific event
   */
  static async invalidateEvent(eventId: string): Promise<number> {
    let invalidated = 0;
    
    for (const [key] of this.cache) {
      if (key.includes(`:${eventId}:`)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  static async invalidateAll(): Promise<number> {
    const size = this.cache.size;
    this.cache.clear();
    this.resetStats();
    return size;
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<CacheStats> {
    return { ...this.stats };
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

  private static evictOldest(): void {
    // Remove oldest 10% of entries when cache is full
    const entries = Array.from(this.cache.entries());
    const toRemove = Math.ceil(entries.length * 0.1);
    
    // Sort by timestamp and remove oldest
    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, toRemove)
      .forEach(([key]) => this.cache.delete(key));
  }
}