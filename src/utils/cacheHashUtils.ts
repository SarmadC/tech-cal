import { Event } from '@/types';
import { CareerProfile } from '@/types/career';

/**
 * Centralized hash generation utilities for cache keys
 * These should match the hash generation in CareerImpactService
 */
export class CacheHashUtils {
  /**
   * Generate consistent hash for career profile
   * Must match CareerImpactService.generateProfileHash
   */
  static generateProfileHash(careerProfile: CareerProfile): string {
    const profileData = {
      skills: careerProfile.primarySkills?.sort(),
      goals: careerProfile.careerGoals?.sort(),
      industry: careerProfile.industry,
      seniority: careerProfile.seniority
    };
    return btoa(JSON.stringify(profileData)).substring(0, 16);
  }

  /**
   * Generate consistent hash for event data
   * Must match CareerImpactService.generateEventHash
   */
  static generateEventHash(event: Event): string {
    const eventData = {
      title: event.title,
      category: event.category?.name,
      speakers: event.speakerLineup?.length || 0,
      attendees: event.attendeeCount || 0
    };
    return btoa(JSON.stringify(eventData)).substring(0, 16);
  }

  /**
   * Generate batch ID for batch processing
   */
  static generateBatchId(eventIds: string[], profileHash: string): string {
    const batchData = {
      events: eventIds.sort(),
      profile: profileHash,
      timestamp: Math.floor(Date.now() / 60000) // Round to minute for cache efficiency
    };
    return btoa(JSON.stringify(batchData)).substring(0, 20);
  }

  /**
   * Validate hash format
   */
  static isValidHash(hash: string): boolean {
    return /^[A-Za-z0-9+/]+=*$/.test(hash) && hash.length >= 12 && hash.length <= 24;
  }
}
