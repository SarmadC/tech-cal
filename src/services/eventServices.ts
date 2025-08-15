import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type { AppEvent, EventFilters, SearchSuggestion, SupabaseEventWithDetails } from '@/types';
import { eventTransformer, eventTypeTransformer, enrichEvent } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Helper function to sanitize a string for a full-text search query.
 * This prevents FTS query injection by removing special operators.
 * @param query The raw search string from the user.
 * @param joiner The operator to join terms with ('&' for AND, '|' for OR).
 * @returns A sanitized query string safe for Supabase FTS.
 */
function sanitizeFtsQuery(query: string, joiner: ' & ' | ' | ' = ' & '): string {
    // 1. Remove special FTS operators: & | ! : ' ( ) < >
    const sanitized = query.replace(/[&|!:'()<>]+/g, '');

    // 2. Split into words, filter out empty strings, and join with the specified operator.
    const terms = sanitized.trim().split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
        return '';
    }

    return terms.join(joiner);
}

export class EventService {
    static async getEvents(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType
    ): Promise<AppEvent[]> {
        try {
            let query = supabaseClient
                .from('events')
                .select(`*, event_type:event_type_id (*), organizer:organizers (id, name)`)
                .order('start_time', { ascending: true });

            if (filters.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters.endDate) query = query.lte('start_time', filters.endDate.toISOString());

            // Sanitize the search term before using it in the query.
            if (filters.searchTerm) {
                const sanitizedSearchTerm = sanitizeFtsQuery(filters.searchTerm, ' & '); // Use AND logic
                if (sanitizedSearchTerm) {
                    query = query.textSearch('fts', sanitizedSearchTerm, { type: 'plain', config: 'english' });
                }
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
            // Sanitize the search term for the suggestions search as well.
            const sanitizedTerm = sanitizeFtsQuery(term, ' | '); // Use OR logic for better suggestions

            // If the sanitized term is empty (e.g., user only typed '!'), return no results.
            if (!sanitizedTerm) {
                return [];
            }

            const { data, error } = await supabaseClient
                .from('events')
                .select(`id, title, start_time, organizer:organizers (name)`)
                // ⚠️ ATTENTION: Note the change from 'websearch' to 'plain'
                .textSearch('fts', sanitizedTerm, { type: 'plain', config: 'english' })
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