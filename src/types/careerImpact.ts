// Career Impact Scoring Types
// Comprehensive TypeScript interfaces for the career impact system

import { Event, CareerImpactScore } from './events';
import { CareerProfile } from './career';

// ============================================
// CORE CAREER IMPACT TYPES
// ============================================

// CareerImpactScore interface is now defined in events.ts to avoid circular imports

// Database types moved to supabaseCareerImpact.ts

// ============================================
// ENHANCED EVENT TYPES
// ============================================

// Event types moved to events.ts - use EventWithCareerImpact
// Event feedback types moved to supabaseCareerImpact.ts

// Career profile snapshot types moved to supabaseCareerImpact.ts

// ============================================
// SCORING ALGORITHM TYPES
// ============================================

/**
 * Input parameters for career impact calculation
 */
export interface CareerImpactCalculationInput {
  event: Event;
  careerProfile: CareerProfile;
  options?: CareerImpactCalculationOptions;
}

/**
 * Options for career impact calculation
 */
export interface CareerImpactCalculationOptions {
  useCache?: boolean;
  forceRecalculation?: boolean;
  algorithmVersion?: string;
  includeExplanations?: boolean;
  debugMode?: boolean;
  // Cache-specific options
  skipCache?: boolean;
  cacheTtl?: number;
}

/**
 * Component scoring functions return type
 */
export interface ComponentScore {
  score: number;
  maxScore: number;
  explanation: string;
  confidence: number;
  details?: Record<string, unknown>;
}

/**
 * Scoring algorithm configuration
 */
export interface ScoringAlgorithmConfig {
  version: string;
  weights: {
    skillRelevance: number;
    careerStageMatch: number;
    networkingValue: number;
    industryRelevance: number;
    timingBonus: number;
  };
  thresholds: {
    highImpact: number;
    moderateImpact: number;
    lowImpact: number;
  };
  confidenceFactors: {
    dataCompleteness: number;
    profileCompleteness: number;
    eventDetailLevel: number;
  };
}

// ============================================
// BATCH PROCESSING TYPES
// ============================================

/**
 * Batch career impact calculation input
 */
export interface BatchCareerImpactInput {
  events: Event[];
  careerProfile: CareerProfile;
  options?: CareerImpactCalculationOptions;
}

/**
 * Batch calculation result
 */
export interface BatchCareerImpactResult {
  scores: Map<string, CareerImpactScore>;
  errors: Array<{
    eventId: string;
    error: string;
  }>;
  stats: {
    totalEvents: number;
    successfulCalculations: number;
    cachedScores: number;
    newCalculations: number;
    processingTimeMs: number;
  };
}

// ============================================
// CACHING TYPES
// ============================================

/**
 * Cache key for career impact scores
 */
export interface CareerImpactCacheKey {
  eventId: string;
  careerProfileHash: string;
  algorithmVersion: string;
}

/**
 * Cache invalidation strategy
 */
export interface CacheInvalidationStrategy {
  onProfileUpdate: boolean;
  onEventUpdate: boolean;
  onAlgorithmUpdate: boolean;
  ttlSeconds: number;
  maxAge: number;
}

// ============================================
// FEEDBACK & VALIDATION TYPES
// ============================================

/**
 * Score accuracy analysis
 */
export interface ScoreAccuracyAnalysis {
  overallAccuracy: number;
  componentAccuracy: Record<string, number>;
  commonMispredictions: Array<{
    pattern: string;
    frequency: number;
    suggestedFix: string;
  }>;
  recommendations: string[];
}

/**
 * A/B testing experiment for scoring
 */
export interface ScoringExperiment {
  id: string;
  name: string;
  variants: string[];
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused';
  metrics: string[];
  results?: ExperimentResults;
}

/**
 * Experiment results
 */
export interface ExperimentResults {
  variant: string;
  participants: number;
  accuracy: number;
  userSatisfaction: number;
  performance: number;
  confidence: number;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Request for career impact score calculation
 */
export interface CareerImpactScoreRequest {
  eventId: string;
  userId: string;
  options?: CareerImpactCalculationOptions;
}

/**
 * Response for career impact score calculation
 */
export interface CareerImpactScoreResponse {
  score: CareerImpactScore;
  cached: boolean;
  processingTimeMs: number;
}

/**
 * Request for batch career impact calculation
 */
export interface BatchCareerImpactRequest {
  eventIds: string[];
  userId: string;
  options?: CareerImpactCalculationOptions;
}

/**
 * Response for batch career impact calculation
 */
export interface BatchCareerImpactResponse {
  scores: Record<string, CareerImpactScore>;
  errors: Record<string, string>;
  stats: BatchCareerImpactResult['stats'];
}

// Event feedback request types moved to supabaseCareerImpact.ts

/**
 * Request for feedback analysis
 */
export interface FeedbackAnalysisRequest {
  algorithmVersion?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  userId?: string;
}

// User event types moved to supabaseCareerImpact.ts

// Analytics types moved to supabaseCareerImpact.ts

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for EventWithCareerImpact
 */
export function isEventWithCareerImpact(event: Event): event is Event & { isCareerScored: boolean; careerImpact?: CareerImpactScore; } {
  return 'isCareerScored' in event;
}

/**
 * Type guard for CareerImpactScore
 */
export function isCareerImpactScore(obj: unknown): obj is CareerImpactScore {
  return obj !== null && 
    typeof obj === 'object' &&
    'overall' in obj &&
    typeof (obj as Record<string, unknown>).overall === 'number' &&
    'confidence' in obj &&
    typeof (obj as Record<string, unknown>).confidence === 'number' &&
    'components' in obj &&
    'explanation' in obj &&
    'metadata' in obj;
}

// Event feedback type guard moved to supabaseCareerImpact.ts

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Career impact score summary for UI display
 */
export type CareerImpactSummary = Pick<CareerImpactScore, 'overall' | 'confidence' | 'explanation'>;

/**
 * Career impact score with minimal data for performance
 */
export type CareerImpactScoreLite = {
  overall: number;
  confidence: number;
  category: 'transformative' | 'high' | 'moderate' | 'low';
};

/**
 * Career impact scoring error
 */
export interface CareerImpactError {
  code: string;
  message: string;
  eventId?: string;
  userId?: string;
  details?: Record<string, unknown>;
}

/**
 * Career impact scoring result with error handling
 */
export type CareerImpactResult = 
  | { success: true; score: CareerImpactScore }
  | { success: false; error: CareerImpactError };
