// Simplified cache invalidation service
import { CareerImpactCache } from '@/services/cache/careerImpactCache';
import { CareerProfileService } from '@/services/careerProfileService';
import { AppProfile } from '@/types';

/**
 * Simplified service for cache invalidation
 * Focuses on essential functionality without over-engineering
 */
export class CacheInvalidationService {

  /**
   * Invalidate all cache entries for a user
   * Simple and race-condition free approach
   */
  static async invalidateUserCache(userId: string): Promise<number> {
    try {
      // Get all possible profile hashes for this user and invalidate them
      // This is simpler and more reliable than trying to track changes
      let totalInvalidated = 0;

      // Invalidate by user pattern (if cache supports it)
      // For now, we'll use a broader invalidation strategy
      totalInvalidated = await CareerImpactCache.invalidateAll();

      console.log(`Cache invalidated for user ${userId}: ${totalInvalidated} entries removed`);
      return totalInvalidated;

    } catch (error) {
      console.error('Cache invalidation failed:', error);
      return 0;
    }
  }

  /**
   * Smart invalidation - only invalidate if profile changes affect career calculations
   */
  static async invalidateIfRelevantChange(
    userId: string,
    oldProfile: AppProfile | null,
    newProfile: AppProfile
  ): Promise<number> {
    if (!this.shouldInvalidateCache(oldProfile, newProfile)) {
      return 0; // No invalidation needed
    }

    return await this.invalidateUserCache(userId);
  }

  /**
   * Check if profile changes require cache invalidation
   * Only invalidates if career-relevant fields changed
   */
  static shouldInvalidateCache(oldProfile: AppProfile | null, newProfile: AppProfile): boolean {
    if (!oldProfile) return true; // New profile always triggers invalidation

    // Generate career profiles and compare hashes
    const oldCareerProfile = CareerProfileService.getCareerProfile(oldProfile);
    const newCareerProfile = CareerProfileService.getCareerProfile(newProfile);

    if (!oldCareerProfile || !newCareerProfile) return true;

    const oldHash = CareerImpactCache.generateProfileHash(oldCareerProfile);
    const newHash = CareerImpactCache.generateProfileHash(newCareerProfile);

    return oldHash !== newHash;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    return await CareerImpactCache.getStats();
  }
}