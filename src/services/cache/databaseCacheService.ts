/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/utils/supabase/client';
import { BaseCacheService } from './baseCacheService';
import { CacheResult, CacheConfig, CacheConnectionError, CacheSerializationError } from '@/types/cache';


/**
 * Database cache service using Supabase as fallback
 * Reliable but slower than Redis - perfect for fallback scenarios
 */
export class DatabaseCacheService extends BaseCacheService {
  private readonly supabase = createClient();
  private readonly tableName: string;
  private readonly defaultTtl: number;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    super();
    this.tableName = config.database?.tableName || 'career_impact_cache';
    this.defaultTtl = config.ttl.default;
    
    // Start periodic cleanup of expired entries
    const cleanupInterval = config.database?.cleanupInterval || 3600000; // 1 hour
    this.startCleanupTimer(cleanupInterval);
  }

  /**
   * Get value from database cache
   */
  async get<T>(key: string): Promise<CacheResult<T>> {
    try {
      const { data, error } = await (this.supabase as any)
        .from(this.tableName)
        .select('cache_value, expires_at')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        return this.createResult<T>(null, key, false);
      }

      // Deserialize the cached value
      const value = this.deserialize<T>(data.cache_value);
      return this.createResult<T>(value, key, true);

    } catch (error) {
      console.error(`Database cache get error for key ${key}:`, error);
      return this.createResult<T>(null, key, false);
    }
  }

  /**
   * Set value in database cache with TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const cacheTtl = ttl ?? this.defaultTtl;
      const expiresAt = new Date(Date.now() + (cacheTtl * 1000)).toISOString();
      const serializedValue = this.serialize(value);

      const { error } = await (this.supabase as any)
        .from(this.tableName)
        .upsert({
          cache_key: key,
          cache_value: serializedValue,
          expires_at: expiresAt,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'cache_key'
        });

      if (error) {
        throw new CacheSerializationError(`Failed to set cache key: ${key}`, key, error);
      }

    } catch (error) {
      console.error(`Database cache set error for key ${key}:`, error);
      if (error instanceof CacheSerializationError) {
        throw error;
      }
      throw new CacheSerializationError(`Failed to set cache key: ${key}`, key, error as Error);
    }
  }

  /**
   * Delete specific key from database
   */
  async delete(key: string): Promise<boolean> {
    try {
      const { error, count } = await (this.supabase as any)
        .from(this.tableName)
        .delete({ count: 'exact' })
        .eq('cache_key', key);

      if (error) {
        console.error(`Database cache delete error for key ${key}:`, error);
        return false;
      }

      return (count ?? 0) > 0;

    } catch (error) {
      console.error(`Database cache delete error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      // Convert glob pattern to SQL LIKE pattern
      const likePattern = this.patternToLike(pattern);
      
      const { error, count } = await (this.supabase as any)
        .from(this.tableName)
        .delete({ count: 'exact' })
        .like('cache_key', likePattern);

      if (error) {
        console.error(`Database cache deletePattern error for pattern ${pattern}:`, error);
        return 0;
      }

      return count ?? 0;

    } catch (error) {
      console.error(`Database cache deletePattern error for pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if key exists in database
   */
  async exists(key: string): Promise<boolean> {
    try {
      const { data, error } = await (this.supabase as any)
        .from(this.tableName)
        .select('cache_key')
        .eq('cache_key', key)
        .gt('expires_at', new Date().toISOString())
        .single();

      return !error && !!data;

    } catch (error) {
      console.error(`Database cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const { error } = await (this.supabase as any)
        .from(this.tableName)
        .delete()
        .neq('cache_key', ''); // Delete all records

      if (error) {
        throw new CacheConnectionError('Failed to clear database cache', error);
      }

      // Reset local statistics
      this.resetStats();

    } catch (error) {
      console.error('Database cache clear error:', error);
      if (error instanceof CacheConnectionError) {
        throw error;
      }
      throw new CacheConnectionError('Failed to clear database cache', error as Error);
    }
  }

  /**
   * Health check for database connection
   */
  async ping(): Promise<boolean> {
    try {
      // Simple query to test database connectivity
      const { error } = await (this.supabase as any)
        .from(this.tableName)
        .select('cache_key')
        .limit(1);

      return !error;

    } catch (error) {
      console.error('Database cache ping error:', error);
      return false;
    }
  }

  /**
   * Convert glob pattern to SQL LIKE pattern
   */
  private patternToLike(pattern: string): string {
    // Convert glob wildcards to SQL LIKE wildcards
    // * becomes %
    // ? becomes _ (if we want to support single char matching)
    return pattern
      .replace(/\*/g, '%')
      .replace(/\?/g, '_');
  }

  /**
   * Clean up expired entries from database
   */
  private async cleanupExpired(): Promise<number> {
    try {
      const { error, count } = await (this.supabase as any)
        .from(this.tableName)
        .delete({ count: 'exact' })
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Database cache cleanup error:', error);
        return 0;
      }

      if ((count ?? 0) > 0) {
        console.log(`Database cache: cleaned up ${count} expired entries`);
      }

      return count ?? 0;

    } catch (error) {
      console.error('Database cache cleanup error:', error);
      return 0;
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupTimer(interval: number): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpired();
    }, interval);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop cleanup timer (for testing/shutdown)
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get database cache statistics
   */
  async getDatabaseStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    tableSize: string;
    oldestEntry?: string;
    newestEntry?: string;
  } | null> {
    try {
      const now = new Date().toISOString();

      // Get total count
      const { count: totalCount } = await (this.supabase as any)
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      // Get expired count
      const { count: expiredCount } = await (this.supabase as any)
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .lt('expires_at', now);

      // Get oldest and newest entries
      const { data: oldestData } = await (this.supabase as any)
        .from(this.tableName)
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      const { data: newestData } = await (this.supabase as any)
        .from(this.tableName)
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        totalEntries: totalCount ?? 0,
        expiredEntries: expiredCount ?? 0,
        tableSize: `${totalCount ?? 0} entries`, // Simplified - real size would need pg_total_relation_size
        oldestEntry: oldestData?.[0]?.created_at,
        newestEntry: newestData?.[0]?.created_at
      };

    } catch (error) {
      console.error('Failed to get database cache stats:', error);
      return null;
    }
  }

  /**
   * Get table schema info (for debugging)
   */
  async getTableInfo(): Promise<{ tableName: string; connected: boolean; accessible: boolean }> {
    const connected = await this.ping();
    
    return {
      tableName: this.tableName,
      connected,
      accessible: connected // Simplified - could do more detailed checks
    };
  }
}
