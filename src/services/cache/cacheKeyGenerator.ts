import { CacheKeyGenerator, CacheConfig } from '@/types/cache';

/**
 * Production-ready cache key generator with consistent patterns
 */
export class DefaultCacheKeyGenerator implements CacheKeyGenerator {
  private readonly config: CacheConfig['keys'];

  constructor(config: CacheConfig) {
    this.config = config.keys;
  }

  /**
   * Generate key for full career impact score
   * Pattern: prefix:score:eventId:profileHash
   */
  scoreKey(eventId: string, profileHash: string): string {
    return this.buildKey(this.config.patterns.score, eventId, profileHash);
  }

  /**
   * Generate key for lightweight score
   * Pattern: prefix:score_lite:eventId:profileHash
   */
  scoreLiteKey(eventId: string, profileHash: string): string {
    return this.buildKey(this.config.patterns.scoreLite, eventId, profileHash);
  }

  /**
   * Generate key for batch results
   * Pattern: prefix:batch:batchId
   */
  batchKey(batchId: string): string {
    return this.buildKey(this.config.patterns.batch, batchId);
  }

  /**
   * Generate pattern for profile invalidation
   * Pattern: prefix:*:*:profileHash
   */
  profilePattern(profileHash: string): string {
    return `${this.config.prefix}${this.config.separator}*${this.config.separator}*${this.config.separator}${profileHash}`;
  }

  /**
   * Generate pattern for event invalidation
   * Pattern: prefix:*:eventId:*
   */
  eventPattern(eventId: string): string {
    return `${this.config.prefix}${this.config.separator}*${this.config.separator}${eventId}${this.config.separator}*`;
  }

  /**
   * Generate pattern for all scores
   * Pattern: prefix:score*
   */
  allScoresPattern(): string {
    return `${this.config.prefix}${this.config.separator}score*`;
  }

  /**
   * Build cache key with consistent formatting
   */
  private buildKey(pattern: string, ...args: string[]): string {
    const parts = [this.config.prefix, pattern, ...args];
    return parts.join(this.config.separator);
  }

  /**
   * Validate key format (useful for debugging)
   */
  private validateKey(key: string): boolean {
    return key.startsWith(this.config.prefix) && key.includes(this.config.separator);
  }

  /**
   * Extract components from key (useful for debugging/monitoring)
   */
  parseKey(key: string): { prefix: string; pattern: string; args: string[] } | null {
    if (!this.validateKey(key)) {
      return null;
    }

    const parts = key.split(this.config.separator);
    const [prefix, pattern, ...args] = parts;
    
    return { prefix, pattern, args };
  }
}
