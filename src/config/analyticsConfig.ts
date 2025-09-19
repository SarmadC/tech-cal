// Centralized configuration for analytics and recommendation system
// This eliminates scattered constants and provides single source of truth

export const ANALYTICS_CONFIG = {
  // Buffer management
  BUFFER_SIZE: 50,
  FLUSH_INTERVAL: 30000, // 30 seconds
  MAX_ERRORS: 3,
  
  // Memory management
  INACTIVE_THRESHOLD: 30 * 60 * 1000, // 30 minutes
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
  
  // Consent and privacy
  CONSENT_CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  DATA_RETENTION_PERIOD: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
  
  // Algorithm versions
  CURRENT_ALGORITHM_VERSION: 'v1.0',
  
  // Recommendation limits
  DEFAULT_RECOMMENDATION_LIMIT: 5,
  MAX_RECOMMENDATION_LIMIT: 20,
} as const;

export const TIME_CONSTANTS = {
  // Common time periods in milliseconds
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
  YEAR: 365 * 24 * 60 * 60 * 1000,
} as const;

export const SCORING_CONFIG = {
  // Enhanced algorithm weights (must sum to 1.0)
  ENHANCED_WEIGHTS: {
    original: 0.25,           // Base recommendation
    behavior: 0.20,           // User behavior patterns
    collaborative: 0.15,      // Similar users
    semantic: 0.15,           // Content similarity
    skillProgression: 0.10,   // Learning path alignment
    timing: 0.08,             // Timing relevance
    categoryAffinity: 0.05,   // Category preferences
    diversity: 0.02,          // Diversity bonus
  },
  
  // Semantic similarity limits
  MAX_DIRECT_MATCHES: 3,
  MAX_SYNONYM_MATCHES: 2,
  MAX_INDUSTRY_MATCHES: 1,
  
  // Score bonuses
  DIRECT_MATCH_BONUS: 0.3,
  SYNONYM_MATCH_BONUS: 0.2,
  INDUSTRY_MATCH_BONUS: 0.1,
  
  // Trending thresholds
  TRENDING_THRESHOLD: 0.6,
  POPULARITY_THRESHOLD: 0.4,
  
  // Cold start detection
  MIN_TRACKED_EVENTS_FOR_ENHANCED: 3,
  MIN_INTERACTIONS_FOR_BEHAVIOR: 10,
} as const;

export const DATABASE_CONFIG = {
  // Query limits
  DEFAULT_PAGE_SIZE: 100,
  MAX_BATCH_SIZE: 1000,
  
  // Analytics query periods
  BEHAVIOR_ANALYSIS_PERIOD: 30 * TIME_CONSTANTS.DAY,
  TRENDING_ANALYSIS_PERIOD: 7 * TIME_CONSTANTS.DAY,
  COLLABORATIVE_ANALYSIS_PERIOD: 30 * TIME_CONSTANTS.DAY,
  
  // Health check intervals
  HEALTH_CHECK_INTERVAL: 5 * TIME_CONSTANTS.MINUTE,
} as const;

// Validation functions
export function validateAnalyticsConfig(): boolean {
  // Verify weights sum to 1.0
  const weightSum = Object.values(SCORING_CONFIG.ENHANCED_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const isValidWeights = Math.abs(weightSum - 1.0) < 0.001; // Allow for floating point precision
  
  if (!isValidWeights) {
    console.error(`Invalid scoring weights: sum = ${weightSum}, expected = 1.0`);
    return false;
  }
  
  return true;
}

// Type exports for better type safety
export type AlgorithmWeights = typeof SCORING_CONFIG.ENHANCED_WEIGHTS;
export type AnalyticsConfigType = typeof ANALYTICS_CONFIG;
