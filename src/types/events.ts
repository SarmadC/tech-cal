// src/types/events.ts

// Re-export AlignmentReason so consumers can import from types
export type { AlignmentReason } from '@/lib/recommendation/baseScorer';
import type { AlignmentReason } from '@/lib/recommendation/baseScorer';

// Forward declaration to avoid circular imports
export interface CareerImpactScore {
  overall: number;
  confidence: number;
  components: {
    skillRelevance: number;
    careerStageMatch: number;
    networkingValue: number;
    industryRelevance: number;
    timingBonus: number;
  };
  explanation: {
    reasons: string[];
    matchedSkills: string[];
    matchedTags?: string[];
    speakerHighlights: string[];
    careerImpactCategory: 'transformative' | 'high' | 'moderate' | 'low';
    confidenceFactors: string[];
    alignmentReasons?: AlignmentReason[];
    matchedGoals?: string[];
  };
  metadata: {
    algorithmVersion: string;
    calculatedAt: string;
    careerProfileHash: string;
    eventDataHash: string;
    scoringTriggers?: string[]; // Triggers that affected this score (e.g., 'type_pref_gate', 'beginner_boost')
    candidateSources?: RecommendationCandidateSource[];
    tagAffinityScore?: number;
    tagAffinityContribution?: number;
    appliedAdjustments?: {
      typePreferenceGate?: number; // Multiplier applied (e.g., 0.75)
      beginnerBoost?: number; // Points added for beginner-friendly content
      workshopKeywordBoost?: boolean; // Workshop keyword detected
      webinarPenalty?: boolean; // Webinar penalty applied
      behavioralBoost?: number; // Points added based on interaction history (Phase 3)
      behavioralSimilarEvents?: string[]; // Event IDs that influenced the behavioral boost
    };
  };
}

export type RecommendationCandidateSource =
  | 'filtered'
  | 'tag-based'
  | 'tag-search'
  | 'text-search'
  | 'discover'
  | 'lookalike'
  | 'cold-start'
  | 'compatibility';

export interface RecommendationReason {
  type: AlignmentReason['type'] | 'tag-affinity' | 'source';
  reason: string;
  contribution: number;
  source: 'career-impact' | RecommendationCandidateSource;
}

export interface RecommendationMetadata {
  matchedTags: string[];
  matchExplanation?: string;
  matchScore: number;
  impactScore: number;
  profileBoost: number;
  recencyBoost: number;
  popularityBoost: number;
  totalScore: number;
  reasons: string[];
  tagRank?: number;
  alignmentScore?: number | null;
  alignmentConfidence?: number | null;
  alignmentComponents?: CareerImpactScore['components'] | null;
  alignmentStrategyVersion?: string;
  alignmentExplanation?: string[];
  candidateSources?: RecommendationCandidateSource[];
  explanation?: RecommendationReason[];
  alignmentRank?: number;
  source?: string;
  lookalikeSupport?: number;
  lookalikeCohortSize?: number;
}


// ============================================
// AGENDA TYPES
// ============================================

export interface AgendaItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  description?: string;
  location?: string;
  dayNumber?: number;
  duration?: number;
  durationMinutes?: number;
  track?: string;
  topics?: string[];
  sortOrder?: number;
  speaker?: Speaker;
  speakers?: Speaker[];
}

// ============================================
// BASE EVENT TYPE
// ============================================

/**
 * Core event data structure - the single source of truth for events
 */
export interface Event {
    // Core identifiers
    id: string;
    createdAt: string;
    updatedAt?: string | null;

    // Event information
    title: string;
    description: string;
    organizer: string;
    location: string;
    status: string;

    // Timing
    startTime: string;
    endTime: string | null;
    timezone?: string | null;

    // URLs
    sourceUrl: string;
    livestreamUrl: string | null;
    registrationUrl?: string | null;

    // Categorization
    eventTypeId: string;
    category?: EventType;
    tags?: EventTag[];

    // Organization information
    organization?: {
        id: string;
        name: string;
        logo?: string;
    };

    // Visual
    color?: string;
    eventImageUrl?: string | null;

    // Additional metadata
    priceRange?: string | null;
    priceMin?: number | null;
    capacity?: number | null;
    attendeeCount?: number | null;
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
    eventFormat?: 'Online' | 'In-person' | 'Hybrid' | null;
    targetAudience?: string | null;
    prerequisites?: string | null;
    networkAttendingCount?: number;
    networkSampleAvatars?: string[];

    
    // Agenda and speaker information
    agendaUrl?: string | null;
    speakerLineup?: Speaker[] | null;
    
    // Agenda information for multi-day events
    agenda?: AgendaItem[];

    // Personalized recommendation metadata
    recommendationMetadata?: RecommendationMetadata;
    recommendationProvenance?: RecommendationCandidateSource[];
}

// ============================================
// EVENT ENHANCEMENTS (Using Intersection Types)
// ============================================

// ============================================
// EVENT ENHANCEMENTS (Consolidated)
// ============================================

/**
 * Event with tracking status
 */
export type EventWithTracking = Event & {
    isTracked: boolean;
    trackingStatus?: EventStatus;
    trackingNotes?: string | null;
};

/**
 * Event with career impact scoring
 */
export type EventWithCareerImpact = Event & {
    careerImpact?: CareerImpactScore;
    isCareerScored: boolean;
    scoringError?: string;
};

/**
 * Event with multi-day support
 */
export type EventWithMultiDay = Event & {
    isMultiDay: boolean;
    dailySchedule?: DailySchedule;
    eventPattern: 'single' | 'multi_day' | 'all_day' | 'recurring';
    instanceInfo?: {
        originalEventId: string;
        instanceDate: string;
        dayNumber: number;
        totalDays: number;
        isFirstDay: boolean;
        isLastDay: boolean;
    };
};

/**
 * Event with all enhancements
 */
export type EnhancedEvent = Event & EventWithTracking & EventWithCareerImpact & EventWithMultiDay;

// Legacy aliases for backwards compatibility
export type TrackedEvent = EventWithTracking;
export type MultiDayEvent = EventWithMultiDay;
export type FullEvent = EnhancedEvent;

// ============================================
// CALENDAR-SPECIFIC TYPES
// ============================================

/**
 * Minimal event for calendar operations - replaces CalendarEvent
 * Use this for date/time calculations and filtering
 */
export interface CalendarEventData {
    id: string;
    title: string;
    start: string | Date;
    end: string | Date | null;
    allDay?: boolean;
    color?: string;
    extendedProps?: {
        event: Event;
        [key: string]: unknown;
    };
}

// FullCalendar event interface moved to utils/transformers.ts to avoid duplication

// ============================================
// SUPPORTING TYPES
// ============================================

export interface EventType {
    id: string;
    name: string;
    color: string;
    description: string | null;
    icon?: string | null;
    eventCount?: number;
}

export interface EventTag {
    id: string;
    name: string;
    color: string;
    category: string;
}

export interface Speaker {
    id: string;
    name: string;
    title?: string;
    company?: string;
    bio?: string;
    photoUrl?: string;
    linkedinUrl?: string;
    socialLinks?: {
        twitter?: string;
        linkedin?: string;
        website?: string;
    };
}


// Database schema for agenda items
// Note: Speakers are linked via agenda_speakers join table, not directly on agenda items
export interface DatabaseAgendaItem {
    id: string;
    event_id: string;
    day_number: number;
    start_time: string;
    end_time: string;
    title: string;
    description: string;
    location: string;
    agenda_type: string;
    duration_minutes: number;
    track: string;
    topics: string[] | null;
    difficulty_level: string | null;
    prerequisites: string | null;
    capacity: number | null;
    is_required: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface DailySchedule {
    type: 'daily_recurring' | 'all_day' | 'custom';
    dailyStart?: string;
    dailyEnd?: string;
    timezone?: string;
    note?: string;
    schedule?: Array<{
        date: string;
        start: string;
        end: string;
    }>;
    custom_schedule?: Array<{
        day: number;
        start: string;
        end: string;
        note?: string;
    }>;
}

export const EVENT_STATUS = {
    // BOOKMARKED removed - use isBookmarked boolean instead
    ATTENDING: 'attending',
    ATTENDED: 'attended',
    CANCELLED: 'cancelled',
} as const;

// EventStatus is now strictly for attendance
export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS];

// New type for attendance-only status (bookmarking is separate)
export type AttendanceStatus = 'attending' | 'attended' | 'cancelled' | null;

// ============================================
// USER EVENT TRACKING
// ============================================

export interface TrackedEventRecord {
    trackingId: string;
    userId: string;
    eventId: string;
    status: EventStatus | null;  // Now strictly for attendance, can be null
    notes: string | null;
    trackedAt: string;
    isBookmarked: boolean;  // Separate from attendance status
    bookmarkedAt: string | null;  // Timestamp of first bookmark
    event: Event | null;
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if an event has tracking information
 */
export function isTrackedEvent(event: Event): event is TrackedEvent {
    return 'isTracked' in event && typeof event.isTracked === 'boolean';
}

/**
 * Check if an event has multi-day information
 */
export function isMultiDayEvent(event: Event): event is MultiDayEvent {
    return 'isMultiDay' in event && typeof event.isMultiDay === 'boolean';
}

/**
 * Check if an event has both tracking and multi-day info
 */
export function isFullEvent(event: Event): event is FullEvent {
    return isTrackedEvent(event) && isMultiDayEvent(event);
}

/**
 * Check if an event is currently being tracked by the user
 */
export function isEventTracked(event: Event | TrackedEvent): boolean {
    return isTrackedEvent(event) ? event.isTracked : false;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Enrich a base event with tracking information
 */
export function enrichWithTracking(
    event: Event,
    isTracked: boolean,
    status?: EventStatus,
    notes?: string | null
): TrackedEvent {
    return {
        ...event,
        isTracked,
        trackingStatus: status,
        trackingNotes: notes,
    };
}

/**
 * Enrich a base event with multi-day information
 */
export function enrichWithMultiDay(
    event: Event,
    multiDayInfo: {
        isMultiDay: boolean;
        dailySchedule?: DailySchedule;
        eventPattern: MultiDayEvent['eventPattern'];
    }
): MultiDayEvent {
    return {
        ...event,
        ...multiDayInfo,
    };
}

// FullCalendar event conversion moved to utils/transformers.ts to avoid duplication

/**
 * Convert event to minimal calendar data
 */
export function toCalendarData(event: Event): CalendarEventData {
    return {
        id: event.id,
        title: event.title,
        start: event.startTime,
        end: event.endTime,
        color: event.color || event.category?.color,
        extendedProps: {
            event,
        },
    };
}

export interface MultiDayEventInstance extends Event {
    isInstance: boolean;
    originalEventId: string;
    instanceDate: string;
    dayInfo?: {
        currentDay: number;
        totalDays: number;
        isFirstDay: boolean;
        isLastDay: boolean;
        continuationType: 'start' | 'middle' | 'end' | 'single';
    };
    // Multi-day specific properties for single-card display
    isMultiDay?: boolean;
    multiDaySpan?: number;
    multiDayStart?: Date;
    multiDayEnd?: Date;
}
