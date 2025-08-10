import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type { AppEventType } from '@/types'; // Note: ApiResponse is no longer needed here
import { eventTypeTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

type SupabaseClientType = SupabaseClient<Database>;

export class EventTypeService {
    /**
     * Get all event types, sorted by name.
     * Throws an error on failure.
     */
    static async getEventTypes(
        supabaseClient: SupabaseClientType
    ): Promise<AppEventType[]> { // Return type is now Promise<AppEventType[]>
        try {
            const { data, error } = await supabaseClient
                .from('event_type')
                .select('*')
                .order('name');

            if (error) throw error; // Throw if Supabase returns an error

            // Directly return the transformed data on success
            return (data || []).map(eventTypeTransformer.toApp);
        } catch (error) {
            console.error('Error fetching event types:', error);
            Sentry.captureException(error, { extra: { function: 'getEventTypes' } });
            // Re-throw a generic error to the caller
            throw new Error('Failed to fetch event categories.');
        }
    }

    /**
     * Get event types along with a count of events for each type.
     * Throws an error on failure.
     */
    static async getEventTypesWithCounts(
        supabaseClient: SupabaseClientType
    ): Promise<AppEventType[]> { // Return type is now Promise<AppEventType[]>
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
    static async getEventTypeById(
        id: string,
        supabaseClient: SupabaseClientType
    ): Promise<AppEventType> { // Return type is now Promise<AppEventType>
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