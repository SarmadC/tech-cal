import { CareerImpactScore } from '@/types';
import { BatchCareerImpactResult, CareerImpactScoreLite } from './careerImpact';

/**
 * Cache operation errors
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly key?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

export class CacheConnectionError extends CacheError {
  constructor(message: string, cause?: Error) {
    super(message, 'connection', undefined, cause);
    this.name = 'CacheConnectionError';
  }
}

export class CacheSerializationError extends CacheError {
  constructor(message: string, key: string, cause?: Error) {
    super(message, 'serialization', key, cause);
    this.name = 'CacheSerializationError';
  }
}

/**
 * Cache key configuration for consistent key generation
 */
export interface CacheKeyConfig {
  prefix: string;
  separator: string;
  ttl: number; // Time to live in seconds
}

/**
 * Cache operation result with metadata
 */
export interface CacheResult<T> {
  data: T | null;
  hit: boolean;
  key: string;
  timestamp?: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  lastReset: string;
}

/**
 * Cache invalidation options
 */
export interface InvalidationOptions {
  pattern?: string;
  immediate?: boolean;
  cascade?: boolean; // Invalidate related keys
}

/**
 * Core cache operations interface
 */
export interface CacheService {
  /**
   * Get value from cache
   */
  get<T>(key: string): Promise<CacheResult<T>>;

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete specific key from cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Delete multiple keys matching pattern
   */
  deletePattern(pattern: string): Promise<number>;

  /**
   * Check if key exists in cache
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;

  /**
   * Clear all cache entries (use with caution)
   */
  clear(): Promise<void>;

  /**
   * Health check for cache service
   */
  ping(): Promise<boolean>;
}

/**
 * Career Impact specific cache operations
 */
export interface CareerImpactCacheService {
  /**
   * Get full career impact score from cache
   */
  getScore(eventId: string, profileHash: string): Promise<CacheResult<CareerImpactScore>>;

  /**
   * Set full career impact score in cache
   */
  setScore(eventId: string, profileHash: string, score: CareerImpactScore, ttl?: number): Promise<void>;

  /**
   * Get lightweight career impact score from cache
   */
  getScoreLite(eventId: string, profileHash: string): Promise<CacheResult<CareerImpactScoreLite>>;

  /**
   * Set lightweight career impact score in cache
   */
  setScoreLite(eventId: string, profileHash: string, score: CareerImpactScoreLite, ttl?: number): Promise<void>;

  /**
   * Get batch processing results from cache
   */
  getBatchResult(batchId: string): Promise<CacheResult<BatchCareerImpactResult>>;

  /**
   * Set batch processing results in cache
   */
  setBatchResult(batchId: string, result: BatchCareerImpactResult, ttl?: number): Promise<void>;

  /**
   * Invalidate all scores for a specific profile
   */
  invalidateProfile(profileHash: string, options?: InvalidationOptions): Promise<number>;

  /**
   * Invalidate all scores for a specific event
   */
  invalidateEvent(eventId: string, options?: InvalidationOptions): Promise<number>;

  /**
   * Invalidate all scores (algorithm update scenario)
   */
  invalidateAll(options?: InvalidationOptions): Promise<number>;

  /**
   * Get cache statistics specific to career impact scoring
   */
  getStats(): Promise<CacheStats>;

  /**
   * Health check for career impact cache
   */
  ping(): Promise<boolean>;
}

/**
 * Cache configuration for different environments
 */
export interface CacheConfig {
  type: 'redis' | 'database' | 'memory';
  redis?: {
    url: string;
    token?: string;
    maxRetries: number;
    retryDelay: number;
  };
  database?: {
    tableName: string;
    cleanupInterval: number;
  };
  memory?: {
    maxSize: number;
    cleanupInterval: number;
  };
  ttl: {
    default: number;
    score: number;
    scoreLite: number;
    batch: number;
  };
  keys: {
    prefix: string;
    separator: string;
    patterns: {
      score: string;
      scoreLite: string;
      batch: string;
      profile: string;
      event: string;
    };
  };
}

/**
 * Cache key generator for consistent key creation
 */
export interface CacheKeyGenerator {
  /**
   * Generate key for full career impact score
   */
  scoreKey(eventId: string, profileHash: string): string;

  /**
   * Generate key for lightweight score
   */
  scoreLiteKey(eventId: string, profileHash: string): string;

  /**
   * Generate key for batch results
   */
  batchKey(batchId: string): string;

  /**
   * Generate pattern for profile invalidation
   */
  profilePattern(profileHash: string): string;

  /**
   * Generate pattern for event invalidation
   */
  eventPattern(eventId: string): string;

  /**
   * Generate pattern for all scores
   */
  allScoresPattern(): string;
}

/**
 * Cache service factory for creating appropriate cache implementation
 */
export interface CacheServiceFactory {
  /**
   * Create cache service based on configuration
   */
  createCacheService(config: CacheConfig): CacheService;

  /**
   * Create career impact cache service
   */
  createCareerImpactCache(config: CacheConfig): CareerImpactCacheService;

  /**
   * Create cache key generator
   */
  createKeyGenerator(config: CacheConfig): CacheKeyGenerator;
}
