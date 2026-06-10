/**
 * Centralized Scoring Configuration
 *
 * Single source of truth for all scoring weights, thresholds, and constants
 * used by the recommendation system.
 *
 * Benefits:
 * - DRY: Eliminates duplicated constants across files
 * - Maintainable: Easy to tune scoring behavior
 * - Testable: Config can be mocked/modified for tests
 * - Documented: All scoring parameters in one place
 *
 * Used by:
 * - AdvancedScorer (services/scoring/strategies/AdvancedScorer.ts)
 * - baseScorer (lib/recommendation/baseScorer.ts)
 * - Various scoring utilities
 */

import type { ScoringAlgorithmConfig } from '@/types/careerImpact';

// ============================================
// ADVANCED SCORER CONFIGURATION (v2.0.0)
// ============================================

/**
 * Advanced scorer algorithm configuration
 * Used by AdvancedScorer for weighted component scoring
 */
export const ADVANCED_SCORER_CONFIG: ScoringAlgorithmConfig = {
  version: 'v2.0.0',
  weights: {
    skillRelevance: 0.30,      // Most important for career growth
    careerStageMatch: 0.25,    // Critical for relevance
    networkingValue: 0.20,     // Important for advancement
    industryRelevance: 0.15,   // Sector alignment
    timingBonus: 0.10,         // Timing is less critical
  },
  thresholds: {
    highImpact: 85,            // More selective for high impact
    moderateImpact: 65,        // Better distinction
    lowImpact: 45,             // Improved categorization
  },
  confidenceFactors: {
    dataCompleteness: 0.35,    // More data = higher confidence
    profileCompleteness: 0.40, // Profile quality matters
    eventDetailLevel: 0.25,    // Event details important
  },
};

/**
 * Score thresholds for categorization
 */
export const SCORE_THRESHOLDS = {
  HIGH: 80,
  MODERATE: 60,
  LOW: 40,
} as const;

/**
 * Confidence boost values based on score quality
 */
export const CONFIDENCE_BOOSTS = {
  HIGH: 0.2,
  MODERATE: 0.15,
  LOW: 0.1,
} as const;

/**
 * Beginner-friendly keywords for skill matching
 */
export const BEGINNER_KEYWORDS = [
  'beginner', 'intro', 'introduction', '101', 'fundamentals',
  'basics', 'getting started', 'learn',
] as const;

// ============================================
// BASE SCORER CONFIGURATION
// ============================================

/**
 * Alignment scoring weights for base scorer
 *
 * Tuned to produce 50-80% scores for genuinely good matches:
 * - Event with 2-3 skill matches should score 50-60%
 * - Event with skills + goals + interests should score 70-80%
 * - Event with just 1 match should score 20-30%
 */
export const ALIGNMENT_WEIGHTS = {
  skillsToLearn: 25,      // Highest priority - learning new skills
  primarySkills: 15,      // Maintaining/advancing existing skills
  careerGoals: 18,        // Supporting career objectives
  interests: 12,          // Personal interests alignment
  learningStyle: 8,       // Preferred learning format
  networking: 15,         // Networking opportunities
  role: 10,               // Role alignment weight
} as const;

/**
 * Keywords for matching career goals to event content
 */
export const GOAL_KEYWORDS: Record<string, readonly string[]> = {
  'skill-development': ['workshop', 'training', 'bootcamp', 'course', 'tutorial', 'hands-on', 'upskill', 'skill'],
  'role-transition': [
    'career transition',
    'career change',
    'career pivot',
    'new role',
    'role change',
    'switch careers',
    'job search',
    'interview',
    'resume',
    'cv',
  ],
  'leadership-growth': [
    'leadership',
    'manager',
    'management',
    'people leader',
    'executive',
    'influence',
    'stakeholder',
    'coaching',
    'mentoring',
  ],
  'networking': [
    'networking',
    'meetup',
    'mixer',
    'community',
    'connect',
    'connections',
    'roundtable',
    'happy hour',
    'social',
  ],
} as const;

/**
 * Keywords for matching learning styles to event formats
 */
export const LEARNING_STYLE_KEYWORDS: Record<string, readonly string[]> = {
  'hands-on': ['workshop', 'lab', 'hands-on', 'practical', 'coding'],
  'theoretical': ['lecture', 'presentation', 'keynote', 'talk'],
  'interactive': ['panel', 'discussion', 'q&a', 'interactive'],
  'networking': ['networking', 'meetup', 'mixer', 'social', 'github'],
  'case-studies': ['case study', 'real-world', 'example', 'demo'],
  'peer-learning': ['community', 'peer', 'group', 'collaborative'],
} as const;

// ============================================
// EVENT TYPE SCORING
// ============================================

/**
 * Base scores for event types based on skill development potential
 */
export const EVENT_TYPE_SCORES: Record<string, number> = {
  // Canonical types (normalized)
  'workshop': 95,      // Hands-on learning
  'conference': 75,    // Knowledge sharing
  'webinar': 70,       // Focused learning
  'meetup': 60,        // Community learning
  // Non-canonical fallbacks
  'training': 90,      // Structured skill building
  'course': 85,        // Comprehensive learning
  'networking': 35,    // Limited skill focus
  'social': 15,        // Minimal skill development
} as const;

/**
 * Default score for unknown event types
 */
export const DEFAULT_EVENT_TYPE_SCORE = 30;

// ============================================
// SENIORITY MATCHING
// ============================================

/**
 * Seniority level matching configuration
 */
export const SENIORITY_CONFIG: Record<string, {
  keywords: readonly string[];
  eventTypes: readonly string[];
  score: number;
}> = {
  'junior': {
    keywords: ['beginner', 'introduction', 'fundamentals', 'basics', 'getting started', 'entry level'],
    eventTypes: ['workshop', 'training', 'course'],
    score: 85,
  },
  'mid-level': {
    keywords: ['intermediate', 'advanced', 'professional', 'practical', 'real-world', 'hands-on'],
    eventTypes: ['workshop', 'conference', 'training'],
    score: 80,
  },
  'senior': {
    keywords: ['advanced', 'expert', 'leadership', 'architecture', 'strategy', 'senior', 'principal'],
    eventTypes: ['conference', 'workshop', 'networking'],
    score: 75,
  },
  'executive': {
    keywords: ['leadership', 'strategy', 'management', 'executive', 'c-level', 'vision', 'transformation'],
    eventTypes: ['conference', 'networking', 'social'],
    score: 70,
  },
} as const;

// ============================================
// CAREER GOAL MATCHING (for AdvancedScorer)
// ============================================

/**
 * Career goal keywords for AdvancedScorer career goals matching
 */
export const CAREER_GOAL_KEYWORDS: Record<string, readonly string[]> = {
  'skill-development': ['learn', 'skill', 'training', 'workshop', 'course', 'certification'],
  'career-advancement': ['career', 'advancement', 'promotion', 'leadership', 'management'],
  'networking': ['network', 'connect', 'meet', 'community', 'industry'],
  'industry-knowledge': ['industry', 'trends', 'market', 'sector', 'domain'],
  'leadership-growth': ['leadership', 'management', 'team', 'strategy', 'vision'],
} as const;

// ============================================
// CONTENT DEPTH ANALYSIS
// ============================================

/**
 * Keywords indicating deep technical content
 */
export const DEPTH_KEYWORDS = [
  'advanced', 'deep dive', 'comprehensive', 'masterclass', 'bootcamp',
  'certification', 'hands-on', 'practical', 'real-world', 'case study',
] as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get event type score with fallback
 */
export function getEventTypeScore(eventType: string): number {
  const normalizedType = eventType.toLowerCase();
  return EVENT_TYPE_SCORES[normalizedType] ?? DEFAULT_EVENT_TYPE_SCORE;
}

/**
 * Get seniority config with fallback
 */
export function getSeniorityConfig(seniority: string): typeof SENIORITY_CONFIG[string] | null {
  return SENIORITY_CONFIG[seniority] ?? null;
}

/**
 * Get goal reason display text
 */
export function getGoalReason(goal: string): string {
  const goalMap: Record<string, string> = {
    'skill-development': 'Build in-demand skills',
    'role-transition': 'Support your role transition',
    'leadership-growth': 'Grow leadership capabilities',
    'networking': 'Build industry relationships',
  };

  return goalMap[goal] ?? `Supports ${goal.replace('-', ' ')}`;
}

/**
 * Get learning style reason display text
 */
export function getLearningStyleReason(style: string): string {
  const styleMap: Record<string, string> = {
    'hands-on': 'Hands-on workshop format',
    'theoretical': 'Expert-led session style',
    'interactive': 'Interactive discussion format',
    'networking': 'Collaborative peer exchange format',
    'case-studies': 'Case-study driven format',
    'peer-learning': 'Collaborative peer-learning format',
  };

  return styleMap[style] ?? `Fits ${style.replace('-', ' ')} learning`;
}

// ============================================
// TAG MATCHING CONFIGURATION (v1.0.0)
// ============================================

/**
 * Configuration for TagBasedMatchingService
 * Consolidates all inline constants for match scoring, boosting, and penalties.
 * Deep-frozen for runtime immutability to ensure parity during refactors.
 */
function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj as Readonly<T>;
  }

  Object.freeze(obj);
  const record = obj as Record<string, unknown>;

  Object.keys(record).forEach((key) => {
    const value = record[key];
    if (value && typeof value === 'object') {
      deepFreeze(value as Record<string, unknown>);
    }
  });

  return obj as Readonly<T>;
}

export const TAG_MATCHING_CONFIG = deepFreeze({
  // Raw bidirectional map seeds (normalized at runtime)
  RAW_TAG_SIMILARITIES: {
    // Programming Languages
    'javascript': ['js', 'node.js', 'nodejs', 'typescript', 'ts'],
    'python': ['django', 'flask', 'fastapi', 'pandas', 'numpy'],
    'react': ['jsx', 'next.js', 'nextjs', 'frontend', 'javascript'],
    'ai': ['artificial intelligence', 'machine learning', 'ml', 'deep learning'],
    'machine learning': ['ai', 'artificial intelligence', 'data science', 'ml'],
    'data science': ['machine learning', 'ai', 'analytics', 'data analysis'],
    
    // Event Types
    'workshop': ['training', 'bootcamp', 'masterclass', 'hands-on'],
    'conference': ['summit', 'convention', 'symposium'],
    'meetup': ['networking', 'social', 'community'],
    'webinar': ['online', 'virtual', 'livestream'],
    
    // Difficulty Levels
    // Note: levels deliberately do not map to each other ('intermediate' is not
    // similar to 'advanced') — cross-level links made difficulty matching meaningless.
    'beginner': ['intro', '101', 'fundamentals', 'basics'],
    'intermediate': ['experienced', 'professional'],
    'advanced': ['expert', 'senior', 'master', 'specialist'],
    
    // Industry Context
    'fintech': ['financial technology', 'banking', 'payments'],
    'healthcare': ['health tech', 'medical', 'biotech'],
    'ecommerce': ['online retail', 'marketplace', 'shopping'],
    'startup': ['entrepreneurship', 'founder', 'venture'],
    
    // Soft Skills
    'leadership': ['management', 'team lead', 'director'],
    'communication': ['presentation', 'public speaking', 'writing'],
    'project management': ['agile', 'scrum', 'planning']
  },

  // Base weights for different tag categories
  CATEGORY_WEIGHTS: {
    'Programming': 1.0,
    'Framework': 0.9,
    'Tech': 0.8,
    'Development': 0.8,
    'Methodology': 0.7,
    'Platform': 0.7,
    'Business': 0.6,
    'Industry': 0.5,
    'Event-Type': 0.4,
    'Difficulty': 0.3,
    'Soft-Skills': 0.6,
    'Career-Stage': 0.5,
    'Community': 0.4,
    'Agenda': 0.7
  },
  DEFAULT_CATEGORY_WEIGHT: 0.5,

  // Points awarded for different types of tag matches
  MATCH_POINTS: {
    DIRECT: 30,
    SIMILARITY: 20,
    CATEGORY: 10
  },

  // Weight multipliers for experience levels
  // [Primary Skills, Skills To Learn]
  EXPERIENCE_WEIGHTS: {
    BEGINNER: { PRIMARY: 0.6, LEARN: 1.0 },
    STANDARD: { PRIMARY: 1.0, LEARN: 0.4 },
  },

  // Multiplier for role alignment matches
  ROLE_MATCH_MULTIPLIER: 0.5,

  // Main Recommendation Path Weights (getRecommendedEventsByTags)
  RECOMMENDATION: {
    WEIGHTS: {
      MATCH_SCORE: 0.55,
      IMPACT_SCORE: 0.22,
      LOCATION_SCALE: 8, // Multiplier for 0-1 location score
      TEXT_MATCH_TITLE: 5,
      TEXT_MATCH_AGENDA: 3,
    }
  },

  // Discovery Fallback Path Weights (getDiscoveryEventsOnly)
  DISCOVERY: {
    WEIGHTS: {
      MATCH_SCORE: 0.55,
      IMPACT_SCORE: 0.22,
      LOCATION_SCALE: 10, // Note: Discovery uses 10x multiplier vs 8x in Recommendation
    }
  },

  // Profile-based Boosts
  PROFILE_BOOSTS: {
    PREFERRED_EVENT_TYPE: 8,
    ROLE_MATCH: 5,
    SENIORITY_MATCH: 4,
    GOALS: {
      NETWORKING: 6,
      SKILL_DEVELOPMENT: 5,
      LEADERSHIP: 5,
      ENTREPRENEURSHIP: 4,
    },
    LEARNING_STYLE: {
      HANDS_ON: 5,
      INTERACTIVE: 3,
      THEORETICAL: 2,
    },
    NETWORKING: {
      EXECUTIVE: 4,
      PEER: 3,
    }
  },

  // Recency Boosts (days -> points)
  RECENCY_BOOSTS: [
    { maxDays: 7, points: 6 },
    { maxDays: 14, points: 4 },
    { maxDays: 30, points: 2 },
  ],

  // Popularity Boosts (attendees -> points)
  POPULARITY_BOOSTS: [
    { minAttendees: 1000, points: 6 },
    { minAttendees: 500, points: 4 },
    { minAttendees: 100, points: 2 },
    { minAttendees: 0, points: 1 },
  ],
  
  // Maximum number of candidates to process in memory
  MAX_CANDIDATES: 100,

} as const);
