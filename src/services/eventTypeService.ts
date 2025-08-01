// src/services/eventTypeService.ts

import { supabase as browserSupabaseClient, SupabaseClientType } from '@/lib/supabaseClient';
import type { ApiResponse, AppEventType } from '@/types';
import { eventTypeTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs"; // ADDED: Import Sentry

export class EventTypeService {
    /**
     * Get all event types, sorted by name.
     */
    static async getEventTypes(
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEventType[]>> {
        try {
            const { data, error } = await supabaseClient
                .from('event_type')
                .select('*')
                .order('name');

            if (error) throw error;

            const eventTypes = (data || []).map(eventTypeTransformer.toApp);
            return { success: true, data: eventTypes };
        } catch (error) {
            console.error('Error fetching event types:', error);
            Sentry.captureException(error, { extra: { function: 'getEventTypes' } });
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
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEventType[]>> {
        try {
            const { data, error } = await supabaseClient.rpc('get_event_types_with_counts');
            if (error) throw error;

            const eventTypes: AppEventType[] = (data || []).map((type) => {
                const baseType = eventTypeTransformer.toApp(type);
                return {
                    ...baseType,
                    eventCount: type.event_count || 0,
                };
            });

            return { success: true, data: eventTypes };
        } catch (error) {
            console.error('Error fetching event types with counts:', error);
            Sentry.captureException(error, { extra: { function: 'getEventTypesWithCounts' } });
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
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEventType>> {
        try {
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
            Sentry.captureException(error, { extra: { function: 'getEventTypeById', id } });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch event type'
            };
        }
    }
}