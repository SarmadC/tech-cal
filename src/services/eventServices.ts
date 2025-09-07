// src/services/eventServices.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type {
    Event,
    EventFilters,
    SearchSuggestion,
    SupabaseEventWithDetails,
    MultiDayEvent,
    AgendaItem,
    Speaker,
} from '@/types';
import {
    eventTransformer,
    eventTypeTransformer,
    enrichEvent,
    enhancedEventTransformer
} from '@/utils/transformers';
import { sanitizeFtsQuery } from '@/lib/securityUtils';
import * as Sentry from "@sentry/nextjs";

type SupabaseClientType = SupabaseClient<Database>;

export class EventService {
    // Helper function to fetch and attach tags to events
    private static async attachTagsToEvents<T extends Record<string, unknown>>(
        events: T[],
        supabaseClient: SupabaseClientType
    ): Promise<(T & { tags: Array<{ id: string; name: string; color: string; category: string }> })[]> {
        if (!events || events.length === 0) return events.map(event => ({ ...event, tags: [] }));

        const eventIds = events.map(event => event.id as string).filter(Boolean);
        if (eventIds.length === 0) return events.map(event => ({ ...event, tags: [] }));

        const { data: tagRelations } = await supabaseClient
            .from('event_tag_relations')
            .select('event_id, tag_id')
            .in('event_id', eventIds);

        if (!tagRelations || tagRelations.length === 0) return events.map(event => ({ ...event, tags: [] }));

        const tagIds = tagRelations.map(rel => rel.tag_id);
        const { data: tags } = await supabaseClient
            .from('event_tags')
            .select('id, event_tag, color, category')
            .in('id', tagIds);

        // Create a map of event_id to tags
        const eventTagsMap = new Map();
        tagRelations.forEach(rel => {
            const tag = tags?.find(t => t.id === rel.tag_id);
            if (tag) {
                if (!eventTagsMap.has(rel.event_id)) {
                    eventTagsMap.set(rel.event_id, []);
                }
                eventTagsMap.get(rel.event_id).push({
                    id: tag.id,
                    name: tag.event_tag,
                    color: tag.color || '#6b7280',
                    category: tag.category || 'General'
                });
            }
        });

        // Attach tags to events
        return events.map(event => ({
            ...event,
            tags: eventTagsMap.get(event.id as string) || []
        })) as (T & { tags: Array<{ id: string; name: string; color: string; category: string }> })[];
    }

    // 2. UPDATE SIGNATURE: The function now returns a promise of `Event[]`.
    static async getEvents(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100
    ): Promise<Event[]> {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('events')
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url)
                `)
                .order('start_time', { ascending: true })
                .range(from, to);

            if (filters.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters.endDate) query = query.lte('start_time', filters.endDate.toISOString());

            if (filters.searchTerm) {
                query = query.textSearch('fts', filters.searchTerm, {
                    type: 'websearch',
                    config: 'english'
                });
            }

            if (filters.status?.length) query = query.in('status', filters.status);
            if (filters.eventIds?.length) query = query.in('id', filters.eventIds);

            const { data, error } = await query;
            if (error) throw error;

            // Fetch tags for all events
            const eventsWithTags = await this.attachTagsToEvents(data || [], supabaseClient);

            // 3. UPDATE TYPE ANNOTATION: The local variable is now correctly typed.
            const events: Event[] = eventsWithTags.map((item) => {
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

    // 4. UPDATE SIGNATURE: The function now returns a promise of `Event`.
    static async getEventById(
        id: string,
        supabaseClient: SupabaseClientType
    ): Promise<Event> {
        try {
            const { data, error } = await supabaseClient
                .from('events')
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url)
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event not found');

            // Fetch tags for this event
            const eventsWithTags = await this.attachTagsToEvents([data], supabaseClient);
            const eventWithTags = eventsWithTags[0];

            const item = eventWithTags as SupabaseEventWithDetails;
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

    // 5. UPDATE SIGNATURE: The function now returns a promise of `Event[]`.
    static async getEventsByDateRange(
        startDate: Date,
        endDate: Date,
        supabaseClient: SupabaseClientType,
        categoryIds?: string[],
        limit?: number
    ): Promise<Event[]> {
        try {
            let query = supabaseClient
                .from('events')
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url)
                `)
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString())
                .order('start_time', { ascending: true });

            if (categoryIds?.length) query = query.in('event_type_id', categoryIds);
            if (limit) query = query.limit(limit);

            const { data, error } = await query;
            if (error) throw error;

            // Fetch tags for all events in this date range
            const eventsWithTags = await this.attachTagsToEvents(data || [], supabaseClient);

            return (eventsWithTags as SupabaseEventWithDetails[] || []).map((item) => {
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

    // 6. UPDATE SIGNATURE: The function now returns a promise of `Event[]`.
    static async getUpcomingEvents(
        supabaseClient: SupabaseClientType,
        limit = 50
    ): Promise<Event[]> {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + 30);
        return this.getEventsByDateRange(now, futureDate, supabaseClient, undefined, limit);
    }

    // 7. UPDATE SIGNATURE: The function now returns a promise of `Event[]`.
    static async getLiveEvents(
        supabaseClient: SupabaseClientType
    ): Promise<Event[]> {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabaseClient
                .from('events')
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url)
                `)
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

    // 8. UPDATE SIGNATURE: The function now returns a promise of `MultiDayEvent[]`.
    static async getEventsWithMultiDaySupport(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100
    ): Promise<MultiDayEvent[]> {
        try {
            let query = supabaseClient
                .from('events')
                .select(`
                *,
                event_type:event_type_id(*),
                organizer:organizers (id, name, logo_url)
            `);

            if (filters.startDate && filters.endDate) {
                query = query.or(
                    `and(start_time.gte.${filters.startDate.toISOString()},start_time.lte.${filters.endDate.toISOString()}),` +
                    `and(end_time.gte.${filters.startDate.toISOString()},end_time.lte.${filters.endDate.toISOString()}),` +
                    `and(start_time.lte.${filters.startDate.toISOString()},end_time.gte.${filters.endDate.toISOString()})`
                );
            } else if (filters.startDate) {
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

            // Fetch tags for all events with multi-day support
            const eventsWithTags = await this.attachTagsToEvents(data || [], supabaseClient);

            return eventsWithTags.map(enhancedEventTransformer.toApp);
        } catch (error) {
            console.error('Error fetching events with multi-day support:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsWithMultiDaySupport', filters }
            });
            throw new Error('Failed to fetch events with multi-day support.');
        }
    }

    // 9. UPDATE SIGNATURE: The function now returns a promise of `Event[]`.
    static async getRecommendedEvents(
        categoryNames: string[],
        excludedEventIds: string[],
        supabaseClient: SupabaseClientType
    ): Promise<Event[]> {
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
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url)
                `)
                .in('event_type_id', categoryIds)
                .gte('start_time', new Date().toISOString())
                .limit(3);

            if (excludedEventIds.length > 0) {
                query = query.not('id', 'in', `(${excludedEventIds.join(',')})`);
            }

            const { data, error } = await query;
            if (error) throw error;

            // Fetch tags for all live events
            const eventsWithTags = await this.attachTagsToEvents(data || [], supabaseClient);

            return (eventsWithTags as SupabaseEventWithDetails[] || []).map((item) => {
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

    // 10. NEW METHOD: Fetch event with agenda data
    static async getEventWithAgenda(
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<Event & { agenda?: AgendaItem[] }> {
        try {
            const { data, error } = await supabaseClient
                .from('events')
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url),
                    event_agenda (
                        id,
                        day_number,
                        start_time,
                        end_time,
                        title,
                        description,
                        location,
                        agenda_type,
                        duration_minutes,
                        track,
                        sort_order,
                        speakers (
                            id,
                            name,
                            title,
                            company,
                            photo_url
                        )
                    )
                `)
                .eq('id', eventId)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event not found');

            // Fetch tags for this event
            const eventsWithTags = await this.attachTagsToEvents([data], supabaseClient);
            const eventWithTags = eventsWithTags[0];

            const item = eventWithTags as SupabaseEventWithDetails;
            const baseEvent = eventTransformer.toApp(item);
            const eventType = item.event_type ? eventTypeTransformer.toApp(item.event_type) : undefined;
            const enrichedEvent = enrichEvent(baseEvent, { eventType });

            // Add agenda data
            const eventAgenda = (data as Record<string, unknown>).event_agenda;
            const agenda = Array.isArray(eventAgenda) ? eventAgenda.map((agendaItem: Record<string, unknown>) => ({
                id: agendaItem.id as string,
                day_number: agendaItem.day_number as number,
                start_time: agendaItem.start_time as string,
                end_time: agendaItem.end_time as string,
                title: agendaItem.title as string,
                description: agendaItem.description as string | undefined,
                location: agendaItem.location as string | undefined,
                agenda_type: agendaItem.agenda_type as string,
                duration_minutes: agendaItem.duration_minutes as number | undefined,
                track: agendaItem.track as string | undefined,
                speakers: (agendaItem.speakers as Speaker[]) || []
            })) : [];

            return { ...enrichedEvent, agenda };
        } catch (error) {
            console.error('Error fetching event with agenda:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventWithAgenda', eventId }
            });
            throw new Error(`Failed to fetch event with agenda for ID: ${eventId}.`);
        }
    }

    // 11. NEW METHOD: Fetch events with agenda data for multi-day events
    static async getEventsWithAgenda(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100
    ): Promise<(Event & { agenda?: AgendaItem[] })[]> {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('events')
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url),
                    event_agenda (
                        id,
                        day_number,
                        start_time,
                        end_time,
                        title,
                        description,
                        location,
                        agenda_type,
                        duration_minutes,
                        track,
                        sort_order,
                        speakers (
                            id,
                            name,
                            title,
                            company,
                            photo_url
                        )
                    )
                `)
                .order('start_time', { ascending: true })
                .range(from, to);

            if (filters.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters.endDate) query = query.lte('start_time', filters.endDate.toISOString());

            if (filters.searchTerm) {
                query = query.textSearch('fts', filters.searchTerm, {
                    type: 'websearch',
                    config: 'english'
                });
            }

            if (filters.status?.length) query = query.in('status', filters.status);
            if (filters.eventIds?.length) query = query.in('id', filters.eventIds);

            const { data, error } = await query;
            if (error) throw error;

            // Fetch tags for all events
            const eventsWithTags = await this.attachTagsToEvents(data || [], supabaseClient);

            const events: (Event & { agenda?: AgendaItem[] })[] = eventsWithTags.map((item) => {
                const typedItem = item as SupabaseEventWithDetails;
                const baseEvent = eventTransformer.toApp(typedItem);
                const eventType = typedItem.event_type ? eventTypeTransformer.toApp(typedItem.event_type) : undefined;
                const enrichedEvent = enrichEvent(baseEvent, { eventType });

                // Add agenda data for multi-day events
                const eventAgenda = (item as Record<string, unknown>).event_agenda;
                const agenda = Array.isArray(eventAgenda) ? eventAgenda.map((agendaItem: Record<string, unknown>) => ({
                    id: agendaItem.id as string,
                    day_number: agendaItem.day_number as number,
                    start_time: agendaItem.start_time as string,
                    end_time: agendaItem.end_time as string,
                    title: agendaItem.title as string,
                    description: agendaItem.description as string | undefined,
                    location: agendaItem.location as string | undefined,
                    agenda_type: agendaItem.agenda_type as string,
                    duration_minutes: agendaItem.duration_minutes as number | undefined,
                    track: agendaItem.track as string | undefined,
                    speakers: (agendaItem.speakers as Speaker[]) || []
                })) : [];

                return { ...enrichedEvent, agenda };
            });

            return events;
        } catch (error) {
            console.error('Error fetching events with agenda:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsWithAgenda', filters }
            });
            throw new Error('Failed to fetch events with agenda.');
        }
    }

    // 12. NEW METHOD: Fetch events with both agenda data AND multi-day support
    static async getEventsWithAgendaAndMultiDaySupport(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100
    ): Promise<MultiDayEvent[]> {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('events')
                .select(`
                    *, 
                    event_type:event_type_id (*), 
                    organizer:organizers (id, name, logo_url),
                    event_agenda (
                        id,
                        day_number,
                        start_time,
                        end_time,
                        title,
                        description,
                        location,
                        agenda_type,
                        duration_minutes,
                        track,
                        sort_order,
                        speakers (
                            id,
                            name,
                            title,
                            company,
                            photo_url
                        )
                    )
                `)
                .order('start_time', { ascending: true })
                .range(from, to);

            if (filters.startDate && filters.endDate) {
                query = query.or(
                    `and(start_time.gte.${filters.startDate.toISOString()},start_time.lte.${filters.endDate.toISOString()}),` +
                    `and(end_time.gte.${filters.startDate.toISOString()},end_time.lte.${filters.endDate.toISOString()}),` +
                    `and(start_time.lte.${filters.startDate.toISOString()},end_time.gte.${filters.endDate.toISOString()})`
                );
            } else if (filters.startDate) {
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

            const { data, error } = await query;
            if (error) throw error;

            // Fetch tags for all events
            const eventsWithTags = await this.attachTagsToEvents(data || [], supabaseClient);

            const events: MultiDayEvent[] = eventsWithTags.map((item) => {
                const typedItem = item as SupabaseEventWithDetails;
                const baseEvent = eventTransformer.toApp(typedItem);
                const eventType = typedItem.event_type ? eventTypeTransformer.toApp(typedItem.event_type) : undefined;
                const _enrichedEvent = enrichEvent(baseEvent, { eventType });

                // Add agenda data
                const eventAgenda = (item as Record<string, unknown>).event_agenda;
                const agenda = Array.isArray(eventAgenda) ? eventAgenda.map((agendaItem: Record<string, unknown>) => ({
                    id: agendaItem.id as string,
                    day_number: agendaItem.day_number as number,
                    start_time: agendaItem.start_time as string,
                    end_time: agendaItem.end_time as string,
                    title: agendaItem.title as string,
                    description: agendaItem.description as string | undefined,
                    location: agendaItem.location as string | undefined,
                    agenda_type: agendaItem.agenda_type as string,
                    duration_minutes: agendaItem.duration_minutes as number | undefined,
                    track: agendaItem.track as string | undefined,
                    speakers: (agendaItem.speakers as Speaker[]) || []
                })) : [];

                // Process multi-day information (same logic as getEventsWithMultiDaySupport)
                const multiDayEvent = enhancedEventTransformer.toApp(typedItem);
                
                return { ...multiDayEvent, agenda };
            });

            return events;
        } catch (error) {
            console.error('Error fetching events with agenda and multi-day support:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsWithAgendaAndMultiDaySupport', filters }
            });
            throw new Error('Failed to fetch events with agenda and multi-day support.');
        }
    }
}