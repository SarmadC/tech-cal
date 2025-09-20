import { 
  CacheService, 
  CareerImpactCacheService, 
  CacheKeyGenerator,
  CacheServiceFactory,
  CacheConfig 
} from '@/types/cache';
import { DefaultCacheKeyGenerator } from './cacheKeyGenerator';
import { DefaultCareerImpactCacheService } from './careerImpactCacheService';
import { RedisCacheService } from './redisCacheService';
import { MemoryCacheService } from './memoryCacheService';
import { DatabaseCacheService } from './databaseCacheService';
import { validateCacheConfig } from '@/config/cache';

/**
 * Factory for creating cache services based on configuration
 */
export class DefaultCacheServiceFactory implements CacheServiceFactory {
  /**
   * Create cache service based on configuration
   */
  createCacheService(config: CacheConfig): CacheService {
    // Validate configuration
    const errors = validateCacheConfig(config);
    if (errors.length > 0) {
      throw new Error(`Invalid cache configuration: ${errors.join(', ')}`);
    }

    switch (config.type) {
      case 'redis':
        return this.createRedisCacheService(config);
      case 'database':
        return this.createDatabaseCacheService(config);
      case 'memory':
        return this.createMemoryCacheService(config);
      default:
        throw new Error(`Unsupported cache type: ${config.type}`);
    }
  }

  /**
   * Create career impact cache service
   */
  createCareerImpactCache(config: CacheConfig): CareerImpactCacheService {
    const cacheService = this.createCacheService(config);
    const keyGenerator = this.createKeyGenerator(config);
    
    return new DefaultCareerImpactCacheService(cacheService, keyGenerator, config);
  }

  /**
   * Create cache key generator
   */
  createKeyGenerator(config: CacheConfig): CacheKeyGenerator {
    return new DefaultCacheKeyGenerator(config);
  }

  /**
   * Create Redis cache service
   */
  private createRedisCacheService(config: CacheConfig): CacheService {
    return new RedisCacheService(config);
  }

  /**
   * Create database cache service
   */
  private createDatabaseCacheService(config: CacheConfig): CacheService {
    return new DatabaseCacheService(config);
  }

  /**
   * Create memory cache service
   */
  private createMemoryCacheService(config: CacheConfig): CacheService {
    return new MemoryCacheService(config);
  }
}

/**
 * Singleton factory instance
 */
export const cacheServiceFactory = new DefaultCacheServiceFactory();
