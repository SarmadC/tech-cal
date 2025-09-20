import { CacheService, CacheResult, CacheStats } from '@/types/cache';

/**
 * Base cache service with common functionality
 */
export abstract class BaseCacheService implements CacheService {
  protected stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
    lastReset: new Date().toISOString(),
  };

  /**
   * Update cache statistics
   */
  protected updateStats(hit: boolean): void {
    this.stats.totalRequests++;
    
    if (hit) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    
    this.stats.hitRate = this.stats.totalRequests > 0 
      ? this.stats.hits / this.stats.totalRequests 
      : 0;
  }

  /**
   * Create cache result with metadata
   */
  protected createResult<T>(data: T | null, key: string, hit: boolean = data !== null): CacheResult<T> {
    this.updateStats(hit);
    
    return {
      data,
      hit,
      key,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
      lastReset: new Date().toISOString(),
    };
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  /**
   * Serialize value for storage
   */
  protected serialize<T>(value: T): string {
    return JSON.stringify({
      data: value,
      timestamp: Date.now(),
      version: '1.0',
    });
  }

  /**
   * Deserialize value from storage
   */
  protected deserialize<T>(serialized: string): T | null {
    try {
      const parsed = JSON.parse(serialized);
      return parsed.data || null;
    } catch (error) {
      console.warn('Failed to deserialize cache value:', error);
      return null;
    }
  }

  /**
   * Check if value has expired
   */
  protected isExpired(timestamp: number, ttl: number): boolean {
    const now = Date.now();
    const expiryTime = timestamp + (ttl * 1000);
    return now > expiryTime;
  }

  // Abstract methods that must be implemented by subclasses
  abstract get<T>(key: string): Promise<CacheResult<T>>;
  abstract set<T>(key: string, value: T, ttl?: number): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  abstract deletePattern(pattern: string): Promise<number>;
  abstract exists(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract ping(): Promise<boolean>;
}
