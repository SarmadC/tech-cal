import { CacheConfig } from '@/types/cache';

/**
 * Default cache configuration with environment-aware settings
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  type: process.env.KV_REST_API_URL ? 'redis' : 'database',
  
  redis: {
    url: process.env.KV_REST_API_URL || '',
    token: process.env.KV_REST_API_TOKEN,
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },
  
  database: {
    tableName: 'career_impact_cache',
    cleanupInterval: 3600000, // 1 hour in milliseconds
  },
  
  memory: {
    maxSize: 1000, // Maximum number of entries
    cleanupInterval: 300000, // 5 minutes in milliseconds
  },
  
  ttl: {
    default: 86400, // 24 hours
    score: 86400, // 24 hours - full scores
    scoreLite: 43200, // 12 hours - lightweight scores
    batch: 3600, // 1 hour - batch results
  },
  
  keys: {
    prefix: 'career_impact',
    separator: ':',
    patterns: {
      score: 'score',
      scoreLite: 'score_lite',
      batch: 'batch',
      profile: '*', // For profile pattern matching (will be used as *:*:PROFILE_HASH)
      event: '*', // For event pattern matching (will be used as *:EVENT_ID:*)
    },
  },
};

/**
 * Get cache configuration with environment overrides
 */
export function getCacheConfig(): CacheConfig {
  const config = { ...DEFAULT_CACHE_CONFIG };
  
  // Environment-specific overrides
  if (process.env.NODE_ENV === 'development') {
    // Shorter TTL for development
    config.ttl.score = 3600; // 1 hour
    config.ttl.scoreLite = 1800; // 30 minutes
    config.ttl.batch = 600; // 10 minutes
  }
  
  if (process.env.NODE_ENV === 'test') {
    // Use memory cache for tests
    config.type = 'memory';
    config.ttl.score = 60; // 1 minute
    config.ttl.scoreLite = 30; // 30 seconds
    config.ttl.batch = 10; // 10 seconds
  }
  
  // Override cache type if explicitly set
  if (process.env.CACHE_TYPE) {
    config.type = process.env.CACHE_TYPE as 'redis' | 'database' | 'memory';
  }
  
  // Override TTL values if set
  if (process.env.CACHE_TTL_SCORE) {
    config.ttl.score = parseInt(process.env.CACHE_TTL_SCORE, 10);
  }
  
  return config;
}

/**
 * Cache configuration validation
 */
export function validateCacheConfig(config: CacheConfig): string[] {
  const errors: string[] = [];
  
  // Validate Redis configuration
  if (config.type === 'redis') {
    if (!config.redis?.url && !process.env.KV_REST_API_URL) {
      errors.push('Redis URL is required when cache type is redis (set KV_REST_API_URL environment variable)');
    }
  }
  
  // Validate TTL values
  if (config.ttl.default <= 0) {
    errors.push('Default TTL must be positive');
  }
  
  if (config.ttl.score <= 0) {
    errors.push('Score TTL must be positive');
  }
  
  // Validate key configuration
  if (!config.keys.prefix) {
    errors.push('Cache key prefix is required');
  }
  
  if (!config.keys.separator) {
    errors.push('Cache key separator is required');
  }
  
  return errors;
}
