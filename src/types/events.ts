// src/types/events.ts

/**
 * Consolidated Event Types for Kure-Cal
 * This replaces the multiple event type variations with a cleaner hierarchy
 */

// ============================================
// BASE EVENT TYPE
// ============================================

/**
 * Core event data structure - the single source of truth for events
 * This replaces the old AppEvent type
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
}

// ============================================
// EVENT ENHANCEMENTS (Using Intersection Types)
// ============================================

/**
 * Event with tracking status - replaces EnrichedAppEvent
 * Use this when you need to guarantee tracking status is known
 */
export type TrackedEvent = Event & {
    isTracked: boolean;
    trackingStatus?: EventStatus;
    trackingNotes?: string | null;
};

/**
 * Event with multi-day support - replaces EnhancedAppEvent
 * Use this for calendar views that need to handle multi-day events
 */
export type MultiDayEvent = Event & {
    isMultiDay: boolean;
    dailySchedule?: DailySchedule;
    eventPattern: 'single' | 'multi_day' | 'all_day' | 'recurring';

    // For multi-day event instances
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
 * Event with both tracking and multi-day support
 * Use this when you need both features (e.g., calendar views with tracking)
 */
export type FullEvent = TrackedEvent & MultiDayEvent;

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

// ============================================
// MIGRATION HELPERS
// ============================================

/**
 * Type aliases for gradual migration
 * @deprecated Use the new type names directly
 */
export type AppEvent = Event;
export type EnrichedAppEvent = TrackedEvent;
export type EnhancedAppEvent = MultiDayEvent;
export type CalendarEvent = CalendarEventData;
export type AppEventType = EventType;
export type AppTrackedEvent = TrackedEventRecord;
