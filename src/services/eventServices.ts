// Replace the imports section at the top of src/services/eventServices.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type {
    AppEvent,
    EventFilters,
    SearchSuggestion,
    SupabaseEventWithDetails,
    EnhancedAppEvent,
} from '@/types';
import {
    eventTransformer,
    eventTypeTransformer,
    enrichEvent,
    enhancedEventTransformer  // ADD THIS
} from '@/utils/transformers';
import { sanitizeFtsQuery } from '@/lib/securityUtils';  // ADD THIS
import * as Sentry from "@sentry/nextjs";
type SupabaseClientType = SupabaseClient<Database>;

export class EventService {
    static async getEvents(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        // CHANGE 1: Added pagination parameters with reasonable defaults.
        page: number = 1,
        pageSize: number = 100
    ): Promise<AppEvent[]> {
        try {
            // CHANGE 2: Calculate the query range for pagination.
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('events')
                .select(`*, event_type:event_type_id (*), organizer:organizers (id, name)`)
                .order('start_time', { ascending: true })
                // CHANGE 3: Apply the pagination range to the query.
                .range(from, to);

            if (filters.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters.endDate) query = query.lte('start_time', filters.endDate.toISOString());

            // CHANGE 4: Upgraded search logic.
            if (filters.searchTerm) {
                // Use the more powerful 'websearch' type which understands search engine synta 
                // (e.g., "quoted phrases", -negation) and handles sanitization.
                query = query.textSearch('fts', filters.searchTerm, {
                    type: 'websearch',
                    config: 'english'
                });
            }

            if (filters.status?.length) query = query.in('status', filters.status);
            if (filters.eventIds?.length) query = query.in('id', filters.eventIds);

            const { data, error } = await query;
            if (error) throw error;

            const events: AppEvent[] = (data || []).map((item) => {
                const typedItem = item as SupabaseEventWithDetails;
                const baseEvent = eventTransformer.toApp(typedItem);
                const eventType = typedItem.event_type ? eventTypeTransformer.toApp(typedItem.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });

            return events;
        } catch (error) {
            console.error('Error fetching events:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEvents', filters }
            });
            throw new Error('Failed to fetch events.');
        }
    }

    static async getEventById(
        id: string,
        supabaseClient: SupabaseClientType
    ): Promise<AppEvent> {
        try {
            const { data, error } = await supabaseClient
                .from('events')
                .select(`*, event_type:event_type_id (*), organizer:organizers (id, name)`)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event not found');

            const item = data as SupabaseEventWithDetails;
            const baseEvent = eventTransformer.toApp(item);
            const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;

            return enrichEvent(baseEvent, { eventType });
        } catch (error) {
            console.error('Error fetching event by ID:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventById', eventId: id }
            });
            throw new Error(`Failed to fetch event with ID: ${id}.`);
        }
    }

    static async searchEvents(
        term: string,
        supabaseClient: SupabaseClientType,
        limit = 10
    ): Promise<SearchSuggestion[]> {
        try {
            if (!term.trim()) {
                return [];
            }

            const { data, error } = await supabaseClient
                .from('events')
                .select(`id, title, start_time, organizer:organizers (name)`)
                // CHANGE 5: Upgraded search logic for suggestions as well.
                .textSearch('fts', term, {
                    type: 'websearch',
                    config: 'english'
                })
                .order('start_time', { ascending: true })
                .limit(limit);

            if (error) throw error;

            type SearchResult = { id: string; title: string | null; start_time: string; organizer: { name: string } | null };

            return (data as SearchResult[] || [])
                .filter(item => item.start_time !== null)
                .map(item => ({
                    id: item.id,
                    title: item.title || 'Untitled Event',
                    organizer: item.organizer?.name || 'Unknown Organizer',
                    startTime: item.start_time,
                    type: 'event' as const
                }));
        } catch (error) {
            console.error('Error searching events:', error);
            Sentry.captureException(error, {
                extra: { function: 'searchEvents', searchTerm: term, limit }
            });
            throw new Error('Search failed. Please try again.');
        }
    }

    static async getEventsByDateRange(
        startDate: Date,
        endDate: Date,
        supabaseClient: SupabaseClientType,
        categoryIds?: string[],
        limit?: number
    ): Promise<AppEvent[]> {
        try {
            let query = supabaseClient
                .from('events')
                .select(`*, event_type:event_type_id (*), organizer:organizers (id, name)`)
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString())
                .order('start_time', { ascending: true });

            if (categoryIds?.length) query = query.in('event_type_id', categoryIds);
            if (limit) query = query.limit(limit);

            const { data, error } = await query;
            if (error) throw error;

            return (data as SupabaseEventWithDetails[] || []).map((item) => {
                const baseEvent = eventTransformer.toApp(item);
                const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });
        } catch (error) {
            console.error('Error fetching events by date range:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsByDateRange', startDate, endDate, categoryIds, limit }
            });
            throw new Error('Failed to fetch events in the specified date range.');
        }
    }

    static async getUpcomingEvents(
        supabaseClient: SupabaseClientType,
        limit = 50
    ): Promise<AppEvent[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);
        return this.getEventsByDateRange(now, futureDate, supabaseClient, undefined, limit);
    }

    static async getLiveEvents(
        supabaseClient: SupabaseClientType
    ): Promise<AppEvent[]> {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabaseClient
                .from('events')
                .select(`*, event_type:event_type_id (*), organizer:organizers (id, name)`)
                .lte('start_time', now)
                .or(`end_time.gte.${now},end_time.is.null`)
                .order('start_time', { ascending: true });

            if (error) throw error;

            return (data as SupabaseEventWithDetails[] || []).map((item) => {
                const baseEvent = eventTransformer.toApp(item);
                const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });
        } catch (error) {
            console.error('Error fetching live events:', error);
            Sentry.captureException(error, {
                extra: { function: 'getLiveEvents' }
            });
            throw new Error('Failed to fetch live events.');
        }
    }

    // Replace the getEventsWithMultiDaySupport method in src/services/eventServices.ts

    static async getEventsWithMultiDaySupport(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100
    ): Promise<EnhancedAppEvent[]> {
        try {
            let query = supabaseClient
                .from('events')
                .select(`
                *,
                event_type:event_type_id(id, name, color, description),
                organizer:organizer_id(id, name)
            `);

            // FIXED: Better date range filtering for multi-day events
            if (filters.startDate && filters.endDate) {
                // This query captures:
                // 1. Events that start within the date range
                // 2. Events that end within the date range  
                // 3. Events that span the entire date range
                query = query.or(
                    `and(start_time.gte.${filters.startDate.toISOString()},start_time.lte.${filters.endDate.toISOString()}),` +
                    `and(end_time.gte.${filters.startDate.toISOString()},end_time.lte.${filters.endDate.toISOString()}),` +
                    `and(start_time.lte.${filters.startDate.toISOString()},end_time.gte.${filters.endDate.toISOString()})`
                );
            } else if (filters.startDate) {
                // For single date, get events that either start on that date OR span across that date
                const dayStart = new Date(filters.startDate);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(filters.startDate);
                dayEnd.setHours(23, 59, 59, 999);

                query = query.or(
                    `and(start_time.gte.${dayStart.toISOString()},start_time.lte.${dayEnd.toISOString()}),` +
                    `and(start_time.lte.${dayStart.toISOString()},end_time.gte.${dayStart.toISOString()})`
                );
            }

            if (filters.categories?.length) {
                query = query.in('event_type_id', filters.categories);
            }

            if (filters.searchTerm) {
                query = query.textSearch('fts', sanitizeFtsQuery(filters.searchTerm));
            }

            const { data, error } = await query
                .order('start_time', { ascending: true })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;
            if (!data) return [];

            return data.map(enhancedEventTransformer.toApp);
        } catch (error) {
            console.error('Error fetching events with multi-day support:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsWithMultiDaySupport', filters }
            });
            throw new Error('Failed to fetch events with multi-day support.');
        }
    }

    static async getRecommendedEvents(
        categoryNames: string[],
        excludedEventIds: string[],
        supabaseClient: SupabaseClientType
    ): Promise<AppEvent[]> {
        try {
            if (categoryNames.length === 0) return [];

            const { data: categories, error: categoryError } = await supabaseClient
                .from('event_type')
                .select('id')
                .in('name', categoryNames);
            if (categoryError) throw categoryError;

            const categoryIds = categories.map(c => c.id);
            if (categoryIds.length === 0) return [];

            let query = supabaseClient
                .from('events')
                .select(`*, event_type:event_type_id (*), organizer:organizers (id, name)`)
                .in('event_type_id', categoryIds)
                .gte('start_time', new Date().toISOString())
                .limit(3);

            if (excludedEventIds.length > 0) {
                query = query.not('id', 'in', `(${excludedEventIds.join(',')})`);
            }

            const { data, error } = await query;
            if (error) throw error;

            return (data as SupabaseEventWithDetails[] || []).map((item) => {
                const baseEvent = eventTransformer.toApp(item);
                const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
                return enrichEvent(baseEvent, { eventType });
            });
        } catch (error) {
            console.error('Error fetching recommended events:', error);
            Sentry.captureException(error, {
                extra: { function: 'getRecommendedEvents', categoryNames, excludedEventIds }
            });
            throw new Error('Failed to fetch recommended events.');
        }
    }
}