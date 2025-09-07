// src/utils/transformers.ts

// 1. UPDATE IMPORTS: Use the new, specific type names. The deprecated aliases are no longer needed here.
import type {
    SupabaseEvent,
    SupabaseEventType,
    SupabaseTrackedEvent,
    SupabaseProfile,
    Event, // Replaces AppEvent
    EventType, // Replaces AppEventType
    EventTag, // For event tags
    Speaker, // For speaker lineup
    TrackedEventRecord, // Replaces AppTrackedEvent
    AppProfile, // Assuming this will become `Profile` later, but keeping as-is for now
    MultiDayEvent, // Replaces EnhancedAppEvent
    SupabaseEventWithDetails,
    SupabaseTrackedEventWithDetails,
    ProfileTransformer,
    DailySchedule,
    Json,
    AgendaItem,
    DatabaseAgendaItem
} from '@/types';
import { transparentize } from 'color2k';
import {
    isEventLive as isEventLiveUtil,
    isEventUpcoming as isEventUpcomingUtil,
    getEventTimeStatus as getEventTimeStatusUtil
} from '@/utils/dateUtils';

// --- Event Transformers ---
// 2. UPDATE SIGNATURES: The transformer now correctly returns the base `Event` type.
// Helper function to convert logo URL to appropriate format
const getLogoUrl = (logoUrl: string | null | undefined, organizerName?: string, supabaseUrl?: string): string | undefined => {
    if (!logoUrl) return undefined;
    
    // If it's already a full URL (starts with http), return as-is
    if (logoUrl.startsWith('http')) {
        return logoUrl;
    }
    
    // If it's a domain name (contains a dot but no file extension), use Logo.dev API
    if (logoUrl.includes('.') && !logoUrl.includes('/') && !logoUrl.match(/\.(png|jpg|jpeg|svg|webp)$/i)) {
        // Special handling for known companies with better transparent logos
        const specialLogos: Record<string, string> = {
            'meta.com': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
            'facebook.com': 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg',
        };
        
        if (specialLogos[logoUrl]) {
            return specialLogos[logoUrl];
        }
        
        // Logo.dev API with SVG format for better scalability
        return `https://img.logo.dev/${logoUrl}?token=pk_GQL0xmfkStGE1eRKNPXh4A&format=svg&size=24`;
    }
    
    // If it's a filename (including SVG), construct Supabase storage URL
    const baseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mddgtexrnnlctttbcpsy.supabase.co';
    if (baseUrl) {
        return `${baseUrl}/storage/v1/object/public/logos/${logoUrl}`;
    }
    
    return logoUrl;
};

export const eventTransformer = {
    toApp: (supabaseEvent: SupabaseEvent | SupabaseEventWithDetails): Event => {
        const organizerData = (supabaseEvent as SupabaseEventWithDetails).organizer;
        const organizerName = organizerData?.name || 'Unknown Organizer';
        const rawLogoUrl = organizerData?.logo_url ?? undefined;
        const organizerLogo = getLogoUrl(rawLogoUrl, organizerName);
        
        // Transform event tags from database format to app format
        // Tags are now directly attached to the event object
        const eventTags: EventTag[] = (supabaseEvent as SupabaseEventWithDetails).tags || [];

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
            ...(eventTags.length > 0 && { tags: eventTags }),
            organization: {
                id: (supabaseEvent as SupabaseEventWithDetails).organizer?.id || '',
                name: organizerName,
                ...(organizerLogo && { logo: organizerLogo })
            },
            // Add agenda fields
            ...((supabaseEvent as SupabaseEventWithDetails).agenda_url && { 
                agendaUrl: (supabaseEvent as SupabaseEventWithDetails).agenda_url 
            }),
            ...((supabaseEvent as SupabaseEventWithDetails).speaker_lineup && { 
                speakerLineup: (supabaseEvent as SupabaseEventWithDetails).speaker_lineup as unknown as Speaker[] 
            })
        };
    },
    toSupabase: (appEvent: Partial<Event>): Partial<SupabaseEvent> => ({
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
// 3. UPDATE SIGNATURES: Using `EventType`.
export const eventTypeTransformer = {
    toApp: (supabaseEventType: SupabaseEventType): EventType => ({
        id: supabaseEventType.id,
        name: supabaseEventType.name || 'Unnamed Category',
        color: supabaseEventType.color || '#808080',
        description: supabaseEventType.description,
    }),
    toSupabase: (appEventType: Partial<EventType>): Partial<SupabaseEventType> => ({
        ...(appEventType.id && { id: appEventType.id }),
        ...(appEventType.name && { name: appEventType.name }),
        ...(appEventType.color && { color: appEventType.color }),
        ...(appEventType.description !== undefined && { description: appEventType.description }),
    })
};

// --- Profile Transformers ---
// (No changes here as Profile types were not in the new file, but signatures are ready for future migration)
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
// 4. UPDATE SIGNATURES: Using `TrackedEventRecord` and `Event`.
export const trackedEventTransformer = {
    toApp: (supabaseTrackedEvent: SupabaseTrackedEventWithDetails): TrackedEventRecord => {
        const joinedEventData = supabaseTrackedEvent.events;
        let appEvent: Event | null = null;
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
    toSupabase: (appTrackedEvent: Partial<TrackedEventRecord>): Partial<SupabaseTrackedEvent> => ({
        ...(appTrackedEvent.trackingId && { id: appTrackedEvent.trackingId }),
        ...(appTrackedEvent.userId && { user_id: appTrackedEvent.userId }),
        ...(appTrackedEvent.eventId && { event_id: appTrackedEvent.eventId }),
        ...(appTrackedEvent.status && { status: appTrackedEvent.status }),
        ...(appTrackedEvent.notes !== undefined && { notes: appTrackedEvent.notes }),
        ...(appTrackedEvent.trackedAt && { created_at: appTrackedEvent.trackedAt }),
    })
};

// --- Enrichment Utilities ---
// 5. UPDATE SIGNATURES: These now operate on the new base types.
export const enrichEvent = (
    event: Event,
    options: {
        eventType?: EventType;
        isTracked?: boolean;
    } = {}
): Event => ({
    ...event,
    ...(options.eventType && {
        color: options.eventType.color,
        category: options.eventType
    }),
    ...(options.isTracked !== undefined && { isTracked: options.isTracked })
});

export const enrichEventType = (
    eventType: EventType,
    count: number
): EventType => ({
    ...eventType,
    eventCount: count,
});

// --- Array Transformers ---
// 6. UPDATE SIGNATURES: All array transformers now return arrays of the new types.
export const transformEventsToApp = (supabaseEvents: SupabaseEvent[]): Event[] => {
    return supabaseEvents.map(eventTransformer.toApp);
};
export const transformEventTypesToApp = (supabaseEventTypes: SupabaseEventType[]): EventType[] => {
    return supabaseEventTypes.map(eventTypeTransformer.toApp);
};
export const transformSimpleTrackedEventsToApp = (
    supabaseTrackedEvents: SupabaseTrackedEvent[]
): TrackedEventRecord[] => {
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
): TrackedEventRecord[] => {
    return supabaseTrackedEvents.map(trackedEventTransformer.toApp);
};

// --- Validation Utilities ---
// 7. RENAME and UPDATE `isValidAppEvent` to `isValidEvent`
export const isValidEvent = (obj: unknown): obj is Event => {
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
// Helper for FullCalendar Events
// ==========================================================
// 8. UPDATE SIGNATURES: Use the base `Event` type.
export const toFullCalendarEvent = (event: Event) => {
    const eventColor = event.color || '#6B7280';
    const backgroundColor = transparentize(eventColor, 0.85);

    return {
        id: event.id,
        title: event.title,
        start: event.startTime,
        end: event.endTime || undefined,
        extendedProps: { ...event },
        backgroundColor: backgroundColor,
        borderColor: eventColor,
        textColor: 'var(--foreground-primary)',
    };
};

export const toFullCalendarEvents = (events: Event[]) => {
    return events.map(toFullCalendarEvent);
};

// --- Date Utilities for Events ---
// 9. UPDATE SIGNATURES: These now accept the base `Event` type.
export const isEventLive = (event: Event): boolean => {
    return isEventLiveUtil(event.startTime, event.endTime);
};

export const isEventUpcoming = (event: Event): boolean => {
    return isEventUpcomingUtil(event.startTime);
};

export const getEventTimeStatus = (event: Event): 'past' | 'live' | 'upcoming' | 'future' => {
    return getEventTimeStatusUtil(event.startTime, event.endTime);
};

// Database schema interface for daily_schedule JSON field
interface DbDailySchedule {
    type: 'daily_recurring' | 'all_day' | 'custom';
    daily_start?: string;
    daily_end?: string;
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

// --- Enhanced Event Transformer ---
export const enhancedEventTransformer = {
    toApp: (supabaseEvent: SupabaseEventWithDetails & {
        is_multi_day?: boolean | null;
        daily_schedule?: Json | null;
        event_pattern?: string | null;
    }): MultiDayEvent => {
        const baseEvent = eventTransformer.toApp(supabaseEvent);
        
        // Enrich with category information
        const eventType = supabaseEvent.event_type ? eventTypeTransformer.toApp(supabaseEvent.event_type) : undefined;
        const enrichedEvent = enrichEvent(baseEvent, { eventType });

        const isValidPattern = (pattern: unknown): pattern is 'single' | 'multi_day' | 'all_day' | 'recurring' => {
            if (typeof pattern !== 'string') return false;
            return ['single', 'multi_day', 'all_day', 'recurring'].includes(pattern);
        };

        const eventPattern = isValidPattern(supabaseEvent.event_pattern)
            ? supabaseEvent.event_pattern
            : 'single';

        let parsedSchedule: DailySchedule | undefined = undefined;

        // --- THIS IS THE TRANSFORMATION LOGIC ---
        // It safely checks and converts the snake_case JSON from the DB 
        // into a camelCase object for the application.
        if (supabaseEvent.daily_schedule && typeof supabaseEvent.daily_schedule === 'object' && !Array.isArray(supabaseEvent.daily_schedule)) {
            const dbSchedule = supabaseEvent.daily_schedule as unknown as DbDailySchedule;

            // This explicit mapping creates the camelCase object your app uses.
            parsedSchedule = {
                type: dbSchedule.type,
                dailyStart: dbSchedule.daily_start, // Convert snake_case to camelCase
                dailyEnd: dbSchedule.daily_end,     // Convert snake_case to camelCase
                timezone: dbSchedule.timezone,
                note: dbSchedule.note,
                schedule: dbSchedule.schedule,
                custom_schedule: dbSchedule.custom_schedule, // Include custom_schedule for multi-day events
            };
        }

        return {
            ...enrichedEvent,
            isMultiDay: supabaseEvent.is_multi_day || false,
            dailySchedule: parsedSchedule,
            eventPattern: eventPattern
        };
    }
};

// --- Agenda Transformers ---
export const agendaTransformer = {
    toApp: (dbAgendaItem: DatabaseAgendaItem): AgendaItem => {
        // Map database agenda_type to application type
        const mapAgendaType = (dbType: string): AgendaItem['type'] => {
            const typeMap: Record<string, AgendaItem['type']> = {
                'keynote': 'keynote',
                'session': 'session',
                'break': 'break',
                'networking': 'networking',
                'workshop': 'workshop',
                'panel': 'panel',
                'registration': 'registration',
                'certification': 'certification',
                'support': 'support',
                'exhibition': 'exhibition',
                'meal': 'meal',
                'entertainment': 'entertainment'
            };
            return typeMap[dbType] || 'other';
        };

        // Convert time strings to full datetime strings
        const convertTimeToDateTime = (timeString: string, eventDate: string): string => {
            // If timeString is already a full datetime, return as-is
            if (timeString.includes('T') || timeString.includes(' ')) {
                return timeString;
            }
            
            // Otherwise, combine with event date
            const eventDateObj = new Date(eventDate);
            const [hours, minutes, seconds] = timeString.split(':').map(Number);
            const dateTime = new Date(eventDateObj);
            dateTime.setHours(hours, minutes, seconds || 0);
            
            return dateTime.toISOString();
        };

        // For now, we'll use the current date as the event date
        // In a real implementation, you'd get this from the event data
        const eventDate = new Date().toISOString().split('T')[0];
        
        return {
            id: dbAgendaItem.id,
            title: dbAgendaItem.title,
            description: dbAgendaItem.description || undefined,
            startTime: convertTimeToDateTime(dbAgendaItem.start_time, eventDate),
            endTime: convertTimeToDateTime(dbAgendaItem.end_time, eventDate),
            location: dbAgendaItem.location || undefined,
            type: mapAgendaType(dbAgendaItem.agenda_type),
            // Additional fields from database
            dayNumber: dbAgendaItem.day_number,
            durationMinutes: dbAgendaItem.duration_minutes,
            track: dbAgendaItem.track || undefined,
            difficultyLevel: dbAgendaItem.difficulty_level,
            prerequisites: dbAgendaItem.prerequisites,
            capacity: dbAgendaItem.capacity,
            isRequired: dbAgendaItem.is_required,
            sortOrder: dbAgendaItem.sort_order
        };
    },
    
    toSupabase: (appAgendaItem: Partial<AgendaItem>): Partial<DatabaseAgendaItem> => ({
        ...(appAgendaItem.id && { id: appAgendaItem.id }),
        ...(appAgendaItem.title && { title: appAgendaItem.title }),
        ...(appAgendaItem.description && { description: appAgendaItem.description }),
        ...(appAgendaItem.startTime && { start_time: appAgendaItem.startTime }),
        ...(appAgendaItem.endTime && { end_time: appAgendaItem.endTime }),
        ...(appAgendaItem.location && { location: appAgendaItem.location }),
        ...(appAgendaItem.type && { agenda_type: appAgendaItem.type }),
        ...(appAgendaItem.dayNumber && { day_number: appAgendaItem.dayNumber }),
        ...(appAgendaItem.durationMinutes && { duration_minutes: appAgendaItem.durationMinutes }),
        ...(appAgendaItem.track && { track: appAgendaItem.track }),
        ...(appAgendaItem.difficultyLevel && { difficulty_level: appAgendaItem.difficultyLevel }),
        ...(appAgendaItem.prerequisites && { prerequisites: appAgendaItem.prerequisites }),
        ...(appAgendaItem.capacity && { capacity: appAgendaItem.capacity }),
        ...(appAgendaItem.isRequired !== undefined && { is_required: appAgendaItem.isRequired }),
        ...(appAgendaItem.sortOrder && { sort_order: appAgendaItem.sortOrder })
    })
};

// Transform array of database agenda items to app format
export const transformAgendaItemsToApp = (dbAgendaItems: DatabaseAgendaItem[]): AgendaItem[] => {
    return dbAgendaItems.map(agendaTransformer.toApp);
};