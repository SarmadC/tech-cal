// src/utils/transformers.ts
import type {
    SupabaseEvent,
    SupabaseEventType,
    SupabaseTrackedEvent,
    SupabaseTrackedEventWithDetails,
    SupabaseProfile,
    AppEvent,
    AppEventType,
    AppTrackedEvent,
    AppProfile,
    EventTransformer,
} from '@/types';

// --- Event Transformers ---
export const eventTransformer: EventTransformer = {
    /**
     * Convert Supabase event to App event
     */
    toApp: (supabaseEvent: SupabaseEvent): AppEvent => ({
        id: supabaseEvent.id,
        createdAt: supabaseEvent.created_at,
        title: supabaseEvent.title,
        description: supabaseEvent.description,
        startTime: supabaseEvent.start_time,
        endTime: supabaseEvent.end_time,
        organizer: supabaseEvent.organizer,
        location: supabaseEvent.location,
        status: supabaseEvent.status,
        sourceUrl: supabaseEvent.source_url,
        livestreamUrl: supabaseEvent.livestream_url,
        eventTypeId: supabaseEvent.event_type_id,
    }),

    /**
     * Convert App event to Supabase event (for updates/inserts)
     */
    toSupabase: (appEvent: Partial<AppEvent>): Partial<SupabaseEvent> => ({
        ...(appEvent.id && { id: appEvent.id }),
        ...(appEvent.title && { title: appEvent.title }),
        ...(appEvent.description && { description: appEvent.description }),
        ...(appEvent.startTime && { start_time: appEvent.startTime }),
        ...(appEvent.endTime !== undefined && { end_time: appEvent.endTime }),
        ...(appEvent.organizer && { organizer: appEvent.organizer }),
        ...(appEvent.location && { location: appEvent.location }),
        ...(appEvent.status && { status: appEvent.status }),
        ...(appEvent.sourceUrl && { source_url: appEvent.sourceUrl }),
        ...(appEvent.livestreamUrl !== undefined && { livestream_url: appEvent.livestreamUrl }),
        ...(appEvent.eventTypeId && { event_type_id: appEvent.eventTypeId }),
    })
};

// --- Event Type Transformers ---
export const eventTypeTransformer = {
    /**
     * Convert Supabase event type to App event type
     */
    toApp: (supabaseEventType: SupabaseEventType): AppEventType => ({
        id: supabaseEventType.id,
        name: supabaseEventType.name || 'Unnamed Category',
        color: supabaseEventType.color || '#808080', // Default to gray
        description: supabaseEventType.description,
    }),

    /**
     * Convert App event type to Supabase event type
     */
    toSupabase: (appEventType: Partial<AppEventType>): Partial<SupabaseEventType> => ({
        ...(appEventType.id && { id: appEventType.id }),
        ...(appEventType.name && { name: appEventType.name }),
        ...(appEventType.color && { color: appEventType.color }),
        ...(appEventType.description !== undefined && { description: appEventType.description }),
    })
};

// --- Tracked Event Transformers ---
export const trackedEventTransformer = {
    /**
     * Convert Supabase tracked event (with nested details) to App tracked event.
     */
    // FIX #2: Use the more specific type for the parameter
    toApp: (supabaseTrackedEvent: SupabaseTrackedEventWithDetails): AppTrackedEvent => {
        // FIX #1: This is the single, correct implementation. The old one is deleted.
        // FIX #2: The 'as any' cast is no longer needed because the type is correct.
        const joinedEventData = supabaseTrackedEvent.events;
        let appEvent: AppEvent | null = null;

        if (joinedEventData) {
            // First, transform the base event
            const baseAppEvent = eventTransformer.toApp(joinedEventData);

            // Then, check for the doubly-nested event_type
            const joinedEventTypeData = joinedEventData.event_type;
            const appEventType = joinedEventTypeData
                ? eventTypeTransformer.toApp(joinedEventTypeData)
                : undefined;

            // Finally, enrich the event with category and color
            appEvent = enrichEvent(baseAppEvent, { eventType: appEventType });
        }

        return {
            trackingId: supabaseTrackedEvent.id,
            userId: supabaseTrackedEvent.user_id,
            eventId: supabaseTrackedEvent.event_id,
            status: supabaseTrackedEvent.status,
            notes: supabaseTrackedEvent.notes,
            trackedAt: supabaseTrackedEvent.created_at,
            event: appEvent,
        };
    },

    /**
     * Convert App tracked event to Supabase tracked event (for updates/inserts)
     */
    toSupabase: (appTrackedEvent: Partial<AppTrackedEvent>): Partial<SupabaseTrackedEvent> => ({
        ...(appTrackedEvent.trackingId && { id: appTrackedEvent.trackingId }),
        ...(appTrackedEvent.userId && { user_id: appTrackedEvent.userId }),
        ...(appTrackedEvent.eventId && { event_id: appTrackedEvent.eventId }),
        ...(appTrackedEvent.status && { status: appTrackedEvent.status }),
        ...(appTrackedEvent.notes !== undefined && { notes: appTrackedEvent.notes }),
        ...(appTrackedEvent.trackedAt && { created_at: appTrackedEvent.trackedAt }),
    })
};
export const profileTransformer = {
    toApp: (supabaseProfile: SupabaseProfile): AppProfile => ({
        id: supabaseProfile.id,
        fullName: supabaseProfile.full_name,
        avatarUrl: supabaseProfile.avatar_url,
        timezone: supabaseProfile.timezone,
        preferences: supabaseProfile.preferences,
        createdAt: supabaseProfile.created_at,
        updatedAt: supabaseProfile.updated_at,
    }),

    toSupabase: (appProfile: Partial<AppProfile>): Partial<SupabaseProfile> => ({
        ...(appProfile.hasOwnProperty('id') && { id: appProfile.id }),
        ...(appProfile.hasOwnProperty('fullName') && { full_name: appProfile.fullName }),
        ...(appProfile.hasOwnProperty('avatarUrl') && { avatar_url: appProfile.avatarUrl }),
        ...(appProfile.hasOwnProperty('timezone') && { timezone: appProfile.timezone }),
        ...(appProfile.hasOwnProperty('preferences') && { preferences: appProfile.preferences }),
    })
};

// --- Enrichment Utilities ---
/**
 * Enrich an event with additional computed data
 */
export const enrichEvent = (
    event: AppEvent,
    options: {
        eventType?: AppEventType;
        isTracked?: boolean;
    } = {}
): AppEvent => ({
    ...event,
    ...(options.eventType && {
        color: options.eventType.color,
        category: options.eventType
    }),
    ...(options.isTracked !== undefined && { isTracked: options.isTracked })
});

/**
 * Enrich an event type with count data
 */
export const enrichEventType = (
    eventType: AppEventType,
    count: number
): AppEventType => ({
    ...eventType,
    eventCount: count,
});

// --- Array Transformers ---
/**
 * Transform array of Supabase events to App events
 */
export const transformEventsToApp = (supabaseEvents: SupabaseEvent[]): AppEvent[] => {
    return supabaseEvents.map(eventTransformer.toApp);
};

/**
 * Transform array of Supabase event types to App event types
 */
export const transformEventTypesToApp = (supabaseEventTypes: SupabaseEventType[]): AppEventType[] => {
    return supabaseEventTypes.map(eventTypeTransformer.toApp);
};

export const transformSimpleTrackedEventsToApp = (
    supabaseTrackedEvents: SupabaseTrackedEvent[]
): AppTrackedEvent[] => {
    return supabaseTrackedEvents.map(trackedEvent => ({
        trackingId: trackedEvent.id,
        userId: trackedEvent.user_id,
        eventId: trackedEvent.event_id,
        status: trackedEvent.status,
        notes: trackedEvent.notes,
        trackedAt: trackedEvent.created_at,
        event: null, // The event data is not available in this simple transform
    }));
};

/**
 * Transforms an array of SupabaseTrackedEvent that INCLUDES nested event and event_type details.
 * This is the function that should be used in `UserEventService.getTrackedEvents`.
 */
export const transformTrackedEventsWithDetailsToApp = (
    supabaseTrackedEvents: SupabaseTrackedEventWithDetails[]
): AppTrackedEvent[] => {
    return supabaseTrackedEvents.map(trackedEventTransformer.toApp);
};

// --- Validation Utilities ---
/**
 * Validate if an object has the required fields for an AppEvent
 */
export const isValidAppEvent = (obj: unknown): obj is AppEvent => {
    if (typeof obj !== 'object' || obj === null) return false;

    const event = obj as Record<string, unknown>;
    return (
        typeof event.id === 'string' &&
        typeof event.title === 'string' &&
        typeof event.startTime === 'string' &&
        typeof event.eventTypeId === 'string'
    );
};

/**
 * Validate if an object has the required fields for a SupabaseEvent
 */
export const isValidSupabaseEvent = (obj: unknown): obj is SupabaseEvent => {
    if (typeof obj !== 'object' || obj === null) return false;

    const event = obj as Record<string, unknown>;
    return (
        typeof event.id === 'string' &&
        typeof event.title === 'string' &&
        typeof event.start_time === 'string' &&
        typeof event.event_type_id === 'string'
    );
};

// --- Helper for FullCalendar Events ---
/**
 * Convert AppEvent to FullCalendar event format
 */
export const toFullCalendarEvent = (event: AppEvent) => ({
    id: event.id,
    title: event.title,
    start: event.startTime,
    end: event.endTime || undefined,
    color: event.color || '#6B7280',
    extendedProps: {
        ...event,
        // Add any additional props needed for the calendar
    }
});

/**
 * Convert array of AppEvents to FullCalendar events
 */
export const toFullCalendarEvents = (events: AppEvent[]) => {
    return events.map(toFullCalendarEvent);
};

// --- Date Utilities for Events ---
/**
 * Check if an event is happening now
 */
export const isEventLive = (event: AppEvent): boolean => {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    return now >= start && now <= end;
};

/**
 * Check if an event is upcoming (starts within 24 hours)
 */
export const isEventUpcoming = (event: AppEvent): boolean => {
    const now = new Date();
    const start = new Date(event.startTime);
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);

    return hoursUntilStart > 0 && hoursUntilStart <= 24;
};

/**
 * Get event status based on timing
 */
export const getEventTimeStatus = (event: AppEvent): 'past' | 'live' | 'upcoming' | 'future' => {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    if (now > end) return 'past';
    if (now >= start && now <= end) return 'live';
    if (isEventUpcoming(event)) return 'upcoming';
    return 'future';
};

