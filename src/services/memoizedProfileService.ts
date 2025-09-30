// Memoized profile calculation service to eliminate duplicate calculations
import { AppProfile, CareerProfile, SupabaseClientType } from '@/types';
import { CareerProfileService } from '@/services/careerProfileService';
import { CareerImpactCache } from '@/services/cache/careerImpactCache';

interface MemoizedProfileData {
  careerProfile: CareerProfile | null;
  profileHash: string;
  timestamp: number;
}

/**
 * Service to memoize expensive profile calculations
 * Uses composite cache key (userId + dataHash) to prevent stale data issues
 */
export class MemoizedProfileService {
  private static cache = new Map<string, MemoizedProfileData>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_CACHE_SIZE = 100; // Prevent memory bloat

  /**
   * Generate composite cache key based on userId and profile data
   * Prevents stale data when profile changes
   */
  private static generateCacheKey(userProfile: AppProfile): string {
    const relevantData = {
      id: userProfile.id,
      fullName: userProfile.fullName,
      preferences: userProfile.preferences,
      updatedAt: userProfile.updatedAt
    };

    // Use a simple hash function instead of truncated base64
    const jsonString = JSON.stringify(relevantData);
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `${userProfile.id}:${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get career profile with memoization (async version using new table)
   */
  static async getCareerProfile(
    userProfile: AppProfile, 
    supabaseClient: SupabaseClientType
  ): Promise<CareerProfile | null> {
    const cacheKey = this.generateCacheKey(userProfile);
    const cached = this.getCachedData(cacheKey);
    if (cached?.careerProfile) {
      return cached.careerProfile;
    }

    const careerProfile = await CareerProfileService.getCareerProfile(userProfile.id, supabaseClient);
    this.setCache(cacheKey, careerProfile, '');
    return careerProfile;
  }

  /**
   * Get career profile with memoization (legacy sync version for backward compatibility)
   */
  static getCareerProfileSync(userProfile: AppProfile): CareerProfile | null {
    const cacheKey = this.generateCacheKey(userProfile);
    const cached = this.getCachedData(cacheKey);
    if (cached?.careerProfile) {
      return cached.careerProfile;
    }

    const careerProfile = CareerProfileService.getCareerProfileFromPreferences(userProfile);
    this.setCache(cacheKey, careerProfile, '');
    return careerProfile;
  }

  /**
   * Get both career profile and hash in one call (async version using new table)
   */
  static async getCareerProfileAndHash(
    userProfile: AppProfile, 
    supabaseClient: SupabaseClientType
  ): Promise<{
    careerProfile: CareerProfile | null;
    profileHash: string;
  }> {
    const cacheKey = this.generateCacheKey(userProfile);
    const cached = this.getCachedData(cacheKey);

    if (cached?.careerProfile && cached?.profileHash) {
      return {
        careerProfile: cached.careerProfile,
        profileHash: cached.profileHash
      };
    }

    // Compute both together to avoid inconsistency
    const careerProfile = await CareerProfileService.getCareerProfile(userProfile.id, supabaseClient);
    const profileHash = careerProfile ? CareerImpactCache.generateProfileHash(careerProfile) : '';

    this.setCache(cacheKey, careerProfile, profileHash);
    return { careerProfile, profileHash };
  }

  /**
   * Get both career profile and hash in one call (legacy sync version for backward compatibility)
   */
  static getCareerProfileAndHashSync(userProfile: AppProfile): {
    careerProfile: CareerProfile | null;
    profileHash: string;
  } {
    const cacheKey = this.generateCacheKey(userProfile);
    const cached = this.getCachedData(cacheKey);

    if (cached?.careerProfile && cached?.profileHash) {
      return {
        careerProfile: cached.careerProfile,
        profileHash: cached.profileHash
      };
    }

    // Compute both together to avoid inconsistency
    const careerProfile = CareerProfileService.getCareerProfileFromPreferences(userProfile);
    const profileHash = careerProfile ? CareerImpactCache.generateProfileHash(careerProfile) : '';

    this.setCache(cacheKey, careerProfile, profileHash);
    return { careerProfile, profileHash };
  }

  /**
   * Invalidate cache for a specific user (all variants)
   */
  static invalidateUser(userId: string): void {
    // Remove all cache entries for this user (different data hashes)
    for (const [key] of this.cache) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([cacheKey, data]) => ({
        cacheKey,
        timestamp: data.timestamp,
        age: Date.now() - data.timestamp
      }))
    };
  }

  /**
   * Test method to validate cache behavior (for development)
   */
  static _testCacheConsistency(userProfile: AppProfile): {
    cacheKey: string;
    isCached: boolean;
    cacheSize: number;
  } {
    const cacheKey = this.generateCacheKey(userProfile);
    const cached = this.cache.get(cacheKey);

    return {
      cacheKey,
      isCached: !!cached,
      cacheSize: this.cache.size
    };
  }

  // Private helper methods
  private static getCachedData(cacheKey: string): MemoizedProfileData | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  private static setCache(cacheKey: string, careerProfile: CareerProfile | null, profileHash: string): void {
    // Evict oldest if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    this.cache.set(cacheKey, {
      careerProfile,
      profileHash,
      timestamp: Date.now()
    });
  }

  private static evictOldest(): void {
    // Simple FIFO eviction - remove oldest 10% of entries
    const toRemove = Math.ceil(this.cache.size * 0.1);
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, toRemove);

    entries.forEach(([key]) => this.cache.delete(key));
  }
}