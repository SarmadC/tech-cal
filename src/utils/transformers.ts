// src/utils/transformers.ts

// 1. UPDATE IMPORTS: Use the new, specific type names. The deprecated aliases are no longer needed here.
import { getLogoUrlFromInput } from './logoUtils';
import type {
    SupabaseEvent,
    SupabaseEventType,
    SupabaseTrackedEvent,
    SupabaseProfile,
    Event, // Replaces AppEvent
    EventType, // Replaces AppEventType
    AgendaItem,
    EventTag, // For event tags
    TrackedEventRecord, // Replaces AppTrackedEvent
    AppProfile, // Assuming this will become `Profile` later, but keeping as-is for now
    MultiDayEvent, // Replaces EnhancedAppEvent
    SupabaseEventWithDetails,
    SupabaseTrackedEventWithDetails,
    ProfileTransformer,
    DailySchedule,
    Json,
    EventStatus
} from '@/types';
import { transparentize } from 'color2k';
import {
    isEventLive as isEventLiveUtil,
    isEventUpcoming as isEventUpcomingUtil,
    getEventTimeStatus as getEventTimeStatusUtil
} from '@/utils/dateUtils';

// ==========================================================
// Tag Transformation Utilities
// ==========================================================

/**
 * Centralized tag extraction from nested event_tag_relations structure
 * Handles various input formats from different query patterns
 */
export const extractEventTags = (
    rawData: unknown
): EventTag[] => {
    const eventTags: EventTag[] = [];
    
    // Handle nested event_tag_relations structure (from Supabase joins)
    const dataWithRelations = rawData as {
        event_tag_relations?: Array<{
            event_tags?: {
                id: string;
                event_tag: string;
                color: string | null;
                category: string | null;
            } | null;
        }>;
    };
    
    if (dataWithRelations.event_tag_relations && Array.isArray(dataWithRelations.event_tag_relations)) {
        dataWithRelations.event_tag_relations.forEach(relation => {
            if (relation.event_tags) {
                eventTags.push({
                    id: relation.event_tags.id,
                    name: relation.event_tags.event_tag,
                    color: '#3B82F6', // Default color since color column was removed from event_tags
                    category: relation.event_tags.category || 'general'
                });
            }
        });
    }
    
    // Handle pre-aggregated tags array (from materialized views)
    const dataWithTags = rawData as { tags?: Array<string | EventTag> };
    if (dataWithTags.tags && Array.isArray(dataWithTags.tags)) {
        dataWithTags.tags.forEach(tag => {
            if (typeof tag === 'string') {
                eventTags.push({
                    id: tag,
                    name: tag,
                    color: '#3B82F6',
                    category: 'general'
                });
            } else if (tag && typeof tag === 'object' && 'name' in tag) {
                eventTags.push(tag as EventTag);
            }
        });
    }
    
    return eventTags;
};

// ==========================================================
// Event Transformers
// ==========================================================

// 2. UPDATE SIGNATURES: The transformer now correctly returns the base `Event` type.
// Helper function to convert logo URL to appropriate format
// Uses centralized logo utility with multiple fallback sources
const getLogoUrl = (logoUrl: string | null | undefined, organizerName?: string, supabaseUrl?: string): string | undefined => {
    return getLogoUrlFromInput(logoUrl, organizerName, supabaseUrl);
};

// Transformer for events_detailed view (flat structure with pre-joined data)
export const eventDetailedTransformer = {
    toApp: (viewRow: Record<string, unknown>): Event => {
        const organizerLogo = getLogoUrl(viewRow.organizer_logo_url as string | null, viewRow.organizer_name as string);
        
        // Use centralized tag extraction utility
        const tags = extractEventTags(viewRow);

        return {
            id: String(viewRow.id),
            createdAt: String(viewRow.created_at),
            updatedAt: viewRow.updated_at as string | null,
            title: String(viewRow.title || 'Untitled Event'),
            description: String(viewRow.description || ''),
            startTime: String(viewRow.start_time),
            endTime: viewRow.end_time as string | null,
            timezone: viewRow.timezone as string | null,
            organizer: String(viewRow.organizer_name || 'Unknown Organizer'),
            location: String(viewRow.location || 'Online'),
            status: String(viewRow.status || 'confirmed'),
            sourceUrl: String(viewRow.source_url || '#'),
            livestreamUrl: viewRow.livestream_url as string | null,
            registrationUrl: viewRow.registration_url as string | null,
            eventTypeId: String(viewRow.event_type_id || ''),
            eventImageUrl: viewRow.event_image_url as string | null,
            priceRange: viewRow.price_range as string | null,
            priceMin: (viewRow.price_min as number | null | undefined) ?? null,
            capacity: viewRow.capacity as number | null,
            attendeeCount: viewRow.attendee_count as number | null,
            difficulty: viewRow.difficulty_level as 'beginner' | 'intermediate' | 'advanced' | null,
            eventFormat: (viewRow.event_format as 'Online' | 'In-person' | 'Hybrid' | null | undefined) ?? null,
            targetAudience: viewRow.target_audience as string | null,
            prerequisites: viewRow.prerequisites as string | null,
            agendaUrl: viewRow.agenda_url as string | null,
            speakerLineup: viewRow.speaker_lineup as Event['speakerLineup'],
            ...(tags.length > 0 && { tags }),
            category: {
                id: String(viewRow.event_type_id || ''),
                name: String(viewRow.event_type_name || 'Other'),
                color: String(viewRow.event_type_color || '#808080'),
                description: null
            },
            organization: {
                id: String(viewRow.organizer_id || ''),
                name: String(viewRow.organizer_name || 'Unknown'),
                ...(organizerLogo && { logo: organizerLogo })
            }
        };
    }
};

export const eventTransformer = {
    toApp: (supabaseEvent: SupabaseEvent | SupabaseEventWithDetails): Event => {
        // Check both 'organizer' (singular, from named joins) and 'organizers' (plural, from FK joins)
        const eventWithDetails = supabaseEvent as SupabaseEventWithDetails;
        const organizerData = eventWithDetails.organizer || eventWithDetails.organizers;
        const organizerName = organizerData?.name || 'Unknown Organizer';
        const rawLogoUrl = organizerData?.logo_url ?? undefined;
        const organizerLogo = getLogoUrl(rawLogoUrl, organizerName);
        
        // Transform event tags from database format to app format
        // Use extractEventTags utility to properly extract tags from event_tag_relations structure
        const eventTags: EventTag[] = extractEventTags(supabaseEvent);

        // Extract event_type data if present (from joins)
        const eventType = (supabaseEvent as SupabaseEventWithDetails).event_type;

        const result = {
            id: supabaseEvent.id,
            createdAt: supabaseEvent.created_at,
            updatedAt: supabaseEvent.updated_at ?? null,
            title: supabaseEvent.title || 'Untitled Event',
            description: supabaseEvent.description || '',
            startTime: supabaseEvent.start_time || new Date().toISOString(),
            endTime: supabaseEvent.end_time,
            timezone: supabaseEvent.timezone ?? null,
            organizer: organizerName,
            location: supabaseEvent.location || 'Online',
            status: supabaseEvent.status || 'confirmed',
            sourceUrl: supabaseEvent.source_url || '#',
            livestreamUrl: supabaseEvent.livestream_url,
            eventImageUrl: supabaseEvent.event_image_url ?? undefined,
            eventTypeId: supabaseEvent.event_type_id || '',
            agendaUrl: (supabaseEvent as Record<string, unknown>).agenda_url as string | null,
            ...(eventTags.length > 0 && { tags: eventTags }),
            ...(eventType && eventType.name && {
                category: {
                    id: eventType.id,
                    name: eventType.name,
                    color: eventType.color || '#808080',
                    description: eventType.description || null
                }
            }),
            organization: {
                id: (supabaseEvent as SupabaseEventWithDetails).organizer?.id || '',
                name: organizerName,
                ...(organizerLogo && { logo: organizerLogo })
            }
        };

        return result;
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
        ...(appEvent.eventImageUrl !== undefined && { event_image_url: appEvent.eventImageUrl }),
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
        // Supabase returns null when description is absent; keep null to satisfy EventType
        description: supabaseEventType.description ?? null,
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
        ...(Object.prototype.hasOwnProperty.call(appProfile, 'id') && { id: appProfile.id }),
        ...(Object.prototype.hasOwnProperty.call(appProfile, 'fullName') && { full_name: appProfile.fullName }),
        ...(Object.prototype.hasOwnProperty.call(appProfile, 'avatarUrl') && { avatar_url: appProfile.avatarUrl }),
        ...(Object.prototype.hasOwnProperty.call(appProfile, 'timezone') && { timezone: appProfile.timezone }),
        ...(Object.prototype.hasOwnProperty.call(appProfile, 'preferences') && { preferences: appProfile.preferences }),
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
            
            // Use centralized tag extraction utility
            const eventTags = extractEventTags(joinedEventData);
            
            appEvent = enrichEvent(baseAppEvent, { 
                eventType: appEventType,
                tags: eventTags.length > 0 ? eventTags : undefined
            });
        }
        return {
            trackingId: supabaseTrackedEvent.id,
            userId: supabaseTrackedEvent.user_id,
            eventId: supabaseTrackedEvent.event_id,
            status: supabaseTrackedEvent.status as EventStatus | null,
            notes: supabaseTrackedEvent.notes,
            trackedAt: supabaseTrackedEvent.created_at || new Date().toISOString(),
            isBookmarked: supabaseTrackedEvent.is_bookmarked ?? false,
            bookmarkedAt: supabaseTrackedEvent.bookmarked_at || null,
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
        tags?: EventTag[];
    } = {}
): Event => ({
    ...event,
    ...(options.eventType && {
        color: options.eventType.color,
        category: options.eventType
    }),
    ...(options.isTracked !== undefined && { isTracked: options.isTracked }),
    ...(options.tags && { tags: options.tags })
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
        isBookmarked: trackedEvent.is_bookmarked ?? false,
        bookmarkedAt: trackedEvent.bookmarked_at || null,
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
        if (supabaseEvent.daily_schedule) {
            let dbSchedule: DbDailySchedule;
            
            // Handle both JSON string and parsed object cases
            if (typeof supabaseEvent.daily_schedule === 'string') {
                try {
                    dbSchedule = JSON.parse(supabaseEvent.daily_schedule) as DbDailySchedule;
                } catch (error) {
                    console.warn('Failed to parse daily_schedule JSON string:', error);
                    return { ...enrichedEvent, isMultiDay: false, dailySchedule: undefined, eventPattern: 'single' };
                }
            } else if (typeof supabaseEvent.daily_schedule === 'object' && !Array.isArray(supabaseEvent.daily_schedule)) {
                dbSchedule = supabaseEvent.daily_schedule as unknown as DbDailySchedule;
            } else {
                console.warn('Invalid daily_schedule format:', supabaseEvent.daily_schedule);
                return { ...enrichedEvent, isMultiDay: false, dailySchedule: undefined, eventPattern: 'single' };
            }

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

// Transform agenda items from database format to app format
export const transformAgendaItemsToApp = (dbAgendaItems: unknown[]): AgendaItem[] => {
    return dbAgendaItems.map(item => {
        const dbItem = item as Record<string, unknown>;
        return {
            id: String(dbItem.id || ''),
            title: String(dbItem.title || ''),
            description: dbItem.description ? String(dbItem.description) : undefined,
            startTime: String(dbItem.start_time || ''),
            endTime: String(dbItem.end_time || ''),
            speaker: dbItem.speaker_id ? { id: String(dbItem.speaker_id), name: '', bio: '', avatar: '' } : undefined,
            location: dbItem.location ? String(dbItem.location) : undefined,
            type: (dbItem.agenda_type as AgendaItem['type']) || 'other',
            tags: dbItem.track ? [String(dbItem.track)] : undefined,
            dayNumber: typeof dbItem.day_number === 'number' ? dbItem.day_number : undefined,
            durationMinutes: typeof dbItem.duration_minutes === 'number' ? dbItem.duration_minutes : undefined,
            track: dbItem.track ? String(dbItem.track) : undefined,
            topics: Array.isArray(dbItem.topics)
                ? dbItem.topics.filter((topic): topic is string => typeof topic === 'string' && topic.trim().length > 0)
                : undefined,
            difficultyLevel: dbItem.difficulty_level ? String(dbItem.difficulty_level) : undefined,
            prerequisites: dbItem.prerequisites ? String(dbItem.prerequisites) : undefined,
            capacity: typeof dbItem.capacity === 'number' ? dbItem.capacity : undefined,
            isRequired: Boolean(dbItem.is_required),
            sortOrder: typeof dbItem.sort_order === 'number' ? dbItem.sort_order : undefined,
        };
    });
};
