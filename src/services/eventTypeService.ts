import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
// 1. UPDATE IMPORT: Use the new, canonical `EventType`.
import type { EventType } from '@/types';
import { eventTypeTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

type SupabaseClientType = SupabaseClient<Database>;

export class EventTypeService {
    /**
     * Get all event types, sorted by name.
     * Throws an error on failure.
     */
    // 2. UPDATE SIGNATURE: The function now returns a promise of `EventType[]`.
    static async getEventTypes(
        supabaseClient: SupabaseClientType
    ): Promise<EventType[]> {
        try {
            const { data, error } = await supabaseClient
                .from('event_type')
                .select('*')
                .order('name');

            if (error) throw error;

            // This works because eventTypeTransformer was already migrated to return `EventType`.
            return (data || []).map(eventTypeTransformer.toApp);
        } catch (error) {
            console.error('Error fetching event types:', error);
            Sentry.captureException(error, { extra: { function: 'getEventTypes' } });
            throw new Error('Failed to fetch event categories.');
        }
    }

    /**
     * Get event types along with a count of events for each type.
     * Throws an error on failure.
     */
    // 3. UPDATE SIGNATURE: The function now returns a promise of `EventType[]`.
    static async getEventTypesWithCounts(
        supabaseClient: SupabaseClientType
    ): Promise<EventType[]> {
        try {
            const { data, error } = await supabaseClient.rpc('get_event_types_with_counts');
            if (error) throw error;

            return (data || []).map((type) => {
                const baseType = eventTypeTransformer.toApp(type);
                return {
                    ...baseType,
                    eventCount: type.event_count || 0,
                };
            });
        } catch (error) {
            console.error('Error fetching event types with counts:', error);
            Sentry.captureException(error, { extra: { function: 'getEventTypesWithCounts' } });
            throw new Error('Failed to fetch event categories with counts.');
        }
    }

    /**
     * Get a single event type by its unique ID.
     * Throws an error on failure.
     */
    // 4. UPDATE SIGNATURE: The function now returns a promise of `EventType`.
    static async getEventTypeById(
        id: string,
        supabaseClient: SupabaseClientType
    ): Promise<EventType> {
        try {
            const { data, error } = await supabaseClient
                .from('event_type')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event type not found');

            return eventTypeTransformer.toApp(data);
        } catch (error) {
            console.error('Error fetching event type:', error);
            Sentry.captureException(error, { extra: { function: 'getEventTypeById', id } });
            throw new Error('Failed to fetch the specified event category.');
        }
    }
}