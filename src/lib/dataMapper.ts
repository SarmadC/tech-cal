// src/lib/dataMapper.ts (Complete and Corrected)

import {
    SupabaseEvent,
    AppEvent,
    SupabaseEventType,
    AppEventType,
    SupabaseProfile,
    AppProfile,
    SupabaseTrackedEventWithDetails,
    AppTrackedEvent
} from '@/types';

export function mapSupabaseEventToAppEvent(event: SupabaseEvent): AppEvent {
    return {
        id: event.id,
        createdAt: event.created_at,
        title: event.title,
        description: event.description,
        startTime: event.start_time,
        endTime: event.end_time,
        organizer: event.organizer,
        location: event.location,
        status: event.status,
        sourceUrl: event.source_url,
        livestreamUrl: event.livestream_url,
        eventTypeId: event.event_type_id,
    };
}

export function mapSupabaseEventTypeToAppEventType(eventType: SupabaseEventType): AppEventType {
    return {
        id: eventType.id,
        name: eventType.name,
        color: eventType.color,
        description: eventType.description,
    };
}

/**
 * Maps a profile object from Supabase (snake_case) to the application's
 * desired format (camelCase).
 * @param profile - The SupabaseProfile object directly from the database.
 * @returns An AppProfile object ready for use in the UI.
 */
export function mapSupabaseProfileToAppProfile(profile: SupabaseProfile): AppProfile {
    return {
        id: profile.id,
        fullName: profile.full_name,       // snake_case -> camelCase
        avatarUrl: profile.avatar_url,     // snake_case -> camelCase
        timezone: profile.timezone,
        preferences: profile.preferences,
        createdAt: profile.created_at,     // snake_case -> camelCase
        updatedAt: profile.updated_at,     // snake_case -> camelCase
    };
}

/**
 * Maps a complex, nested tracked event object from Supabase to the clean
 * application-level AppTrackedEvent type.
 * @param trackedEvent The nested object from Supabase.
 * @returns An AppTrackedEvent object.
 */
export function mapSupabaseTrackedEventToAppTrackedEvent(
    trackedEvent: SupabaseTrackedEventWithDetails
): AppTrackedEvent {

    const supabaseEvent = trackedEvent.events;
    let appEvent: AppEvent | null = null;

    // Check if the nested event data exists
    if (supabaseEvent) {
        // 1. Convert the base event
        const baseAppEvent = mapSupabaseEventToAppEvent(supabaseEvent);

        // 2. Convert the nested event type
        const eventType = supabaseEvent.event_type
            ? mapSupabaseEventTypeToAppEventType(supabaseEvent.event_type)
            : undefined;

        // 3. Enrich the AppEvent with its category and color
        appEvent = {
            ...baseAppEvent,
            category: eventType,
            color: eventType?.color || '#737373', // Default color if none exists
        };
    }

    // 4. Assemble the final AppTrackedEvent object
    return {
        trackingId: trackedEvent.id,
        userId: trackedEvent.user_id,
        eventId: trackedEvent.event_id,
        status: trackedEvent.status,
        notes: trackedEvent.notes,
        trackedAt: trackedEvent.created_at,
        event: appEvent, // The fully processed nested event
    };
}





