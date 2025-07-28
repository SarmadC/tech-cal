// src/lib/data-mappers.ts

import { SupabaseEvent, AppEvent, SupabaseEventType, AppEventType } from '@/types';

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