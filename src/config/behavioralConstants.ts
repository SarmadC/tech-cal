/**
 * Behavioral Layer Configuration
 *
 * Constants for Phase 3: Post-interaction boost system
 * Includes similarity detection, A/B testing, and boost strength settings
 */

export const BEHAVIORAL_CONFIG = {
  // Post-interaction boost settings
  BOOST_STRENGTHS: {
    CONTROL: 0,      // No boost (A/B test control group)
    LOW: 5,          // Conservative boost
    MEDIUM: 10,      // Balanced boost
    HIGH: 15         // Aggressive boost
  } as const,

  // Default boost strength (env configurable)
  DEFAULT_BOOST_STRENGTH: 10,

  // Similarity thresholds for different attributes
  SIMILARITY_WEIGHTS: {
    CATEGORY: 0.4,           // Same category = 40% similarity
    SPEAKER: 0.3,            // Same speaker = 30% similarity
    TAGS: 0.2,               // Shared tags = 20% similarity
    LOCATION: 0.1            // Same location = 10% similarity
  } as const,

  // Minimum similarity score to trigger boost
  MIN_SIMILARITY_THRESHOLD: 0.3,

  // Time window for considering interactions (days)
  INTERACTION_WINDOW_DAYS: 30,

  // Maximum events to consider for similarity (performance limit)
  MAX_SIMILAR_EVENTS: 100,

  // A/B test group assignment (user ID hash modulo)
  AB_TEST_GROUPS: {
    CONTROL: 0,     // 25% get no boost
    LOW: 1,         // 25% get low boost
    MEDIUM: 2,      // 25% get medium boost
    HIGH: 3         // 25% get high boost
  } as const,

  // Minimum interactions needed before applying behavioral boost
  MIN_INTERACTIONS_FOR_BOOST: 1,

  // Cache settings for similarity calculations
  SIMILARITY_CACHE_TTL_HOURS: 6,

  // Analytics tracking
  BEHAVIORAL_ANALYTICS: {
    TRACK_SIMILARITY_SCORES: true,
    TRACK_BOOST_APPLICATIONS: true,
    TRACK_AB_GROUP_ASSIGNMENTS: true
  }
} as const;

export type BoostStrength = keyof typeof BEHAVIORAL_CONFIG.BOOST_STRENGTHS;
export type ABTestGroup = keyof typeof BEHAVIORAL_CONFIG.AB_TEST_GROUPS;