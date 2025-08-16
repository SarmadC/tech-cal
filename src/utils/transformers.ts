// src/utils/transformers.ts
import type {
    SupabaseEvent,
    SupabaseEventType,
    SupabaseTrackedEvent,
    SupabaseProfile,
    AppEvent,
    AppEventType,
    AppTrackedEvent,
    AppProfile,
    EventTransformer,
    SupabaseEventWithDetails,
    SupabaseTrackedEventWithDetails,
    ProfileTransformer,
    DailySchedule,
    EnhancedAppEvent,
} from '@/types';
// [ADDED] Import the color utility library
import { transparentize } from 'color2k';

// --- Event Transformers ---
export const eventTransformer: EventTransformer = {
    toApp: (supabaseEvent: SupabaseEvent | SupabaseEventWithDetails): AppEvent => {
        const organizerName = (supabaseEvent as SupabaseEventWithDetails).organizer?.name || 'Unknown Organizer';
        return {
            id: supabaseEvent.id,
            createdAt: supabaseEvent.created_at,
            title: supabaseEvent.title || 'Untitled Event',
            description: supabaseEvent.description || '',
            startTime: supabaseEvent.start_time || new Date().toISOString(),
            endTime: supabaseEvent.end_time,
            organizer: organizerName,
            location: supabaseEvent.location || 'Online',
            status: supabaseEvent.status || 'confirmed',
            sourceUrl: supabaseEvent.source_url || '#',
            livestreamUrl: supabaseEvent.livestream_url,
            eventTypeId: supabaseEvent.event_type_id || '',
        };
    },
    toSupabase: (appEvent: Partial<AppEvent>): Partial<SupabaseEvent> => ({
        ...(appEvent.id && { id: appEvent.id }),
        ...(appEvent.title && { title: appEvent.title }),
        ...(appEvent.description && { description: appEvent.description }),
        ...(appEvent.startTime && { start_time: appEvent.startTime }),
        ...(appEvent.endTime !== undefined && { end_time: appEvent.endTime }),
        ...(appEvent.location && { location: appEvent.location }),
        ...(appEvent.status && { status: appEvent.status }),
        ...(appEvent.sourceUrl && { source_url: appEvent.sourceUrl }),
        ...(appEvent.livestreamUrl !== undefined && { livestream_url: appEvent.livestreamUrl }),
        ...(appEvent.eventTypeId && { event_type_id: appEvent.eventTypeId }),
    })
};

// --- Event Type Transformers ---
export const eventTypeTransformer = {
    toApp: (supabaseEventType: SupabaseEventType): AppEventType => ({
        id: supabaseEventType.id,
        name: supabaseEventType.name || 'Unnamed Category',
        color: supabaseEventType.color || '#808080',
        description: supabaseEventType.description,
    }),
    toSupabase: (appEventType: Partial<AppEventType>): Partial<SupabaseEventType> => ({
        ...(appEventType.id && { id: appEventType.id }),
        ...(appEventType.name && { name: appEventType.name }),
        ...(appEventType.color && { color: appEventType.color }),
        ...(appEventType.description !== undefined && { description: appEventType.description }),
    })
};

// --- Profile Transformers ---
export const profileTransformer: ProfileTransformer = {
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

// --- Tracked Event Transformers ---
export const trackedEventTransformer = {
    toApp: (supabaseTrackedEvent: SupabaseTrackedEventWithDetails): AppTrackedEvent => {
        const joinedEventData = supabaseTrackedEvent.events;
        let appEvent: AppEvent | null = null;
        if (joinedEventData) {
            const baseAppEvent = eventTransformer.toApp(joinedEventData);
            const joinedEventTypeData = joinedEventData.event_type;
            const appEventType = joinedEventTypeData
                ? eventTypeTransformer.toApp(joinedEventTypeData)
                : undefined;
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
    toSupabase: (appTrackedEvent: Partial<AppTrackedEvent>): Partial<SupabaseTrackedEvent> => ({
        ...(appTrackedEvent.trackingId && { id: appTrackedEvent.trackingId }),
        ...(appTrackedEvent.userId && { user_id: appTrackedEvent.userId }),
        ...(appTrackedEvent.eventId && { event_id: appTrackedEvent.eventId }),
        ...(appTrackedEvent.status && { status: appTrackedEvent.status }),
        ...(appTrackedEvent.notes !== undefined && { notes: appTrackedEvent.notes }),
        ...(appTrackedEvent.trackedAt && { created_at: appTrackedEvent.trackedAt }),
    })
};

// --- Enrichment Utilities ---
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

export const enrichEventType = (
    eventType: AppEventType,
    count: number
): AppEventType => ({
    ...eventType,
    eventCount: count,
});

// --- Array Transformers ---
export const transformEventsToApp = (supabaseEvents: SupabaseEvent[]): AppEvent[] => {
    return supabaseEvents.map(eventTransformer.toApp);
};
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
        event: null,
    }));
};
export const transformTrackedEventsWithDetailsToApp = (
    supabaseTrackedEvents: SupabaseTrackedEventWithDetails[]
): AppTrackedEvent[] => {
    return supabaseTrackedEvents.map(trackedEventTransformer.toApp);
};

// --- Validation Utilities ---
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

// ==========================================================
// [MODIFIED] Helper for FullCalendar Events
// This is the only function that has been changed.
// ==========================================================
export const toFullCalendarEvent = (event: AppEvent) => {
    // 1. Get the color from the event's category data, or use a neutral default.
    //    Your `enrichEvent` function already adds this, so we just use it.
    const eventColor = event.color || '#6B7280'; // Gray fallback

    // 2. Use the color utility to create a light, transparent background color.
    //    85% transparent (0.85) usually looks good for a light background.
    const backgroundColor = transparentize(eventColor, 0.85);

    return {
        id: event.id,
        title: event.title,
        start: event.startTime,
        end: event.endTime || undefined,
        extendedProps: { ...event },

        // 3. Directly assign the dynamic colors to the FullCalendar event object.
        //    FullCalendar will use these to style the event automatically.
        backgroundColor: backgroundColor,
        borderColor: eventColor, // A solid border using the main color
        textColor: 'var(--foreground-primary)', // Ensures text is always readable against any background
    };
};

export const toFullCalendarEvents = (events: AppEvent[]) => {
    return events.map(toFullCalendarEvent);
};

// --- Date Utilities for Events ---
export const isEventLive = (event: AppEvent): boolean => {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now >= start && now <= end;
};

export const isEventUpcoming = (event: AppEvent): boolean => {
    const now = new Date();
    const start = new Date(event.startTime);
    const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilStart > 0 && hoursUntilStart <= 24;
};

export const getEventTimeStatus = (event: AppEvent): 'past' | 'live' | 'upcoming' | 'future' => {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    if (now > end) return 'past';
    if (now >= start && now <= end) return 'live';
    if (isEventUpcoming(event)) return 'upcoming';
    return 'future';
};

export const enhancedEventTransformer = {
    toApp: (supabaseEvent: SupabaseEventWithDetails & {
        is_multi_day?: boolean;
        daily_schedule?: DailySchedule;
        event_pattern?: string;
    }): EnhancedAppEvent => {
        const baseEvent = eventTransformer.toApp(supabaseEvent);

        // Fix: Properly validate and type the event_pattern
        const isValidPattern = (pattern: string): pattern is 'single' | 'multi_day' | 'all_day' | 'custom' => {
            return ['single', 'multi_day', 'all_day', 'custom'].includes(pattern);
        };

        const eventPattern = supabaseEvent.event_pattern && isValidPattern(supabaseEvent.event_pattern)
            ? supabaseEvent.event_pattern
            : 'single';

        return {
            ...baseEvent,
            isMultiDay: supabaseEvent.is_multi_day || false,
            dailySchedule: supabaseEvent.daily_schedule || undefined,
            eventPattern: eventPattern
        };
    }
};