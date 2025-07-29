import { supabase } from '@/lib/supabaseClient';
import type {
    AppEvent,
    EventFilters,
    ApiResponse,
    SearchSuggestion,
    SupabaseEventWithEventType,
    // Note: Types for EventType and TrackedEvent are no longer needed here
} from '@/types';

// Import ONLY the transformers needed for the EventService
import {
    eventTransformer,
    eventTypeTransformer, // Needed to process nested event_type data
    enrichEvent,
} from '@/utils/transformers';


export class EventService {
    /**
     * Fetch events with optional filtering and enrichment
     */
    static async getEvents(filters?: EventFilters): Promise<ApiResponse<AppEvent[]>> {
        try {
            let query = supabase
                .from('events')
                .select(`*, event_type:event_type_id (*)`)
                .order('start_time', { ascending: true });

            // (Your filtering logic is correct)
            if (filters?.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters?.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters?.endDate) query = query.lte('start_time', filters.endDate.toISOString());
            if (filters?.searchTerm) query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,organizer.ilike.%${filters.searchTerm}%`);
            if (filters?.status?.length) query = query.in('status', filters.status);


            const { data, error } = await query;
            if (error) throw error;

            // This is now clean: it uses the imported transformers and enricher directly.
            const events: AppEvent[] = (data as SupabaseEventWithEventType[] || []).map((item) => {
                const baseEvent = eventTransformer.toApp(item);
                const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });

            return { success: true, data: events };
        } catch (error) {
            console.error('Error fetching events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch events' };
        }
    }

    /**
     * Get a single event by ID with full enrichment
     */
    static async getEventById(id: string): Promise<ApiResponse<AppEvent>> {
        try {
            const { data, error } = await supabase
                .from('events')
                .select(`*, event_type:event_type_id (*)`)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event not found');

            const item = data as SupabaseEventWithEventType;
            const baseEvent = eventTransformer.toApp(item);
            const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
            const enrichedEvent = enrichEvent(baseEvent, { eventType });

            return { success: true, data: enrichedEvent };
        } catch (error) {
            console.error('Error fetching event:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch event' };
        }
    }

    /**
     * Search events with smart suggestions
     */
    static async searchEvents(term: string, limit = 10): Promise<ApiResponse<SearchSuggestion[]>> {
        try {
            const { data, error } = await supabase
                .from('events')
                .select(`id, title, organizer, start_time`)
                .or(`title.ilike.%${term}%,organizer.ilike.%${term}%`)
                .order('start_time', { ascending: true })
                .limit(limit);

            if (error) throw error;

            // Note: This transformation is simple and specific to search, so it's fine to keep it here.
            const suggestions: SearchSuggestion[] = (data || []).map(item => ({
                id: item.id,
                title: item.title || 'Untitled Event',
                organizer: item.organizer || 'Unknown Organizer',
                startTime: item.start_time,
                type: 'event' as const
            }));

            return { success: true, data: suggestions };
        } catch (error) {
            console.error('Error searching events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Search failed' };
        }
    }

    /**
     * Get events by date range (optimized for calendar views)
     */
    static async getEventsByDateRange(
        startDate: Date,
        endDate: Date,
        categoryIds?: string[],
        limit?: number // FIX: Accept the limit parameter
    ): Promise<ApiResponse<AppEvent[]>> {
        try {
            let query = supabase
                .from('events')
                .select(`*, event_type:event_type_id (id, name, color)`)
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString())
                .order('start_time', { ascending: true });

            if (categoryIds?.length) {
                query = query.in('event_type_id', categoryIds);
            }

            // FIX: Apply the limit if it's provided
            if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query;
            if (error) throw error;

            // FIX: Use the specific type instead of 'any'
            const events: AppEvent[] = (data as SupabaseEventWithEventType[] || []).map((item) => {
                const baseEvent = eventTransformer.toApp(item);
                const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });

            return { success: true, data: events };
        } catch (error) {
            console.error('Error fetching events by date range:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch events' };
        }
    }

    /**
     * Get upcoming events (next 30 days)
     */
    static async getUpcomingEvents(limit = 50): Promise<ApiResponse<AppEvent[]>> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);

        // FIX: Pass the limit along
        return this.getEventsByDateRange(now, futureDate, undefined, limit);
    }

    /**
     * Get live events (happening now)
     */
    static async getLiveEvents(): Promise<ApiResponse<AppEvent[]>> {
        try {
            const now = new Date().toISOString();

            const { data, error } = await supabase
                .from('events')
                .select(`*, event_type:event_type_id (id, name, color)`)
                .lte('start_time', now)
                .or(`end_time.gte.${now},end_time.is.null`)
                .order('start_time', { ascending: true });

            if (error) throw error;

            // FIX: Use the specific type instead of 'any'
            const events: AppEvent[] = (data as SupabaseEventWithEventType[] || []).map((item) => {
                const baseEvent = eventTransformer.toApp(item);
                const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });

            return { success: true, data: events };
        } catch (error) {
            console.error('Error fetching live events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch live events' };
        }
    }
}