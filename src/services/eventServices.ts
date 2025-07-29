
import { supabase } from '@/lib/supabaseClient';
import type {
    AppEvent,
    EventFilters,
    ApiResponse,
    SearchSuggestion,
    AppEventType,
    SupabaseEventWithEventType,
    EventStatus,
    AppTrackedEvent,
    SupabaseTrackedEventWithDetails,
} from '@/types';

import {
    eventTransformer,
    eventTypeTransformer,
    trackedEventTransformer,
    enrichEvent,
    enrichEventType,
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

            if (filters?.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters?.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters?.endDate) query = query.lte('start_time', filters.endDate.toISOString());
            if (filters?.searchTerm) query = query.or(`title.ilike.%${filters.searchTerm}%,description.ilike.%${filters.searchTerm}%,organizer.ilike.%${filters.searchTerm}%`);
            if (filters?.status?.length) query = query.in('status', filters.status);

            const { data, error } = await query;
            if (error) throw error;

            // Use the imported transformers and enricher
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
                .select(`*, event_type:event_type_id (id, name, color, description)`)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event not found');

            // The data here already includes the joined event_type
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
                .select(`
          id,
          title,
          organizer,
          start_time,
          event_type:event_type_id (
            name,
            color
          )
        `)
                .or(`title.ilike.%${term}%,organizer.ilike.%${term}%`)
                .order('start_time', { ascending: true })
                .limit(limit);

            if (error) throw error;

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
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Search failed'
            };
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


export class EventTypeService {
    /**
     * Get all event types
     */
    static async getEventTypes(): Promise<ApiResponse<AppEventType[]>> {
        try {
            const { data, error } = await supabase.from('event_type').select('*').order('name');
            if (error) throw error;
            // Use the imported transformer
            const eventTypes = (data || []).map(eventTypeTransformer.toApp);
            return { success: true, data: eventTypes };
        } catch (error) {
            console.error('Error fetching event types:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch event types' };
        }
    }

    /**
     * Get event types with event counts using a high-performance RPC call
     */
    static async getEventTypesWithCounts(): Promise<ApiResponse<AppEventType[]>> {
        try {
            const { data, error } = await supabase.rpc('get_event_types_with_counts');
            if (error) throw error;

            const eventTypes: AppEventType[] = (data || []).map((type: {
                id: string;
                name: string;
                color: string;
                description: string | null;
                event_count: bigint; // Supabase returns count() as bigint
            }) => {
                const baseType = eventTypeTransformer.toApp(type);
                // Now this call is valid because we imported the function
                return enrichEventType(baseType, Number(type.event_count) || 0);
            });

            return { success: true, data: eventTypes };
        } catch (error) {
            console.error('Error fetching event types with counts:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch event types' };
        }
    }


    /**
     * Get a single event type by ID
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

export class UserEventService {
    /**
     * Track an event for a user
     */
    static async trackEvent(
        userId: string,
        eventId: string,
        status: EventStatus = 'bookmarked',
        notes?: string
    ): Promise<ApiResponse<void>> {
        try {
            // Check if already tracked
            const { data: existing } = await supabase
                .from('user_events')
                .select('id, status')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            if (existing) {
                // Update existing
                const { error } = await supabase
                    .from('user_events')
                    .update({
                        status,
                        notes,
                        created_at: new Date().toISOString() // Update timestamp
                    })
                    .eq('id', existing.id);

                if (error) throw error;

                return {
                    success: true,
                    message: `Event status updated to ${status}`
                };
            } else {
                // Create new
                const { error } = await supabase
                    .from('user_events')
                    .insert({
                        user_id: userId,
                        event_id: eventId,
                        status,
                        notes,
                        created_at: new Date().toISOString()
                    });

                if (error) throw error;

                return {
                    success: true,
                    message: 'Event tracked successfully!'
                };
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to track event'
            };
        }
    }

    /**
     * Untrack an event
     */
    static async untrackEvent(userId: string, eventId: string): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabase
                .from('user_events')
                .delete()
                .eq('user_id', userId)
                .eq('event_id', eventId);

            if (error) throw error;

            return { success: true, message: 'Event untracked successfully!' };
        } catch (error) {
            console.error('Error untracking event:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to untrack event'
            };
        }
    }

    /**
     * Get user's tracked events with full event data
     */
    static async getTrackedEvents(userId: string): Promise<ApiResponse<AppTrackedEvent[]>> {
        try {
            const { data, error } = await supabase
                .from('user_events')
                .select(`*, events (*, event_type:event_type_id (*))`)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Use the imported transformer. This is now clean and correct.
            const trackedEvents = (data as SupabaseTrackedEventWithDetails[] || []).map(trackedEventTransformer.toApp);
            return { success: true, data: trackedEvents };
        } catch (error) {
            console.error('Error fetching tracked events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tracked events' };
        }
    }


    /**
     * Check if event is tracked by user
     */
    static async isEventTracked(
        userId: string,
        eventId: string
    ): Promise<ApiResponse<{ isTracked: boolean; status?: EventStatus }>> {
        try {
            const { data, error } = await supabase
                .from('user_events')
                .select('status')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return {
                success: true,
                data: {
                    isTracked: !!data,
                    status: data?.status as EventStatus
                }
            };
        } catch (error) {
            console.error('Error checking event tracking status:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to check tracking status'
            };
        }
    }

    /**
     * Bulk track multiple events
     */
    static async bulkTrackEvents(
        userId: string,
        eventIds: string[],
        status: EventStatus = 'bookmarked'
    ): Promise<ApiResponse<{ tracked: number; skipped: number }>> {
        try {
            // Check which events are already tracked
            const { data: existing } = await supabase
                .from('user_events')
                .select('event_id')
                .eq('user_id', userId)
                .in('event_id', eventIds);

            const existingEventIds = new Set(existing?.map(e => e.event_id) || []);
            const newEventIds = eventIds.filter(id => !existingEventIds.has(id));

            if (newEventIds.length === 0) {
                return {
                    success: true,
                    data: { tracked: 0, skipped: eventIds.length },
                    message: 'All events are already tracked'
                };
            }

            const insertData = newEventIds.map(eventId => ({
                user_id: userId,
                event_id: eventId,
                status,
                created_at: new Date().toISOString()
            }));

            const { error } = await supabase
                .from('user_events')
                .insert(insertData);

            if (error) throw error;

            return {
                success: true,
                data: {
                    tracked: newEventIds.length,
                    skipped: existingEventIds.size
                },
                message: `Successfully tracked ${newEventIds.length} events!`
            };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to track events'
            };
        }
    }
}