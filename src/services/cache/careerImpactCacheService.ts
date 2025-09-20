import { CareerImpactScore } from '@/types';
import { BatchCareerImpactResult, CareerImpactScoreLite } from '@/types/careerImpact';
import { 
  CareerImpactCacheService, 
  CacheService, 
  CacheResult, 
  CacheStats,
  InvalidationOptions,
  CacheKeyGenerator,
  CacheConfig
} from '@/types/cache';

/**
 * Career Impact specific cache service implementation
 */
export class DefaultCareerImpactCacheService implements CareerImpactCacheService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly keyGenerator: CacheKeyGenerator,
    private readonly config: CacheConfig
  ) {}

  /**
   * Get full career impact score from cache
   */
  async getScore(eventId: string, profileHash: string): Promise<CacheResult<CareerImpactScore>> {
    const key = this.keyGenerator.scoreKey(eventId, profileHash);
    return this.cacheService.get<CareerImpactScore>(key);
  }

  /**
   * Set full career impact score in cache
   */
  async setScore(
    eventId: string, 
    profileHash: string, 
    score: CareerImpactScore, 
    ttl?: number
  ): Promise<void> {
    const key = this.keyGenerator.scoreKey(eventId, profileHash);
    const cacheTtl = ttl ?? this.config.ttl.score;
    await this.cacheService.set(key, score, cacheTtl);
  }

  /**
   * Get lightweight career impact score from cache
   */
  async getScoreLite(eventId: string, profileHash: string): Promise<CacheResult<CareerImpactScoreLite>> {
    const key = this.keyGenerator.scoreLiteKey(eventId, profileHash);
    return this.cacheService.get<CareerImpactScoreLite>(key);
  }

  /**
   * Set lightweight career impact score in cache
   */
  async setScoreLite(
    eventId: string, 
    profileHash: string, 
    score: CareerImpactScoreLite, 
    ttl?: number
  ): Promise<void> {
    const key = this.keyGenerator.scoreLiteKey(eventId, profileHash);
    const cacheTtl = ttl ?? this.config.ttl.scoreLite;
    await this.cacheService.set(key, score, cacheTtl);
  }

  /**
   * Get batch processing results from cache
   */
  async getBatchResult(batchId: string): Promise<CacheResult<BatchCareerImpactResult>> {
    const key = this.keyGenerator.batchKey(batchId);
    return this.cacheService.get<BatchCareerImpactResult>(key);
  }

  /**
   * Set batch processing results in cache
   */
  async setBatchResult(
    batchId: string, 
    result: BatchCareerImpactResult, 
    ttl?: number
  ): Promise<void> {
    const key = this.keyGenerator.batchKey(batchId);
    const cacheTtl = ttl ?? this.config.ttl.batch;
    await this.cacheService.set(key, result, cacheTtl);
  }

  /**
   * Invalidate all scores for a specific profile
   */
  async invalidateProfile(profileHash: string, _options?: InvalidationOptions): Promise<number> {
    const pattern = this.keyGenerator.profilePattern(profileHash);
    return this.cacheService.deletePattern(pattern);
  }

  /**
   * Invalidate all scores for a specific event
   */
  async invalidateEvent(eventId: string, _options?: InvalidationOptions): Promise<number> {
    const pattern = this.keyGenerator.eventPattern(eventId);
    return this.cacheService.deletePattern(pattern);
  }

  /**
   * Invalidate all scores (algorithm update scenario)
   */
  async invalidateAll(_options?: InvalidationOptions): Promise<number> {
    const pattern = this.keyGenerator.allScoresPattern();
    return this.cacheService.deletePattern(pattern);
  }

  /**
   * Get cache statistics specific to career impact scoring
   */
  async getStats(): Promise<CacheStats> {
    return this.cacheService.getStats();
  }

  /**
   * Health check for career impact cache
   */
  async ping(): Promise<boolean> {
    return this.cacheService.ping();
  }

  /**
   * Convenience method: Get or calculate score with caching
   */
  async getOrCalculateScore(
    eventId: string,
    profileHash: string,
    calculator: () => Promise<CareerImpactScore>
  ): Promise<CareerImpactScore> {
    // Try cache first
    const cached = await this.getScore(eventId, profileHash);
    if (cached.hit && cached.data) {
      return cached.data;
    }

    // Calculate fresh score
    const score = await calculator();
    
    // Store in cache
    await this.setScore(eventId, profileHash, score);
    
    return score;
  }

  /**
   * Convenience method: Get or calculate lite score with caching
   */
  async getOrCalculateScoreLite(
    eventId: string,
    profileHash: string,
    calculator: () => Promise<CareerImpactScoreLite>
  ): Promise<CareerImpactScoreLite> {
    // Try cache first
    const cached = await this.getScoreLite(eventId, profileHash);
    if (cached.hit && cached.data) {
      return cached.data;
    }

    // Calculate fresh score
    const score = await calculator();
    
    // Store in cache
    await this.setScoreLite(eventId, profileHash, score);
    
    return score;
  }

  /**
   * Convenience method: Batch invalidation for multiple profiles
   */
  async invalidateProfiles(profileHashes: string[]): Promise<number> {
    let totalInvalidated = 0;
    
    for (const profileHash of profileHashes) {
      const invalidated = await this.invalidateProfile(profileHash);
      totalInvalidated += invalidated;
    }
    
    return totalInvalidated;
  }

  /**
   * Convenience method: Batch invalidation for multiple events
   */
  async invalidateEvents(eventIds: string[]): Promise<number> {
    let totalInvalidated = 0;
    
    for (const eventId of eventIds) {
      const invalidated = await this.invalidateEvent(eventId);
      totalInvalidated += invalidated;
    }
    
    return totalInvalidated;
  }
}
