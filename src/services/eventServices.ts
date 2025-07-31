// src/services/eventServices.ts (Refactored for New Schema)

import { supabase as browserSupabaseClient, SupabaseClientType } from '@/lib/supabaseClient';
// NEW: Import SupabaseEventWithDetails to handle the new joined data shape
import type { AppEvent, EventFilters, ApiResponse, SearchSuggestion, SupabaseEventWithDetails } from '@/types';
import { eventTransformer, eventTypeTransformer, enrichEvent } from '@/utils/transformers';

export class EventService {
    /**
     * Fetch events with optional filtering and enrichment.
     */
    static async getEvents(
        filters?: EventFilters,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEvent[]>> {
        try {
            let query = supabaseClient
                .from('events')
                // CHANGED: The .select() statement now explicitly joins organizers
                .select(`
                    *,
                    event_type:event_type_id (id, name, color, description),
                    organizer:organizers (id, name)
                `)
                .order('start_time', { ascending: true });

            if (filters?.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters?.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters?.endDate) query = query.lte('start_time', filters.endDate.toISOString());

            // CHANGED: Switched from 'ilike' to high-performance 'textSearch'
            if (filters?.searchTerm) {
                query = query.textSearch('fts', filters.searchTerm, {
                    type: 'websearch',
                    config: 'english'
                });
            }

            if (filters?.status?.length) query = query.in('status', filters.status);
            if (filters?.eventIds?.length) query = query.in('id', filters.eventIds);

            const { data, error } = await query;
            if (error) throw error;

            const events: AppEvent[] = (data || []).map((item) => {
                // NEW: Use the more specific type that includes the joined organizer
                const typedItem = item as SupabaseEventWithDetails;
                const baseEvent = eventTransformer.toApp(typedItem);
                const eventType = typedItem.event_type ? eventTypeTransformer.toApp(typedItem.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });

            return { success: true, data: events };
        } catch (error) {
            console.error('Error fetching events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch events' };
        }
    }

    /**
     * Get a single event by ID with full enrichment.
     */
    static async getEventById(
        id: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEvent>> {
        try {
            const { data, error } = await supabaseClient
                .from('events')
                // CHANGED: The .select() statement now explicitly joins organizers
                .select(`
                    *,
                    event_type:event_type_id (id, name, color, description),
                    organizer:organizers (id, name)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event not found');

            const item = data as SupabaseEventWithDetails;
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
     * Search events with smart suggestions.
     */
    static async searchEvents(
        term: string,
        limit = 10,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<SearchSuggestion[]>> {
        try {
            const { data, error } = await supabaseClient
                .from('events')
                // CHANGED: Select now joins the organizer's name
                .select(`id, title, start_time, organizer:organizers (name)`)
                // CHANGED: Switched to high-performance Full-Text Search
                .textSearch('fts', `'${term}'`, {
                    type: 'websearch',
                    config: 'english'
                })
                .order('start_time', { ascending: true })
                .limit(limit);

            if (error) throw error;

            // Type assertion for the new shape of the data
            type SearchResult = { id: string; title: string | null; start_time: string; organizer: { name: string } | null };

            const suggestions: SearchSuggestion[] = (data as SearchResult[] || [])
                .filter(item => item.start_time !== null)
                .map(item => ({
                    id: item.id,
                    title: item.title || 'Untitled Event',
                    // CHANGED: Safely access the joined organizer name
                    organizer: item.organizer?.name || 'Unknown Organizer',
                    startTime: item.start_time,
                    type: 'event' as const
                }));

            return { success: true, data: suggestions };
        } catch (error) {
            console.error('Error searching events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Search failed' };
        }
    }

    // All methods below this point also need the updated .select() statement

    /**
     * Get events by date range (optimized for calendar views).
     */
    static async getEventsByDateRange(
        startDate: Date,
        endDate: Date,
        categoryIds?: string[],
        limit?: number,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEvent[]>> {
        try {
            let query = supabaseClient
                .from('events')
                // CHANGED: The .select() statement now explicitly joins organizers
                .select(`
                    *,
                    event_type:event_type_id (id, name, color),
                    organizer:organizers (id, name)
                `)
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString())
                .order('start_time', { ascending: true });

            if (categoryIds?.length) query = query.in('event_type_id', categoryIds);
            if (limit) query = query.limit(limit);

            const { data, error } = await query;
            if (error) throw error;

            const events: AppEvent[] = (data as SupabaseEventWithDetails[] || []).map((item) => {
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
     * Get upcoming events (next 30 days).
     */
    static async getUpcomingEvents(
        limit = 50,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEvent[]>> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);
        return this.getEventsByDateRange(now, futureDate, undefined, limit, supabaseClient);
    }

    /**
     * Get live events (happening now).
     */
    static async getLiveEvents(
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEvent[]>> {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabaseClient
                .from('events')
                // CHANGED: The .select() statement now explicitly joins organizers
                .select(`
                    *,
                    event_type:event_type_id (id, name, color),
                    organizer:organizers (id, name)
                `)
                .lte('start_time', now)
                .or(`end_time.gte.${now},end_time.is.null`)
                .order('start_time', { ascending: true });

            if (error) throw error;

            const events: AppEvent[] = (data as SupabaseEventWithDetails[] || []).map((item) => {
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

    /**
     * Fetches recommended events based on a user's top categories.
     */
    static async getRecommendedEvents(
        categoryNames: string[],
        excludedEventIds: string[],
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<AppEvent[]>> {
        try {
            if (categoryNames.length === 0) return { success: true, data: [] };

            const { data: categories, error: categoryError } = await supabaseClient
                .from('event_type')
                .select('id')
                .in('name', categoryNames);
            if (categoryError) throw categoryError;

            const categoryIds = categories.map(c => c.id);
            if (categoryIds.length === 0) return { success: true, data: [] };

            let query = supabaseClient
                .from('events')
                // CHANGED: The .select() statement now explicitly joins organizers
                .select(`
                    *,
                    event_type:event_type_id (*),
                    organizer:organizers (id, name)
                `)
                .in('event_type_id', categoryIds)
                .gte('start_time', new Date().toISOString())
                .limit(3);

            if (excludedEventIds.length > 0) {
                query = query.not('id', 'in', `(${excludedEventIds.join(',')})`);
            }

            const { data, error } = await query;
            if (error) throw error;

            const events: AppEvent[] = (data as SupabaseEventWithDetails[] || []).map((item) => {
                const baseEvent = eventTransformer.toApp(item);
                const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });

            return { success: true, data: events };
        } catch (error) {
            console.error('Error fetching recommended opportunities:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch events' };
        }
    }
}