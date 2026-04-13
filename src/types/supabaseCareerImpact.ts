// Supabase-specific types for career impact system
// Generated types that match the database schema

import { Database } from './supabase';

// ⚠️ WARNING: These types assume the new tables exist in the database schema
// If these tables don't exist yet, the types will cause compilation errors
// The actual Database type from supabase.ts needs to be updated with the new tables

// ============================================
// DATABASE TABLE TYPES (TEMPORARY - until schema is updated)
// ============================================

// Career Impact Scores Table - TEMPORARY TYPES
export interface CareerImpactScoresRow {
  id: string;
  user_id: string;
  event_id: string;
  overall_score: number;
  confidence: number;
  skill_relevance_score: number;
  career_stage_score: number;
  networking_score: number;
  industry_relevance_score: number;
  timing_bonus: number;
  reasons: string[];
  matched_skills: string[];
  speaker_highlights: string[];
  career_impact_category: 'transformative' | 'high' | 'moderate' | 'low';
  algorithm_version: string;
  career_profile_hash: string;
  event_data_hash: string;
  calculated_at: string;
}

export interface CareerImpactScoresInsert {
  id?: string;
  user_id: string;
  event_id: string;
  overall_score: number;
  confidence: number;
  skill_relevance_score?: number;
  career_stage_score?: number;
  networking_score?: number;
  industry_relevance_score?: number;
  timing_bonus?: number;
  reasons?: string[];
  matched_skills?: string[];
  speaker_highlights?: string[];
  career_impact_category?: 'transformative' | 'high' | 'moderate' | 'low';
  algorithm_version?: string;
  career_profile_hash: string;
  event_data_hash: string;
  calculated_at?: string;
}

export interface CareerImpactScoresUpdate {
  id?: string;
  user_id?: string;
  event_id?: string;
  overall_score?: number;
  confidence?: number;
  skill_relevance_score?: number;
  career_stage_score?: number;
  networking_score?: number;
  industry_relevance_score?: number;
  timing_bonus?: number;
  reasons?: string[];
  matched_skills?: string[];
  speaker_highlights?: string[];
  career_impact_category?: 'transformative' | 'high' | 'moderate' | 'low';
  algorithm_version?: string;
  career_profile_hash?: string;
  event_data_hash?: string;
  calculated_at?: string;
}

// Event Feedback Table - TEMPORARY TYPES
export interface EventFeedbackRow {
  id: string;
  user_id: string;
  event_id: string;
  predicted_score: number;
  actual_value_rating: number | null;
  career_benefit: 'none' | 'low' | 'moderate' | 'high' | 'transformative' | null;
  skills_gained: string[];
  connections_made: number;
  would_recommend: boolean | null;
  feedback_text: string | null;
  event_attended: boolean;
  feedback_date: string;
}

export interface EventFeedbackInsert {
  id?: string;
  user_id: string;
  event_id: string;
  predicted_score: number;
  actual_value_rating?: number;
  career_benefit?: 'none' | 'low' | 'moderate' | 'high' | 'transformative';
  skills_gained?: string[];
  connections_made?: number;
  would_recommend?: boolean;
  feedback_text?: string;
  event_attended?: boolean;
  feedback_date?: string;
}

export interface EventFeedbackUpdate {
  id?: string;
  user_id?: string;
  event_id?: string;
  predicted_score?: number;
  actual_value_rating?: number;
  career_benefit?: 'none' | 'low' | 'moderate' | 'high' | 'transformative';
  skills_gained?: string[];
  connections_made?: number;
  would_recommend?: boolean;
  feedback_text?: string;
  event_attended?: boolean;
  feedback_date?: string;
}

export interface EventNetworkingSummaryRow {
  id: string;
  user_id: string;
  event_id: string;
  linkedin_requests_sent: number | null;
  last_outreach_logged_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventNetworkingSummaryInsert {
  id?: string;
  user_id: string;
  event_id: string;
  linkedin_requests_sent?: number | null;
  last_outreach_logged_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EventNetworkingSummaryUpdate {
  id?: string;
  user_id?: string;
  event_id?: string;
  linkedin_requests_sent?: number | null;
  last_outreach_logged_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Career Profile Snapshots Table - TEMPORARY TYPES
export interface CareerProfileSnapshotsRow {
  id: string;
  user_id: string;
  profile_hash: string;
  profile_data: Record<string, unknown>;
  created_at: string;
}

export interface CareerProfileSnapshotsInsert {
  id?: string;
  user_id: string;
  profile_hash: string;
  profile_data: Record<string, unknown>;
  created_at?: string;
}

export interface CareerProfileSnapshotsUpdate {
  id?: string;
  user_id?: string;
  profile_hash?: string;
  profile_data?: Record<string, unknown>;
  created_at?: string;
}

// Career Impact Analytics Table - TEMPORARY TYPES
export interface CareerImpactAnalyticsRow {
  id: string;
  user_id: string;
  event_id: string | null;
  metric_type: string;
  metric_value: number;
  algorithm_version: string;
  experiment_variant: string | null;
  measured_at: string;
}

export interface CareerImpactAnalyticsInsert {
  id?: string;
  user_id: string;
  event_id?: string;
  metric_type: string;
  metric_value: number;
  algorithm_version: string;
  experiment_variant?: string;
  measured_at?: string;
}

export interface CareerImpactAnalyticsUpdate {
  id?: string;
  user_id?: string;
  event_id?: string;
  metric_type?: string;
  metric_value?: number;
  algorithm_version?: string;
  experiment_variant?: string;
  measured_at?: string;
}

// Enhanced User Events Table (with career impact fields)
export type UserEventsWithCareerImpactRow = Database['public']['Tables']['user_events']['Row'];
export type UserEventsWithCareerImpactInsert = Database['public']['Tables']['user_events']['Insert'];
export type UserEventsWithCareerImpactUpdate = Database['public']['Tables']['user_events']['Update'];

// ============================================
// COMPOSITE TYPES WITH RELATIONSHIPS
// ============================================

/**
 * Career impact score with related event data
 */
export type CareerImpactScoreWithEvent = CareerImpactScoresRow & {
  events: Database['public']['Tables']['events']['Row'];
  profiles: Database['public']['Tables']['profiles']['Row'];
};

/**
 * Event feedback with related event and user data
 */
export type EventFeedbackWithDetails = EventFeedbackRow & {
  events: Database['public']['Tables']['events']['Row'];
  profiles: Database['public']['Tables']['profiles']['Row'];
};

/**
 * User event with career impact and event details
 */
export type UserEventWithCareerImpactAndDetails = UserEventsWithCareerImpactRow & {
  events: Database['public']['Tables']['events']['Row'];
  career_impact_scores?: CareerImpactScoresRow;
};

/**
 * Career profile snapshot with user data
 */
export type CareerProfileSnapshotWithUser = CareerProfileSnapshotsRow & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

// ============================================
// QUERY RESULT TYPES
// ============================================

/**
 * Career impact scores query result with joins
 */
export type CareerImpactScoresQueryResult = {
  id: string;
  user_id: string;
  event_id: string;
  overall_score: number;
  confidence: number;
  skill_relevance_score: number;
  career_stage_score: number;
  networking_score: number;
  industry_relevance_score: number;
  timing_bonus: number;
  reasons: string[];
  matched_skills: string[];
  speaker_highlights: string[];
  career_impact_category: 'transformative' | 'high' | 'moderate' | 'low';
  algorithm_version: string;
  career_profile_hash: string;
  event_data_hash: string;
  calculated_at: string;
  
  // Joined event data
  events: {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    location: string | null;
    event_type_id: string | null;
    organizer_id: string | null;
    difficulty_level: string | null;
    target_audience: string | null;
    speaker_lineup: Record<string, unknown>;
    tags?: Array<{
      id: string;
      event_tag: string;
      color: string;
      category: string;
    }>;
  };
  
  // Joined profile data
  profiles: {
    id: string;
    full_name: string | null;
    preferences: Record<string, unknown>;
  };
};

/**
 * Event feedback query result with joins
 */
export type EventFeedbackQueryResult = {
  id: string;
  user_id: string;
  event_id: string;
  predicted_score: number;
  actual_value_rating: number | null;
  career_benefit: 'none' | 'low' | 'moderate' | 'high' | 'transformative' | null;
  skills_gained: string[];
  connections_made: number;
  would_recommend: boolean | null;
  feedback_text: string | null;
  event_attended: boolean;
  feedback_date: string;
  
  // Joined event data
  events: {
    id: string;
    title: string;
    start_time: string;
    organizer_id: string | null;
  };
  
  // Joined profile data
  profiles: {
    id: string;
    full_name: string | null;
  };
};

// ============================================
// AGGREGATION TYPES
// ============================================

/**
 * Career impact analytics aggregation
 */
export type CareerImpactAnalyticsAggregation = {
  algorithm_version: string;
  total_scores: number;
  average_accuracy: number;
  high_impact_count: number;
  moderate_impact_count: number;
  low_impact_count: number;
  average_confidence: number;
  feedback_count: number;
  average_actual_rating: number;
};

/**
 * User career impact summary
 */
export type UserCareerImpactSummary = {
  user_id: string;
  total_tracked_events: number;
  average_career_impact_score: number;
  high_impact_events_count: number;
  events_attended: number;
  average_feedback_rating: number;
  top_skills_learned: string[];
  career_growth_score: number;
};

/**
 * Event career impact summary
 */
export type EventCareerImpactSummary = {
  event_id: string;
  total_scores: number;
  average_score: number;
  average_confidence: number;
  high_impact_percentage: number;
  feedback_count: number;
  average_feedback_rating: number;
  top_user_seniority: string[];
  most_matched_skills: string[];
};

// ============================================
// BUSINESS LOGIC TYPES (moved from careerImpact.ts)
// ============================================

/**
 * Event feedback for score validation (business logic type)
 */
export interface EventFeedback {
  id: string;
  userId: string;
  eventId: string;
  predictedScore: number;
  actualValueRating: 1 | 2 | 3 | 4 | 5;
  careerBenefit: 'none' | 'low' | 'moderate' | 'high' | 'transformative';
  skillsGained: string[];
  connectionsMade: number;
  wouldRecommend: boolean;
  feedbackText?: string;
  eventAttended: boolean;
  feedbackDate: string;
}

/**
 * Request for event feedback submission
 */
export interface EventFeedbackRequest {
  eventId: string;
  userId: string;
  feedback: Omit<EventFeedback, 'id' | 'userId' | 'eventId' | 'feedbackDate'>;
}

/**
 * Type guard for EventFeedback
 */
export function isEventFeedback(obj: unknown): obj is EventFeedback {
  return obj !== null &&
    typeof obj === 'object' &&
    'predictedScore' in obj &&
    typeof (obj as Record<string, unknown>).predictedScore === 'number' &&
    'actualValueRating' in obj &&
    typeof (obj as Record<string, unknown>).actualValueRating === 'number' &&
    'careerBenefit' in obj &&
    ['none', 'low', 'moderate', 'high', 'transformative'].includes((obj as Record<string, unknown>).careerBenefit as string);
}

// ============================================
// FILTER AND QUERY TYPES
// ============================================

/**
 * Career impact scores filter options
 */
export interface CareerImpactScoresFilter {
  userId?: string;
  eventId?: string;
  minScore?: number;
  maxScore?: number;
  category?: 'transformative' | 'high' | 'moderate' | 'low';
  algorithmVersion?: string;
  calculatedAfter?: string;
  calculatedBefore?: string;
}

/**
 * Event feedback filter options
 */
export interface EventFeedbackFilter {
  userId?: string;
  eventId?: string;
  eventAttended?: boolean;
  minPredictedScore?: number;
  maxPredictedScore?: number;
  careerBenefit?: 'none' | 'low' | 'moderate' | 'high' | 'transformative';
  feedbackAfter?: string;
  feedbackBefore?: string;
}

/**
 * Career impact analytics filter options
 */
export interface CareerImpactAnalyticsFilter {
  userId?: string;
  eventId?: string;
  metricType?: 'score_accuracy' | 'engagement_rate' | 'conversion_rate' | 'user_satisfaction';
  algorithmVersion?: string;
  experimentVariant?: string;
  measuredAfter?: string;
  measuredBefore?: string;
}

// ============================================
// PAGINATION TYPES
// ============================================

/**
 * Paginated career impact scores result
 */
export type PaginatedCareerImpactScores = {
  data: CareerImpactScoresQueryResult[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

/**
 * Paginated event feedback result
 */
export type PaginatedEventFeedback = {
  data: EventFeedbackQueryResult[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

// ============================================
// TRANSACTION TYPES
// ============================================

/**
 * Career impact score upsert transaction
 */
export type CareerImpactScoreUpsertTransaction = {
  score: CareerImpactScoresInsert;
  invalidateCache?: boolean;
  updateUserEvent?: boolean;
};

/**
 * Event feedback upsert transaction
 */
export type EventFeedbackUpsertTransaction = {
  feedback: EventFeedbackInsert;
  updateScoreAccuracy?: boolean;
  triggerRecalibration?: boolean;
};

// ============================================
// MIGRATION AND MAINTENANCE TYPES
// ============================================

/**
 * Career impact data migration result
 */
export type CareerImpactMigrationResult = {
  migrated: number;
  errors: number;
  skipped: number;
  processingTimeMs: number;
  details: Array<{
    operation: string;
    count: number;
    errors?: string[];
  }>;
};

/**
 * Cache invalidation result
 */
export type CacheInvalidationResult = {
  invalidated: number;
  errors: number;
  processingTimeMs: number;
  details: Array<{
    cacheType: string;
    count: number;
    errors?: string[];
  }>;
};

/**
 * Data cleanup result
 */
export type CareerImpactDataCleanupResult = {
  cleaned: number;
  errors: number;
  processingTimeMs: number;
  details: Array<{
    table: string;
    operation: string;
    count: number;
    errors?: string[];
  }>;
};
