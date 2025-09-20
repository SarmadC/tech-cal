// src/types/events.ts

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
    speakerHighlights: string[];
    careerImpactCategory: 'transformative' | 'high' | 'moderate' | 'low';
    confidenceFactors: string[];
  };
  metadata: {
    algorithmVersion: string;
    calculatedAt: string;
    careerProfileHash: string;
    eventDataHash: string;
  };
}

/**
 * Consolidated Event Types for Kure-Cal
 * This replaces the multiple event type variations with a cleaner hierarchy
 */

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
    capacity?: number | null;
    attendeeCount?: number | null;
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
    targetAudience?: string | null;
    prerequisites?: string | null;

    
    // Agenda and speaker information
    agendaUrl?: string | null;
    speakerLineup?: Speaker[] | null;
    
    // Agenda information for multi-day events
    agenda?: AgendaItem[];
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

/**
 * FullCalendar-specific event format
 */
export interface FullCalendarEvent {
    id: string;
    title: string;
    start: string;
    end?: string;
    color?: string;
    allDay?: boolean;
    extendedProps: {
        description: string;
        location: string;
        organizer: string;
        isTracked?: boolean;
        eventTypeId: string;
        livestreamUrl?: string | null;
    };
}

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
    socialLinks?: {
        twitter?: string;
        linkedin?: string;
        website?: string;
    };
}


// Database schema for agenda items
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
    speaker_id: string | null;
    track: string;
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
    // New: Support for custom daily schedules with different times per day
    custom_schedule?: Array<{
        day: number;
        start: string;
        end: string;
        note?: string;
    }>;
}

export const EVENT_STATUS = {
    BOOKMARKED: 'bookmarked',
    ATTENDING: 'attending',
    ATTENDED: 'attended',
    CANCELLED: 'cancelled',
} as const;

export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS];

// ============================================
// USER EVENT TRACKING
// ============================================

export interface TrackedEventRecord {
    trackingId: string;
    userId: string;
    eventId: string;
    status: EventStatus;
    notes: string | null;
    trackedAt: string;
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

/**
 * Convert event to FullCalendar format
 */
export function toFullCalendarEvent(event: Event | TrackedEvent): FullCalendarEvent {
    return {
        id: event.id,
        title: event.title,
        start: event.startTime,
        end: event.endTime || undefined,
        color: event.color || event.category?.color,
        allDay: false,
        extendedProps: {
            description: event.description,
            location: event.location,
            organizer: event.organizer,
            isTracked: isTrackedEvent(event) ? event.isTracked : undefined,
            eventTypeId: event.eventTypeId,
            livestreamUrl: event.livestreamUrl,
        },
    };
}

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
