import { Redis } from '@upstash/redis';
import { BaseCacheService } from './baseCacheService';
import { CacheResult, CacheConfig, CacheConnectionError, CacheSerializationError } from '@/types/cache';

/**
 * Production-ready Redis cache service using Upstash
 */
export class RedisCacheService extends BaseCacheService {
  private readonly redis: Redis;
  private readonly defaultTtl: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly redisUrl: string;

  constructor(config: CacheConfig) {
    super();
    
    // Use Redis.fromEnv() for automatic configuration from environment variables
    try {
      this.redis = Redis.fromEnv();
    } catch (error) {
      throw new CacheConnectionError('Failed to initialize Redis from environment variables', error as Error);
    }

    this.redisUrl = config.redis?.url || process.env.KV_REST_API_URL || 'unknown';
    this.defaultTtl = config.ttl.default;
    this.maxRetries = config.redis?.maxRetries || 3;
    this.retryDelay = config.redis?.retryDelay || 1000;
  }

  /**
   * Get value from Redis cache
   */
  async get<T>(key: string): Promise<CacheResult<T>> {
    try {
      const result = await this.withRetry(async () => {
        return await this.redis.get(key);
      });

      if (result === null || result === undefined) {
        return this.createResult<T>(null, key, false);
      }

      // Upstash Redis returns objects directly, no need to parse
      const data = typeof result === 'string' ? this.deserialize<T>(result) : result as T;
      return this.createResult<T>(data, key, true);
      
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error);
      return this.createResult<T>(null, key, false);
    }
  }

  /**
   * Set value in Redis cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheTtl = ttl ?? this.defaultTtl;
      
      await this.withRetry(async () => {
        // Upstash Redis handles JSON serialization automatically
        await this.redis.setex(key, cacheTtl, value);
      });
      
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error);
      throw new CacheSerializationError(`Failed to set cache key: ${key}`, key, error as Error);
    }
  }

  /**
   * Delete specific key from Redis
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.withRetry(async () => {
        return await this.redis.del(key);
      });
      
      return result > 0;
      
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      // Use SCAN to find keys matching pattern (more efficient than KEYS)
      const keys = await this.scanKeys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }

      // Delete keys in batches to avoid blocking Redis
      const batchSize = 100;
      let totalDeleted = 0;

      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const deleted = await this.withRetry(async () => {
          return await this.redis.del(...batch);
        });
        totalDeleted += Number(deleted);
      }

      return totalDeleted;
      
    } catch (error) {
      console.error(`Redis deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in Redis
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.withRetry(async () => {
        return await this.redis.exists(key);
      });
      
      return result > 0;
      
    } catch (error) {
      console.error(`Redis exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries (use with extreme caution)
   */
  async clear(): Promise<void> {
    try {
      await this.withRetry(async () => {
        await this.redis.flushall();
      });
      
      // Reset local statistics
      this.resetStats();
      
    } catch (error) {
      console.error('Redis clear error:', error);
      throw new CacheConnectionError('Failed to clear Redis cache', error as Error);
    }
  }

  /**
   * Health check for Redis connection
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
      
    } catch (error) {
      console.error('Redis ping error:', error);
      return false;
    }
  }

  /**
   * Scan for keys matching pattern (using SCAN for efficiency)
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;

    do {
      try {
        const result = await this.redis.scan(cursor, {
          match: pattern,
          count: 100
        });
        
        cursor = Number(result[0]);
        keys.push(...result[1]);
        
      } catch (error) {
        console.error(`Redis scan error for pattern ${pattern}:`, error);
        break;
      }
    } while (cursor !== 0);

    return keys;
  }

  /**
   * Execute Redis operation with retry logic
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.maxRetries) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.warn(`Redis operation failed, attempt ${attempt}/${this.maxRetries}, retrying in ${delay}ms:`, error);
      }
    }

    throw new CacheConnectionError(
      `Redis operation failed after ${this.maxRetries} attempts: ${lastError?.message}`,
      lastError || undefined
    );
  }

  /**
   * Get Redis connection info for debugging
   */
  async getConnectionInfo(): Promise<{ connected: boolean; url: string; latency?: number }> {
    const startTime = Date.now();
    
    try {
      const connected = await this.ping();
      const latency = Date.now() - startTime;
      
      return {
        connected,
        url: this.redisUrl,
        latency
      };
    } catch (_error) {
      return {
        connected: false,
        url: this.redisUrl
      };
    }
  }

  /**
   * Get Redis memory usage and stats (simplified for Upstash compatibility)
   */
  async getRedisStats(): Promise<{
    memory: { used: string; peak: string };
    connections: { clients: number };
    operations: { commands: number };
  } | null> {
    try {
      // Upstash Redis doesn't support INFO command in the same way
      // Return basic stats that we can track
      const stats = await this.getStats();
      
      return {
        memory: {
          used: 'N/A', // Not available in Upstash
          peak: 'N/A'  // Not available in Upstash
        },
        connections: {
          clients: 1 // Upstash is serverless, always 1 connection
        },
        operations: {
          commands: stats.totalRequests
        }
      };
    } catch (error) {
      console.error('Failed to get Redis stats:', error);
      return null;
    }
  }
}
