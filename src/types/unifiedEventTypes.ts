// Unified event types to eliminate interface explosion
import { Event } from './events';

// =============================================
// CORE EVENT TYPES (Consolidated)
// =============================================

/**
 * Base event with tracking capability
 */
export interface TrackableEvent extends Event {
  isTracked?: boolean;
  trackingStatus?: 'bookmarked' | 'attending' | 'attended' | 'cancelled';
  trackingNotes?: string | null;
}

/**
 * Event with discovery/recommendation metadata
 */
export interface RecommendationEvent extends TrackableEvent {
  // Discovery metrics
  discoveryMetrics?: {
    personalizedScore: number;
    behaviorScore?: number;
    collaborativeScore?: number;
    semanticScore?: number;
    skillProgressionScore?: number;
    timingScore?: number;
    categoryAffinityScore?: number;
    diversityScore?: number;
    trendingScore?: number;
    freshnessScore?: number;
    popularityScore?: number;
    locationRelevanceScore?: number;
    careerRelevanceScore?: number;
  };
  
  // Discovery context
  discoveryReason?: string;
  discoverySection?: 'for_you' | 'trending' | 'new_this_week' | 'quick_wins';
  algorithmVersion?: string;
  
  // Enhanced flags
  isPersonalized?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  
  // Career matching
  careerMatch?: {
    relevanceScore: number;
    reasons: string[];
    careerImpact: 'low' | 'moderate' | 'high' | 'transformative';
    skillAlignment: 'no-match' | 'weak-match' | 'moderate-match' | 'strong-match' | 'perfect-match';
    networkingValue: 'low' | 'moderate' | 'high' | 'exceptional';
    timingRelevance: 'poor' | 'okay' | 'good' | 'perfect';
  };
}

/**
 * Event with complete analytics context (for internal use)
 */
export interface AnalyticsEvent extends RecommendationEvent {
  // Analytics metadata
  viewCount?: number;
  clickCount?: number;
  trackingCount?: number;
  lastInteraction?: string;
  
  // Performance metrics
  recommendationPosition?: number;
  recommendationSession?: string;
  interactionHistory?: Array<{
    type: 'view' | 'click' | 'track' | 'dismiss';
    timestamp: string;
    context?: Record<string, unknown>;
  }>;
}

// =============================================
// TYPE GUARDS AND UTILITIES
// =============================================

/**
 * Type guard to check if event has tracking data
 */
export function isTrackableEvent(event: Event): event is TrackableEvent {
  return 'isTracked' in event;
}

/**
 * Type guard to check if event has recommendation data
 */
export function isRecommendationEvent(event: Event): event is RecommendationEvent {
  return 'discoveryMetrics' in event || 'discoveryReason' in event;
}

/**
 * Type guard to check if event has analytics data
 */
export function isAnalyticsEvent(event: Event): event is AnalyticsEvent {
  return 'viewCount' in event || 'interactionHistory' in event;
}

/**
 * Convert basic Event to TrackableEvent
 */
export function makeTrackable(event: Event, isTracked: boolean = false): TrackableEvent {
  return {
    ...event,
    isTracked
  };
}

/**
 * Convert Event to RecommendationEvent with discovery data
 */
export function makeRecommendation(
  event: Event | TrackableEvent,
  discoveryData: {
    personalizedScore: number;
    discoveryReason?: string;
    discoverySection?: RecommendationEvent['discoverySection'];
    algorithmVersion?: string;
  }
): RecommendationEvent {
  return {
    ...event,
    discoveryMetrics: {
      personalizedScore: discoveryData.personalizedScore,
    },
    discoveryReason: discoveryData.discoveryReason,
    discoverySection: discoveryData.discoverySection,
    algorithmVersion: discoveryData.algorithmVersion || 'v1.0',
  };
}

/**
 * Enhance RecommendationEvent with full analytics context
 */
export function makeAnalytics(event: RecommendationEvent, analyticsData: {
  viewCount?: number;
  clickCount?: number;
  trackingCount?: number;
  lastInteraction?: string;
}): AnalyticsEvent {
  return {
    ...event,
    ...analyticsData
  };
}

// =============================================
// MIGRATION HELPERS
// =============================================

/**
 * Convert legacy DiscoveryEvent to new RecommendationEvent
 */
export function migrateDiscoveryEvent(legacyEvent: unknown): RecommendationEvent {
  const event = legacyEvent as Record<string, unknown>;
  return {
    ...event,
    discoveryMetrics: (event.discoveryMetrics as Record<string, unknown>) || {
      personalizedScore: 0.5
    },
    discoveryReason: (event.discoveryReason as string) || 'Recommended for you',
    algorithmVersion: (event.algorithmVersion as string) || 'v1.0'
  } as RecommendationEvent;
}

/**
 * Convert legacy EnhancedDiscoveryEvent to new RecommendationEvent
 */
export function migrateEnhancedDiscoveryEvent(legacyEvent: unknown): RecommendationEvent {
  const event = legacyEvent as Record<string, unknown>;
  const metrics = event.discoveryMetrics as Record<string, unknown> | undefined;
  
  return {
    ...event,
    discoveryMetrics: {
      personalizedScore: (metrics?.personalizedScore as number) || 0.5,
      behaviorScore: event.behaviorScore as number,
      collaborativeScore: event.collaborativeScore as number,
      semanticScore: event.semanticScore as number,
      skillProgressionScore: event.skillProgressionScore as number,
      timingScore: event.timingScore as number,
      categoryAffinityScore: event.categoryAffinityScore as number,
      diversityScore: event.diversityScore as number,
      trendingScore: metrics?.trendingScore as number,
      freshnessScore: metrics?.freshnessScore as number,
      popularityScore: metrics?.popularityScore as number,
      locationRelevanceScore: metrics?.locationRelevanceScore as number,
      careerRelevanceScore: metrics?.careerRelevanceScore as number,
    },
    careerMatch: event.careerMatch as RecommendationEvent['careerMatch']
  } as RecommendationEvent;
}
