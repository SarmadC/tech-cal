import { CareerImpactCacheService } from '@/types/cache';
import { cacheServiceFactory } from './cacheServiceFactory';
import { getCacheConfig } from '@/config/cache';

/**
 * Helper functions for creating cache services
 */
export class CacheServiceHelper {
  private static _instance: CareerImpactCacheService | null = null;

  /**
   * Get singleton instance of CareerImpactCacheService
   */
  static getInstance(): CareerImpactCacheService {
    if (!this._instance) {
      const config = getCacheConfig();
      this._instance = cacheServiceFactory.createCareerImpactCache(config);
    }
    return this._instance;
  }

  /**
   * Create a new instance (useful for testing)
   */
  static createInstance(): CareerImpactCacheService {
    const config = getCacheConfig();
    return cacheServiceFactory.createCareerImpactCache(config);
  }

  /**
   * Reset singleton (useful for testing)
   */
  static resetInstance(): void {
    this._instance = null;
  }

  /**
   * Health check for the cache service
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    type: string;
    stats?: {
      hits: number;
      misses: number;
      hitRate: number;
      totalRequests: number;
      lastReset: string;
    };
    error?: string;
  }> {
    try {
      const cache = this.getInstance();
      const healthy = await cache.ping();
      
      if (healthy) {
        const stats = await cache.getStats();
        const config = getCacheConfig();
        
        return {
          healthy: true,
          type: config.type,
          stats
        };
      } else {
        return {
          healthy: false,
          type: getCacheConfig().type,
          error: 'Cache ping failed'
        };
      }
    } catch (error) {
      return {
        healthy: false,
        type: getCacheConfig().type,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Convenience function to get cache service instance
 */
export const getCareerImpactCache = (): CareerImpactCacheService => {
  return CacheServiceHelper.getInstance();
};
