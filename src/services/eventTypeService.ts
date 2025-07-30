// src/services/eventTypeService.ts

// 👇 1. Import the browser client and the client type
import { supabase as browserSupabaseClient, SupabaseClientType } from '@/lib/supabaseClient';
import type { ApiResponse, AppEventType } from '@/types';
import { eventTypeTransformer } from '@/utils/transformers';

export class EventTypeService {
    /**
     * Get all event types, sorted by name.
     */
    static async getEventTypes(
        // 👇 2. Add the optional supabaseClient parameter
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEventType[]>> {
        try {
            // 👇 3. Use the provided client
            const { data, error } = await supabaseClient
                .from('event_type')
                .select('*')
                .order('name');

            if (error) throw error;

            const eventTypes = (data || []).map(eventTypeTransformer.toApp);
            return { success: true, data: eventTypes };
        } catch (error) {
            console.error('Error fetching event types:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch event types'
            };
        }
    }

    /**
     * Get event types along with a count of events for each type,
     * using a high-performance RPC call.
     */
    static async getEventTypesWithCounts(
        // 👇 2. Add the optional supabaseClient parameter
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEventType[]>> {
        try {
            // 👇 3. Use the provided client
            const { data, error } = await supabaseClient.rpc('get_event_types_with_counts');
            if (error) throw error;

            // Define the expected shape of the data returned by the RPC function for type safety.
            const eventTypes: AppEventType[] = (data || []).map((type) => {
                // We can use the generated types from `supabase.ts` for even better safety
                const baseType = eventTypeTransformer.toApp(type);
                return {
                    ...baseType,
                    // The return type of the RPC function in supabase.ts already defines this as number
                    eventCount: type.event_count || 0,
                };
            });

            return { success: true, data: eventTypes };
        } catch (error) {
            console.error('Error fetching event types with counts:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch event types'
            };
        }
    }

    /**
     * Get a single event type by its unique ID.
     */
    static async getEventTypeById(
        id: string,
        // 👇 2. Add the optional supabaseClient parameter
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEventType>> {
        try {
            // 👇 3. Use the provided client
            const { data, error } = await supabaseClient
                .from('event_type')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event type not found');

            const eventType = eventTypeTransformer.toApp(data);
            return { success: true, data: eventType };
        } catch (error) {
            console.error('Error fetching event type:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch event type'
            };
        }
    }
}