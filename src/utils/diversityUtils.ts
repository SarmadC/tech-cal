/**
 * Diversity Enhancement Utilities
 * 
 * Configuration and utilities for diversity enhancement features
 */

// Environment-based configuration for diversity enhancement
export const DIVERSITY_CONFIG = {
  // Feature flags
  ENABLE_DIVERSITY_ENHANCEMENT: process.env.NEXT_PUBLIC_ENABLE_DIVERSITY_ENHANCEMENT !== 'false',
  
  // Thresholds
  MIN_EVENTS_FOR_DIVERSITY: 4,
  MAX_DIVERSITY_SWAPS: 3,
  
  // Scoring adjustments
  DIVERSITY_BONUS: 0.1,
  DIVERSITY_PENALTY: -0.05,
  
  // Distribution limits
  MAX_SAME_TYPE_RATIO: 0.6,
  MAX_SAME_CATEGORY_RATIO: 0.7,
  MAX_SAME_FORMAT_RATIO: 0.8
} as const;

/**
 * Check if diversity enhancement should be applied
 */
export function shouldApplyDiversityEnhancement(
  eventCount: number,
  userPreference?: 'diverse' | 'focused' | 'auto'
): boolean {
  // Check feature flag
  if (!DIVERSITY_CONFIG.ENABLE_DIVERSITY_ENHANCEMENT) {
    return false;
  }

  // Check minimum event count
  if (eventCount < DIVERSITY_CONFIG.MIN_EVENTS_FOR_DIVERSITY) {
    return false;
  }

  // Check user preference
  if (userPreference === 'focused') {
    return false;
  }

  if (userPreference === 'diverse') {
    return true;
  }

  // Default to 'auto' behavior
  return true;
}

/**
 * Get diversity enhancement configuration
 */
export function getDiversityConfig() {
  return DIVERSITY_CONFIG;
}
