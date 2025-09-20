import { BaseCacheService } from './baseCacheService';
import { CacheResult, CacheConfig } from '@/types/cache';

/**
 * In-memory cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Memory cache service for development and testing
 * Simple, fast, and follows the same interface as Redis
 */
export class MemoryCacheService extends BaseCacheService {
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtl: number;
  private readonly maxSize: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    super();
    
    this.defaultTtl = config.ttl.default;
    this.maxSize = config.memory?.maxSize || 1000;
    
    // Start cleanup timer
    const cleanupInterval = config.memory?.cleanupInterval || 300000; // 5 minutes
    this.startCleanupTimer(cleanupInterval);
  }

  /**
   * Get value from memory cache
   */
  async get<T>(key: string): Promise<CacheResult<T>> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return this.createResult<T>(null, key, false);
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return this.createResult<T>(null, key, false);
    }
    
    return this.createResult<T>(entry.data as T, key, true);
  }

  /**
   * Set value in memory cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheTtl = ttl ?? this.defaultTtl;
    const expiresAt = Date.now() + (cacheTtl * 1000);
    
    // Enforce max size by removing oldest entries (only if adding new key)
    if (!this.cache.has(key) && this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data: value,
      expiresAt
    });
  }

  /**
   * Delete specific key from memory
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const regex = this.patternToRegex(pattern);
    let deletedCount = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  /**
   * Check if key exists in memory
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Health check for memory cache
   */
  async ping(): Promise<boolean> {
    return true; // Memory cache is always available
  }

  /**
   * Convert glob pattern to regex for key matching
   */
  private patternToRegex(pattern: string): RegExp {
    // Convert glob pattern to regex
    // * matches any characters (greedy)
    // ** matches any characters including separator
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*\*/g, '.*')              // ** becomes .*
      .replace(/\*/g, '.*');               // * becomes .* (matches everything)
    
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    // Simple LRU: remove expired entries first, then oldest by insertion order
    this.cleanupExpired();
    
    // If still at capacity, remove oldest entries (at least 1, up to 10% of max size)
    if (this.cache.size >= this.maxSize) {
      const removeCount = Math.max(1, Math.floor(this.maxSize * 0.1));
      const keysToRemove = Array.from(this.cache.keys()).slice(0, removeCount);
      keysToRemove.forEach(key => this.cache.delete(key));
    }
  }

  /**
   * Remove expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupTimer(interval: number): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, interval);
    
    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer (for testing)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }

  /**
   * Get memory cache statistics
   */
  async getMemoryStats(): Promise<{
    size: number;
    maxSize: number;
    usage: number;
    expiredEntries: number;
  }> {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
    }
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      usage: this.cache.size / this.maxSize,
      expiredEntries: expiredCount
    };
  }
}
