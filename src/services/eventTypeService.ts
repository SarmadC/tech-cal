// src/services/eventTypeService.ts

import { supabase } from '@/lib/supabaseClient';
import type { ApiResponse, AppEventType } from '@/types';

// Import the transformer that converts Supabase event_type data to our app's format.
import { eventTypeTransformer } from '@/utils/transformers';

export class EventTypeService {
    /**
     * Get all event types, sorted by name.
     */
    static async getEventTypes(): Promise<ApiResponse<AppEventType[]>> {
        try {
            const { data, error } = await supabase
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
    static async getEventTypesWithCounts(): Promise<ApiResponse<AppEventType[]>> {
        try {
            // This calls the 'get_event_types_with_counts' function you created in your Supabase SQL editor.
            const { data, error } = await supabase.rpc('get_event_types_with_counts');
            if (error) throw error;

            // Define the expected shape of the data returned by the RPC function for type safety.
            const eventTypes: AppEventType[] = (data || []).map((type: {
                id: string;
                name: string;
                color: string;
                description: string | null;
                event_count: bigint; // Supabase returns count() as bigint
            }) => {
                const baseType = eventTypeTransformer.toApp(type);
                return {
                    ...baseType,
                    eventCount: Number(type.event_count) || 0, // Safely convert bigint to number
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
    static async getEventTypeById(id: string): Promise<ApiResponse<AppEventType>> {
        try {
            const { data, error } = await supabase
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