// src/services/eventServices.ts

import type {
    Event,
    EventFilters,
    SearchSuggestion,
    SupabaseEventWithDetails,
    MultiDayEvent,
    AgendaItem,
    SupabaseClientType,
    RecommendationTelemetryContext,
} from '@/types';
// Type alias for Supabase query builder - using any for practical reasons
// Supabase's query builder types are complex and change between versions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventQueryBuilder = any;
import {
    eventTransformer,
    eventDetailedTransformer,
    eventTypeTransformer,
    enrichEvent,
    enhancedEventTransformer
} from '@/utils/transformers';
import { sanitizeFtsQuery } from '@/lib/securityUtils';
import { TagBasedMatchingService } from '@/services/TagBasedMatchingService';
import { CareerProfile } from '@/types/career';
import { enrichEventsWithCareerImpact as enrichEventsWithNewScoring } from './careerImpactEnrichmentService';
import { LookalikeUserService } from './lookalikeUserService';
import { DiversityEnhancementService } from './diversityEnhancementService';
import { DIVERSITY_CONFIG } from '@/utils/diversityUtils';
import * as Sentry from "@sentry/nextjs";
import { logTelemetryEvent } from '@/utils/supabase/telemetry';

export class EventService {
    /**
     * Get total count of events matching filters
     */
    static async getEventCount(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType
    ): Promise<number> {
        try {
            let query = supabaseClient
                .from('events')
                .select('id', { count: 'exact', head: true });

            // Apply same filters as getEvents but only count
            if (filters.startDate) {
                query = query.gte('start_time', filters.startDate.toISOString());
            }
            if (filters.endDate) {
                query = query.lte('start_time', filters.endDate.toISOString());
            }
            if (filters.categories?.length) {
                query = query.in('event_type_id', filters.categories);
            }
            if (filters.searchTerm) {
                query = query.textSearch('fts', sanitizeFtsQuery(filters.searchTerm));
            }

            const { count, error } = await query;
            if (error) throw error;
            
            return count || 0;
        } catch (error) {
            console.error('Error counting events:', error);
            return 0;
        }
    }
    // Helper function to fetch and attach event types to events
    private static async attachEventTypesToEvents(
        events: Event[],
        supabaseClient: SupabaseClientType
    ): Promise<Event[]> {
        if (!events || events.length === 0) return events;

        // Get unique event type IDs from events
        const eventTypeIds = [...new Set(events.map(event => event.eventTypeId as string).filter(Boolean))];
        if (eventTypeIds.length === 0) return events;

        // Fetch event types
        const { data: eventTypes, error } = await supabaseClient
            .from('event_type')
            .select('id, name, color, icon, description')
            .in('id', eventTypeIds);

        if (error) {
            console.error('Error fetching event types:', error);
            return events;
        }

        // Create a map of event_type_id to event type
        const eventTypeMap = new Map();
        eventTypes?.forEach(eventType => {
            eventTypeMap.set(eventType.id, {
                id: eventType.id,
                name: eventType.name,
                color: eventType.color || '#6b7280',
                description: eventType.description,
                icon: eventType.icon
            });
        });

        // Attach event types to events
        return events.map(event => ({
            ...event,
            category: eventTypeMap.get(event.eventTypeId as string) || undefined
        }));
    }

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

    // Get events with multi-day support - uses main events table for multi-day fields
    static async getEventsWithMultiDay(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100
    ): Promise<(Event | MultiDayEvent)[]> {
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            let query = supabaseClient
                .from('events')
                .select(`
                    *,
                    event_type (
                        id,
                        name,
                        color,
                        description
                    ),
                    organizers!fk_events_organizer (
                        id,
                        name,
                        logo_url,
                        website_url
                    )
                `)
                .range(from, to);

            // Apply filters (same logic, cleaner code)
            if (filters.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters.endDate) query = query.lte('start_time', filters.endDate.toISOString());
            if (filters.searchTerm?.trim()) {
                query = query.textSearch('fts', filters.searchTerm.trim(), {
                    type: 'websearch',
                    config: 'english'
                });
            }
            if (filters.status?.length) query = query.in('status', filters.status);
            if (filters.eventIds?.length) query = query.in('id', filters.eventIds);

            query = this.applyEnhancedFilters(query, filters);

            const { data, error } = await query;

            if (error) throw error;

            // Transform events using enhanced transformer to include multi-day data
            const transformedEvents = (data || []).map((eventData: Record<string, unknown>) => {
                return enhancedEventTransformer.toApp(eventData as never);
            });

            // Attach tags to events - cast to unknown first to avoid type conflicts
            const eventsWithTags = await this.attachTagsToEvents(transformedEvents as unknown as Parameters<typeof this.attachTagsToEvents>[0], supabaseClient);

            return eventsWithTags as unknown as (Event | MultiDayEvent)[];
        } catch (error) {
            console.error('Error fetching events with multi-day support:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsWithMultiDay', filters, page, pageSize }
            });
            throw new Error('Failed to fetch events with multi-day support');
        }
    }

    // Refactored: Use events_detailed view (60% less code, tags pre-aggregated)
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
                .from('events_detailed')
                .select('*')
                .range(from, to);

            // Apply filters (same logic, cleaner code)
            if (filters.categories?.length) query = query.in('event_type_id', filters.categories);
            if (filters.startDate) query = query.gte('start_time', filters.startDate.toISOString());
            if (filters.endDate) query = query.lte('start_time', filters.endDate.toISOString());
            if (filters.searchTerm?.trim()) {
                query = query.textSearch('fts', filters.searchTerm.trim(), {
                    type: 'websearch',
                    config: 'english'
                });
            }
            if (filters.status?.length) query = query.in('status', filters.status);
            if (filters.eventIds?.length) query = query.in('id', filters.eventIds);

            query = this.applyEnhancedFilters(query, filters);
            query = this.applySorting(query, filters.sortBy);

            const { data, error } = await query;
            
            if (error) {
                console.error('Supabase query error:', error);
                throw error;
            }

            // Transform events and attach event types
            const transformedEvents = (data || []).map(eventDetailedTransformer.toApp);
            const eventsWithTypes = await this.attachEventTypesToEvents(transformedEvents, supabaseClient);
            
            return eventsWithTypes;
        } catch (error) {
            console.error('Error fetching events:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEvents', filters }
            });
            throw new Error('Failed to fetch events.');
        }
    }

    // Refactored: Use events_detailed view (70% less code, no manual joins)
    static async getEventById(
        id: string,
        supabaseClient: SupabaseClientType
    ): Promise<Event> {
        try {
            const { data, error } = await supabaseClient
                .from('events_detailed')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!data) throw new Error('Event not found');

            return eventDetailedTransformer.toApp(data);
        } catch (error) {
            console.error('Error fetching event by ID:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventById', eventId: id }
            });
            throw new Error(`Failed to fetch event with ID: ${id}.`);
        }
    }

    /**
     * Get multiple events by IDs (Refactored)
     */
    static async getEventsByIds(
        eventIds: string[],
        supabaseClient: SupabaseClientType
    ): Promise<Event[]> {
        try {
            if (eventIds.length === 0) return [];

            const { data, error } = await supabaseClient
                .from('events_detailed')
                .select('*')
                .in('id', eventIds);

            if (error) throw error;
            return (data || []).map(eventDetailedTransformer.toApp);
        } catch (error) {
            console.error('Error fetching events by IDs:', error);
            Sentry.captureException(error, { extra: { function: 'getEventsByIds', eventIds } });
            throw new Error('Failed to fetch events.');
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

    // Refactored: Use events_detailed view
    static async getEventsByDateRange(
        startDate: Date,
        endDate: Date,
        supabaseClient: SupabaseClientType,
        categoryIds?: string[],
        limit?: number
    ): Promise<Event[]> {
        try {
            let query = supabaseClient
                .from('events_detailed')
                .select('*')
                .gte('start_time', startDate.toISOString())
                .lte('start_time', endDate.toISOString())
                .order('start_time', { ascending: true });

            if (categoryIds?.length) query = query.in('event_type_id', categoryIds);
            if (limit) query = query.limit(limit);

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(eventDetailedTransformer.toApp);
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

    // Refactored: Use events_detailed view (simplified query)
    static async getLiveEvents(
        supabaseClient: SupabaseClientType
    ): Promise<Event[]> {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabaseClient
                .from('events_detailed')
                .select('*')
                .lte('start_time', now)
                .or(`end_time.gte.${now},end_time.is.null`)
                .order('start_time', { ascending: true });

            if (error) throw error;
            return (data || []).map(eventDetailedTransformer.toApp);
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
                    event_agenda!left (
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
                        agenda_speakers!left (
                            speakers!inner (
                            id,
                            name,
                            title,
                            company,
                            bio,
                            linkedin_url,
                            twitter_url,
                                website_url,
                                photo_url
                            )
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

            
            // Merge agenda from event_agenda (preferred) and daily_schedule JSON (fallback)
            const parsedFromTable: AgendaItem[] = Array.isArray((data as unknown as { event_agenda?: unknown[] }).event_agenda)
                ? ((data as unknown as { event_agenda: unknown[] }).event_agenda as Array<{
                    id: string;
                    day_number: number;
                    start_time: string;
                    end_time: string;
                    title: string;
                    description?: string;
                    location?: string;
                    agenda_type: string;
                    duration_minutes?: number;
                    track?: string;
                    sort_order?: number;
                    agenda_speakers?: Array<{
                        speakers?: {
                            id: string;
                            name: string;
                            title?: string;
                            company?: string;
                            bio?: string;
                            photo_url?: string;
                            linkedin_url?: string;
                            twitter_url?: string;
                            website_url?: string;
                        };
                    }>;
                }>).map(a => {
                    const speakers = Array.isArray(a.agenda_speakers)
                        ? a.agenda_speakers
                            .map((eas: { speakers?: unknown }) => eas?.speakers)
                            .filter((sp): sp is {
                                id: string;
                                name: string;
                                title?: string;
                                company?: string;
                                bio?: string;
                                photo_url?: string;
                                linkedin_url?: string;
                                twitter_url?: string;
                                website_url?: string;
                            } => Boolean(sp))
                            .map((sp) => ({
                                id: String(sp.id),
                                name: sp.name as string,
                                title: (sp.title as string) ?? undefined,
                                company: (sp.company as string) ?? undefined,
                                bio: (sp.bio as string) ?? undefined,
                                photoUrl: (sp.photo_url as string) ?? undefined,
                    socialLinks: {
                                    linkedin: (sp.linkedin_url as string) ?? undefined,
                                    twitter: (sp.twitter_url as string) ?? undefined,
                                    website: (sp.website_url as string) ?? undefined
                                }
                            }))
                        : [];

                    return {
                        id: a.id as string,
                        dayNumber: (a.day_number as number) ?? 1,
                        startTime: a.start_time as string,
                        endTime: a.end_time as string,
                        title: a.title as string,
                        description: a.description as string | undefined,
                        location: a.location as string | undefined,
                        type: (a.agenda_type as AgendaItem['type']) ?? 'other',
                        durationMinutes: a.duration_minutes as number | undefined,
                        track: a.track as string | undefined,
                        speakers,
                        speaker: speakers[0]
                    } as AgendaItem;
                })
                : [];
            

            const dailySchedule = (data as Record<string, unknown>).daily_schedule;
            const parsedFromJson: AgendaItem[] = (() => {
                if (!dailySchedule || typeof dailySchedule !== 'object') return [];
                try {
                    const scheduleData = dailySchedule as { agenda?: unknown[] };
                    const raw = Array.isArray(scheduleData.agenda) ? scheduleData.agenda : [];
                    return raw.map((it: unknown) => {
                        const item = it as Record<string, unknown>;
                        return {
                        id: (item.id as string) || `agenda-${Math.random()}`,
                        dayNumber: (item.dayNumber as number) ?? (item.day_number as number) ?? 1,
                        startTime: (item.startTime as string) ?? (item.start_time as string),
                        endTime: (item.endTime as string) ?? (item.end_time as string),
                        title: item.title as string,
                        description: (item.description as string) || undefined,
                        location: (item.location as string) || undefined,
                        type: (item.type as AgendaItem['type']) ?? (item.agenda_type as AgendaItem['type']) ?? 'other',
                        durationMinutes: (item.durationMinutes as number) ?? (item.duration_minutes as number) ?? undefined,
                        track: (item.track as string) || undefined,
                        };
                    });
                } catch (e) {
                    console.warn('Failed to parse daily_schedule JSON:', e);
                    return [];
                }
            })();

            const agenda: AgendaItem[] = parsedFromTable.length > 0 ? parsedFromTable : parsedFromJson;
            

            return { ...enrichedEvent, agenda };
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : typeof error === 'string'
                    ? error
                    : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;

            if (process.env.NODE_ENV !== 'production') {
                console.warn('getEventWithAgenda failed; falling back…', { message, stack });
            }
            Sentry.captureException(error, {
                extra: { function: 'getEventWithAgenda', eventId, message, stack }
            });
            throw new Error(`Failed to fetch event with agenda for ID: ${eventId}. ${message}`);
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
                    event_agenda!left (
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
                        agenda_speakers!left (
                            sort_order,
                            speakers!inner (
                                id, name, title, company, bio, linkedin_url, twitter_url, website_url, photo_url
                            )
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

                // Prefer event_agenda rows; fallback to daily_schedule JSON
                const fromTable: AgendaItem[] = Array.isArray((item as unknown as { event_agenda?: unknown[] }).event_agenda)
                    ? ((item as unknown as { event_agenda: unknown[] }).event_agenda as Array<{
                        id: string;
                        day_number: number;
                        start_time: string;
                        end_time: string;
                        title: string;
                        description?: string;
                        location?: string;
                        agenda_type: string;
                        duration_minutes?: number;
                        track?: string;
                        sort_order?: number;
                        event_agenda_speakers?: Array<{
                            speakers?: {
                                id: string;
                                name: string;
                                title?: string;
                                company?: string;
                                bio?: string;
                                photo_url?: string;
                                linkedin_url?: string;
                                twitter_url?: string;
                                website_url?: string;
                            };
                        }>;
                    }>).map(a => {
                        const speakers = Array.isArray(a.event_agenda_speakers)
                            ? a.event_agenda_speakers
                                .map((eas: { speakers?: unknown }) => eas?.speakers)
                                .filter((sp): sp is {
                                    id: string;
                                    name: string;
                                    title?: string;
                                    company?: string;
                                    bio?: string;
                                    photo_url?: string;
                                    linkedin_url?: string;
                                    twitter_url?: string;
                                    website_url?: string;
                                } => Boolean(sp))
                                .map((sp) => ({
                                    id: String(sp.id),
                                    name: sp.name as string,
                                    title: (sp.title as string) ?? undefined,
                                    company: (sp.company as string) ?? undefined,
                                    bio: (sp.bio as string) ?? undefined,
                                    photoUrl: (sp.photo_url as string) ?? undefined,
                                    socialLinks: {
                                        linkedin: (sp.linkedin_url as string) ?? undefined,
                                        twitter: (sp.twitter_url as string) ?? undefined,
                                        website: (sp.website_url as string) ?? undefined
                                    }
                                }))
                            : [];

                        return {
                            id: a.id as string,
                            dayNumber: (a.day_number as number) ?? 1,
                            startTime: a.start_time as string,
                            endTime: a.end_time as string,
                            title: a.title as string,
                            description: a.description as string | undefined,
                            location: a.location as string | undefined,
                            type: (a.agenda_type as AgendaItem['type']) ?? 'other',
                            durationMinutes: a.duration_minutes as number | undefined,
                            track: a.track as string | undefined,
                            speakers,
                            speaker: speakers[0]
                        } as AgendaItem;
                    })
                    : [];

                const dailySchedule = (item as Record<string, unknown>).daily_schedule;
                const fromJson: AgendaItem[] = (() => {
                    if (!dailySchedule || typeof dailySchedule !== 'object') return [];
                    try {
                        const scheduleData = dailySchedule as { agenda?: unknown[] };
                        const raw = Array.isArray(scheduleData.agenda) ? scheduleData.agenda : [];
                        return raw.map((it: unknown) => {
                            const item = it as Record<string, unknown>;
                            return {
                            id: (item.id as string) || `agenda-${Math.random()}`,
                            dayNumber: (item.dayNumber as number) ?? (item.day_number as number) ?? 1,
                            startTime: (item.startTime as string) ?? (item.start_time as string),
                            endTime: (item.endTime as string) ?? (item.end_time as string),
                            title: item.title as string,
                            description: (item.description as string) || undefined,
                            location: (item.location as string) || undefined,
                            type: (item.type as AgendaItem['type']) ?? (item.agenda_type as AgendaItem['type']) ?? 'other',
                            durationMinutes: (item.durationMinutes as number) ?? (item.duration_minutes as number) ?? undefined,
                            track: (item.track as string) || undefined,
                            speakers: Array.isArray(item.speakers) ? (item.speakers as unknown[]).map((sp: unknown) => {
                                const speaker = sp as Record<string, unknown>;
                                return {
                                id: String(speaker.id),
                                name: speaker.name as string,
                                title: (speaker.title as string) ?? undefined,
                                company: (speaker.company as string) ?? undefined,
                                bio: (speaker.bio as string) ?? undefined,
                                photoUrl: (speaker.photoUrl as string) ?? undefined,
                    socialLinks: {
                                    linkedin: ((speaker.socialLinks as Record<string, unknown>)?.linkedin as string) ?? undefined,
                                    twitter: ((speaker.socialLinks as Record<string, unknown>)?.twitter as string) ?? undefined,
                                    website: ((speaker.socialLinks as Record<string, unknown>)?.website as string) ?? undefined,
                                }
                            };
                        }) : undefined,
                            speaker: Array.isArray(item.speakers) && item.speakers.length ? {
                                id: String(((item.speakers as unknown[])[0] as Record<string, unknown>)?.id),
                                name: ((item.speakers as unknown[])[0] as Record<string, unknown>)?.name as string,
                                title: ((item.speakers as unknown[])[0] as Record<string, unknown>)?.title as string ?? undefined,
                                company: ((item.speakers as unknown[])[0] as Record<string, unknown>)?.company as string ?? undefined,
                                bio: ((item.speakers as unknown[])[0] as Record<string, unknown>)?.bio as string ?? undefined,
                                photoUrl: ((item.speakers as unknown[])[0] as Record<string, unknown>)?.photoUrl as string ?? undefined,
                                socialLinks: ((item.speakers as unknown[])[0] as Record<string, unknown>)?.socialLinks as Record<string, unknown> ?? undefined
                            } : undefined,
                        };
                        });
                    } catch (e) {
                        console.warn('Failed to parse daily_schedule JSON:', e);
                        return [];
                    }
                })();

                const agenda = fromTable.length > 0 ? fromTable : fromJson;
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
                    organizer:organizers (id, name, logo_url)
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

                // Add agenda data from daily_schedule JSON field
                const dailySchedule = (item as Record<string, unknown>).daily_schedule;
                const agenda: AgendaItem[] = [];
                
                if (dailySchedule && typeof dailySchedule === 'object') {
                    try {
                        const scheduleData = dailySchedule as Record<string, unknown>;
                        if (scheduleData.agenda && Array.isArray(scheduleData.agenda)) {
                            agenda.push(...scheduleData.agenda.map((agendaItem: Record<string, unknown>) => ({
                                id: agendaItem.id as string || `agenda-${Math.random()}`,
                                dayNumber: agendaItem.dayNumber as number || 1,
                                startTime: agendaItem.startTime as string,
                                endTime: agendaItem.endTime as string,
                    title: agendaItem.title as string,
                    description: agendaItem.description as string | undefined,
                    location: agendaItem.location as string | undefined,
                                type: agendaItem.type as 'keynote' | 'session' | 'break' | 'networking' | 'workshop' | 'panel' | 'registration' | 'certification' | 'support' | 'exhibition' | 'meal' | 'entertainment' | 'other',
                                durationMinutes: agendaItem.durationMinutes as number | undefined,
                    track: agendaItem.track as string | undefined,
                                speaker: undefined
                            })));
                        }
                    } catch (error) {
                        console.warn('Failed to parse daily_schedule JSON:', error);
                    }
                }

                // Process multi-day information (same logic as getEventsWithMultiDaySupport)
                const multiDayEvent = enhancedEventTransformer.toApp(typedItem);
                
                return { ...multiDayEvent, agenda };
            });

            return events;
        } catch (error) {
            // Improve diagnostics without noisy `{}` logs
            const message = error instanceof Error
                ? error.message
                : typeof error === 'string'
                    ? error
                    : 'Unknown error';
            const stack = error instanceof Error ? error.stack : undefined;

            // Only warn in non-production; page.tsx already implements graceful fallbacks
            if (process.env.NODE_ENV !== 'production') {
                console.warn('getEventsWithAgendaAndMultiDaySupport failed; falling back…', { message, stack });
            }

            Sentry.captureException(error, {
                extra: { function: 'getEventsWithAgendaAndMultiDaySupport', filters, message, stack }
            });
            throw new Error(message || 'Failed to fetch events with agenda and multi-day support.');
        }
    }

    /**
     * Apply enhanced database-level filters to the query
     */
    private static applyEnhancedFilters(
        query: EventQueryBuilder, 
        filters: EventFilters
    ): EventQueryBuilder {
        // Format filtering (virtual, in-person, hybrid) - using event_format column
        if (filters.format && filters.format !== 'all') {
            switch (filters.format) {
                case 'virtual':
                    query = query.or('event_format.eq.Remote,livestream_url.is.not.null').and('venue_id.is.null');
                    break;
                case 'in-person':
                    query = query.or('event_format.eq.In-person,venue_id.is.not.null').and('livestream_url.is.null');
                    break;
                case 'hybrid':
                    query = query.and('livestream_url.is.not.null,venue_id.is.not.null');
                    break;
            }
        }

        // Budget tiering (new) - using price_min; treat NULL as free only for 'free-only'
        // Gate to USD until currency conversion exists
        if (filters.budget && filters.budget !== 'all') {
            query = query.eq('currency', 'USD');

            switch (filters.budget) {
                case 'free-only':
                    query = query.or('price_min.is.null,price_min.eq.0');
                    break;
                case 'low':
                    query = query.and('price_min.is.not.null').lte('price_min', 100);
                    break;
                case 'moderate':
                    query = query.and('price_min.is.not.null').lte('price_min', 500);
                    break;
                case 'high':
                    query = query.and('price_min.is.not.null').lte('price_min', 2000);
                    break;
                case 'unlimited':
                default:
                    break;
            }
        }

        // Cost filtering (legacy free/paid) - using price_min
        if (filters.cost && filters.cost !== 'all') {
            switch (filters.cost) {
                case 'free':
                    query = query.or('price_min.is.null,price_min.eq.0');
                    break;
                case 'paid':
                    query = query.and('price_min.is.not.null,price_min.gt.0');
                    break;
            }
        }

        // Difficulty filtering (using difficulty_level field and title keywords)
        if (filters.difficulty && filters.difficulty !== 'all') {
            switch (filters.difficulty) {
                case 'beginner':
                    query = query.or('difficulty_level.eq.Beginner,title.ilike.%beginner%,title.ilike.%intro%,title.ilike.%101%');
                    break;
                case 'intermediate':
                    query = query.or('difficulty_level.eq.Intermediate,title.ilike.%intermediate%,title.ilike.%advanced%,description.ilike.%experience required%');
                    break;
                case 'advanced':
                    query = query.or('difficulty_level.eq.Advanced,title.ilike.%advanced%,title.ilike.%expert%,title.ilike.%senior%');
                    break;
            }
        }

        // Duration filtering
        if (filters.duration && filters.duration !== 'all') {
            switch (filters.duration) {
                case 'short':
                    query = query.and('is_multi_day.eq.false').filter('end_time', 'lte', 'start_time + interval \'2 hours\'');
                    break;
                case 'medium':
                    query = query.and('is_multi_day.eq.false').filter('end_time', 'lte', 'start_time + interval \'6 hours\'');
                    break;
                case 'long':
                    query = query.and('is_multi_day.eq.false').filter('end_time', 'gt', 'start_time + interval \'6 hours\'');
                    break;
                case 'multi-day':
                    query = query.eq('is_multi_day', true);
                    break;
            }
        }

        // Popularity filtering (based on attendee count and other factors)
        if (filters.popularity && filters.popularity !== 'all') {
            switch (filters.popularity) {
                case 'trending':
                    // High attendee count OR recently created with registration
                    query = query.or('attendee_count.gt.500,registration_url.is.not.null,created_at.gte.now() - interval \'7 days\'');
                    break;
                case 'high-attendance':
                    query = query.gt('attendee_count', 100);
                    break;
                case 'niche':
                    query = query.lte('attendee_count', 100);
                    break;
            }
        }

        // Network potential filtering
        if (filters.myNetwork) {
            query = query.or(
                'event_type_id.ilike.%networking%,event_type_id.ilike.%meetup%,attendee_count.gt.500,event_type_id.ilike.%conference%,event_type_id.ilike.%summit%'
            );
        }

        // Note: Recommended filtering removed - now handled client-side via careerImpact.overall scores
        // The p_recommended parameter is still passed to RPC for future server-side implementation

        return query;
    }



    /**
     * Apply sorting to the query
     */
    private static applySorting(
        query: EventQueryBuilder, 
        sortBy?: string
    ): EventQueryBuilder {
        switch (sortBy) {
            case 'popularity':
                return query.order('attendee_count', { ascending: false, nullsLast: true })
                           .order('start_time', { ascending: true });
            case 'career-impact':
                // For now, sort by attendee count as a proxy for career impact
                // This can be enhanced when career impact scores are available
                return query.order('attendee_count', { ascending: false, nullsLast: true })
                           .order('start_time', { ascending: true });
            case 'date':
            default:
                return query.order('start_time', { ascending: true });
        }
    }

    /**
     * Get events using Supabase RPC function for complex filtering
     * This method uses the filter_events PostgreSQL function for optimal performance
     * Note: RPC function needs to be created in Supabase first
     */
    static async getEventsWithRPC(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100
    ): Promise<{ events: Event[]; totalCount: number }> {
        try {
            const { data, error } = await (supabaseClient as any).rpc('filter_events', { // eslint-disable-line @typescript-eslint/no-explicit-any
                p_search_term: filters.searchTerm || null,
                p_categories: filters.categories || null,
                p_start_date: filters.startDate?.toISOString() || null,
                p_end_date: filters.endDate?.toISOString() || null,
                p_event_format: filters.format || 'all',
                p_budget: filters.budget || 'all',
                p_currency: filters.budget && filters.budget !== 'all' ? 'USD' : null, // USD gate for budget filtering
                p_cost: filters.cost || 'all',
                p_popularity: filters.popularity || 'all',
                p_duration: filters.duration || 'all',
                p_my_network: filters.myNetwork || false,
                p_recommended: filters.recommended || false,
                p_page_num: page,
                p_page_size: pageSize,
                p_sort_by: filters.sortBy || 'date'
            });

            if (error) {
                console.error('RPC filter_events error:', error);
                // Fallback to regular filtering if RPC fails
                const events = await this.getEvents(filters, supabaseClient, page, pageSize);
                const totalCount = await this.getEventCount(filters, supabaseClient);
                return { events, totalCount };
            }

            if (!data || !Array.isArray(data) || data.length === 0) {
                return { events: [], totalCount: 0 };
            }

            const totalCount = (data[0] as any)?.total_count || 0; // eslint-disable-line @typescript-eslint/no-explicit-any

            // Hydrate full event objects using events_detailed for consistency
            const ids = (data as any[]).map(r => r.id).filter(Boolean); // eslint-disable-line @typescript-eslint/no-explicit-any
            const events = ids.length ? await this.getEventsByIds(ids, supabaseClient) : [];
            if (events.length && ids.length) {
                const order = new Map<string, number>();
                ids.forEach((id, idx) => order.set(id, idx));
                events.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
            }

            return { events, totalCount };
        } catch (error) {
            console.error('Error in getEventsWithRPC:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsWithRPC', filters }
            });
            throw new Error('Failed to fetch events with RPC filtering.');
        }
    }

    /**
     * Get tag-based recommended events for a user
     */
    static async getRecommendedEventsByTags(
        userId: string,
        careerProfile: CareerProfile,
        supabaseClient: SupabaseClientType,
        limit: number = 10
    ): Promise<Event[]> {
        try {
            const recommendations = await TagBasedMatchingService.getRecommendedEventsByTags(
                userId,
                careerProfile,
                supabaseClient,
                limit
            );

            return recommendations.map((recommendation, index) => {
                const appEvent = eventTransformer.toApp(recommendation.event);
                return {
                    ...appEvent,
                    recommendationMetadata: {
                        matchedTags: recommendation.match.matchedTags,
                        matchExplanation: recommendation.match.explanation,
                        matchScore: recommendation.match.score,
                        impactScore: recommendation.impactScore,
                        profileBoost: recommendation.profileBoost,
                        recencyBoost: recommendation.recencyBoost,
                        popularityBoost: recommendation.popularityBoost,
                        totalScore: recommendation.totalScore,
                        reasons: recommendation.reasons,
                        tagRank: index + 1
                    }
                } as Event & { recommendationMetadata: Record<string, unknown> };
            });
        } catch (error) {
            console.error('Error fetching tag-based recommendations:', error);
            Sentry.captureException(error, {
                extra: { function: 'getRecommendedEventsByTags', userId }
            });
            return [];
        }
    }

    /**
     * Get events with tag-based career impact scores
     */
    static async getEventsWithTagBasedImpact(
        events: Event[],
        careerProfile: CareerProfile
    ): Promise<(Event & { tagBasedImpactScore: number })[]> {
        return events.map(event => ({
            ...event,
            tagBasedImpactScore: TagBasedMatchingService.calculateTagBasedCareerImpact(
                event,
                careerProfile
            )
        }));
    }

    /**
     * Search events by tags
     */
    static async searchEventsByTags(
        tagNames: string[],
        supabaseClient: SupabaseClientType,
        limit: number = 50
    ): Promise<Event[]> {
        try {
            const { data: events, error } = await supabaseClient
                .from('events')
                .select(`
                    *,
                    event_type:event_type_id (*),
                    organizer:organizers (*),
                    tags:event_tag_relations (
                        event_tags (event_tag, category, color)
                    )
                `)
                .in('tags.event_tags.event_tag', tagNames)
                .eq('status', 'confirmed')
                .gte('start_time', new Date().toISOString())
                .order('start_time', { ascending: true })
                .limit(limit);

            if (error) throw error;

            // Transform and attach tags
            const transformedEvents = await this.attachTagsToEvents(events || [], supabaseClient);
            return transformedEvents.map(event => eventTransformer.toApp(event));

        } catch (error) {
            console.error('Error searching events by tags:', error);
            Sentry.captureException(error, {
                extra: { function: 'searchEventsByTags', tagNames }
            });
            return [];
        }
    }

    /**
     * Get events with cold start handling for new users
     * 
     * @param filters - Event filters
     * @param supabaseClient - Supabase client
     * @param careerProfile - User's career profile
     * @param userId - User ID
     * @param page - Page number
     * @param pageSize - Page size
     * @returns Events with cold start recommendations if applicable
     */
    static async getEventsWithColdStartHandling(
        filters: EventFilters = {},
        supabaseClient: SupabaseClientType,
        careerProfile: CareerProfile | null,
        userId?: string,
        page: number = 1,
        pageSize: number = 100,
        telemetry?: RecommendationTelemetryContext
    ): Promise<{ events: Event[]; totalCount: number; isColdStart: boolean }> {
        try {
            // Validate inputs
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 1000) pageSize = 100;
            
            // Check if user is in cold start state
            const isColdStart = userId ? await LookalikeUserService.isColdStartUser(userId, supabaseClient) : false;
            
            if (isColdStart && careerProfile && !filters.searchTerm && !filters.categories?.length) {
                // Use lookalike recommendations for cold start users
                return await this.getColdStartRecommendations(
                    careerProfile,
                    supabaseClient,
                    page,
                    pageSize,
                    telemetry
                );
            }

            // Use multi-day aware filtering for users with interaction history or specific filters
            const events = await this.getEventsWithMultiDay(filters, supabaseClient, page, pageSize);
            const totalCount = await this.getEventCount(filters, supabaseClient);

            if (telemetry?.hasConsent && telemetry.userId) {
                const topEventIds = events.slice(0, 5)
                    .map((event) => ('id' in event ? event.id : undefined))
                    .filter((id): id is string => Boolean(id));

                await logTelemetryEvent(supabaseClient, {
                    eventType: 'standard_filtered_events_generated',
                    eventVersion: 1,
                    source: telemetry.source ?? 'backend',
                    userId: telemetry.userId,
                    sessionId: telemetry.sessionId ?? null,
                    requestId: telemetry.requestId ?? null,
                    occurredAt: new Date(),
                    context: {
                        surface: telemetry.surface ?? 'filtered_events',
                        ...telemetry.additionalContext
                    },
                    metadata: {
                        returnedCount: events.length,
                        totalCount,
                        page,
                        pageSize,
                        activeFilters: Object.entries(filters).filter(([, value]) => {
                            if (value === undefined || value === null) return false;
                            if (Array.isArray(value)) return value.length > 0;
                            if (value instanceof Date) return true;
                            if (typeof value === 'object') {
                                const obj = value as Record<string, unknown>;
                                return Object.values(obj).some((entry) => entry !== undefined && entry !== null);
                            }
                            if (typeof value === 'boolean') return value;
                            if (typeof value === 'string') return value.length > 0;
                            return true;
                        }).length,
                        topEventIds
                    }
                });
            }

            return {
                events: events as Event[],
                totalCount,
                isColdStart: false
            };
        } catch (error) {
            console.error('Error in getEventsWithColdStartHandling:', error);
            Sentry.captureException(error, {
                extra: { function: 'getEventsWithColdStartHandling', filters, userId }
            });
            
            // Fallback to normal filtering with error recovery
            try {
                const events = await this.getEventsWithMultiDay(filters, supabaseClient, page, pageSize);
                const totalCount = await this.getEventCount(filters, supabaseClient);

                return {
                    events: events as Event[],
                    totalCount,
                    isColdStart: false
                };
            } catch (fallbackError) {
                console.error('Fallback filtering also failed:', fallbackError);
                return {
                    events: [],
                    totalCount: 0,
                    isColdStart: false
                };
            }
        }
    }

    /**
     * Get cold start recommendations using lookalike users
     */
    private static async getColdStartRecommendations(
        careerProfile: CareerProfile,
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100,
        telemetry?: RecommendationTelemetryContext
    ): Promise<{ events: Event[]; totalCount: number; isColdStart: boolean }> {
        try {
            // Get lookalike recommendations directly
            const lookalikeRecommendations = await LookalikeUserService.getLookalikeRecommendations(
                careerProfile.userId,
                supabaseClient,
                pageSize * 2, // Get more to account for filtering
                telemetry
            );

            if (lookalikeRecommendations.length === 0) {
                const fallbackTelemetry = telemetry
                    ? ({
                        ...telemetry,
                        additionalContext: {
                            ...(telemetry.additionalContext || {}),
                            reason: 'lookalike_empty'
                        }
                    } as RecommendationTelemetryContext)
                    : undefined;

                return await this.getFallbackPopularEvents(supabaseClient, page, pageSize, fallbackTelemetry);
            }

            // LookalikeRecommendations already have metadata attached, just need to attach tags
            const appEvents = await this.transformEventsWithLookalikeMetadata(lookalikeRecommendations as any[], lookalikeRecommendations as any[], supabaseClient); // eslint-disable-line @typescript-eslint/no-explicit-any

            // Sort by popularity score and apply diversity enhancement
            const sortedEvents = this.sortEventsByPopularity(appEvents);
            const diverseEvents = this.applyDiversityEnhancement(sortedEvents, pageSize * 2);
            const paginatedEvents = this.paginateEvents(diverseEvents, page, pageSize);

            if (telemetry?.hasConsent && telemetry.userId) {
                await logTelemetryEvent(supabaseClient, {
                    eventType: 'cold_start_recommendations_generated',
                    eventVersion: 1,
                    source: telemetry.source ?? 'backend',
                    userId: telemetry.userId,
                    sessionId: telemetry.sessionId ?? null,
                    requestId: telemetry.requestId ?? null,
                    occurredAt: new Date(),
                    context: {
                        surface: telemetry.surface ?? 'cold_start',
                        ...telemetry.additionalContext
                    },
                    metadata: {
                        requestedPageSize: pageSize,
                        returnedCount: paginatedEvents.length,
                        totalCandidates: sortedEvents.length,
                        page,
                        topEventIds: paginatedEvents.slice(0, 5).map(event => event.id)
                    }
                });
            }

            return {
                events: paginatedEvents,
                totalCount: sortedEvents.length,
                isColdStart: true
            };
        } catch (error) {
            console.error('Error getting cold start recommendations:', error);
            Sentry.captureException(error, {
                extra: { function: 'getColdStartRecommendations', userId: careerProfile.userId }
            });
            
            const fallbackTelemetry = telemetry
                ? ({
                    ...telemetry,
                    additionalContext: {
                        ...(telemetry.additionalContext || {}),
                        reason: 'cold_start_exception'
                    }
                } as RecommendationTelemetryContext)
                : undefined;

            return await this.getFallbackPopularEvents(supabaseClient, page, pageSize, fallbackTelemetry);
        }
    }

    /**
     * Get fallback popular events when lookalike system fails
     */
    private static async getFallbackPopularEvents(
        supabaseClient: SupabaseClientType,
        page: number = 1,
        pageSize: number = 100,
        telemetry?: RecommendationTelemetryContext
    ): Promise<{ events: Event[]; totalCount: number; isColdStart: boolean }> {
        try {
            const { data: events, error } = await (supabaseClient as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .from('events_detailed')
                .select('*')
                .gte('start_time', new Date().toISOString())
                .order('attendee_count', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;

            const transformedEvents = await this.attachTagsToEvents(events || [], supabaseClient);
            const appEvents = transformedEvents.map(event => eventTransformer.toApp(event as any)); // eslint-disable-line @typescript-eslint/no-explicit-any

            if (telemetry?.hasConsent && telemetry.userId) {
                const topEventIds = appEvents.slice(0, 5).map(event => event.id);

                await logTelemetryEvent(supabaseClient, {
                    eventType: 'cold_start_popular_fallback_generated',
                    eventVersion: 1,
                    source: telemetry.source ?? 'backend',
                    userId: telemetry.userId,
                    sessionId: telemetry.sessionId ?? null,
                    requestId: telemetry.requestId ?? null,
                    occurredAt: new Date(),
                    context: {
                        surface: telemetry.surface ?? 'cold_start',
                        ...telemetry.additionalContext
                    },
                    metadata: {
                        returnedCount: appEvents.length,
                        page,
                        pageSize,
                        topEventIds
                    }
                });
            }

            return {
                events: appEvents,
                totalCount: appEvents.length,
                isColdStart: true
            };
        } catch (error) {
            console.error('Error getting fallback popular events:', error);
            return {
                events: [],
                totalCount: 0,
                isColdStart: true
            };
        }
    }


    /**
     * Transform events with lookalike metadata (DRY helper)
     */
    private static async transformEventsWithLookalikeMetadata(
        events: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
        lookalikeRecommendations: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
        supabaseClient: SupabaseClientType
    ): Promise<Event[]> {
        // Attach tags to events
        const transformedEvents = await this.attachTagsToEvents(events, supabaseClient);
        
        return transformedEvents.map(event => {
            const appEvent = eventTransformer.toApp(event as any); // eslint-disable-line @typescript-eslint/no-explicit-any
            
            // Find matching recommendation - LookalikeUserService already adds recommendationMetadata
            const recommendation = lookalikeRecommendations.find(rec => rec.id === event.id);
            
            if (recommendation && 'recommendationMetadata' in recommendation) {
                // Preserve the original recommendationMetadata (includes tagScore, careerImpactScore, etc.)
                const metadata = recommendation.recommendationMetadata;
                
                // Copy all original metadata
                if (metadata) {
                    (appEvent as any).recommendationMetadata = metadata; // eslint-disable-line @typescript-eslint/no-explicit-any
                }
                
                // Add coldStartMetadata for backward compatibility with sorting logic
                // Use the actual cohort size from metadata if available
                const cohortSize = metadata.lookalikeCohortSize || 0;
                (appEvent as any).coldStartMetadata = { // eslint-disable-line @typescript-eslint/no-explicit-any
                    reason: cohortSize > 0 ? `Recommended by ${cohortSize} similar professionals` : 'Matched via lookalike recommendations',
                    popularityScore: metadata.lookalikeTagScore || 0,
                    lookalikeUsers: cohortSize
                };
            }
            
            return appEvent;
        });
    }

    /**
     * Sort events by popularity score (DRY helper)
     */
    private static sortEventsByPopularity(events: Event[]): Event[] {
        return events.sort((a, b) => {
            const aScore = (a as any).coldStartMetadata?.popularityScore || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
            const bScore = (b as any).coldStartMetadata?.popularityScore || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
            return bScore - aScore;
        });
    }

    /**
     * Paginate events (DRY helper)
     */
    private static paginateEvents(events: Event[], page: number, pageSize: number): Event[] {
        const startIndex = (page - 1) * pageSize;
        return events.slice(startIndex, startIndex + pageSize);
    }

    /**
     * Enrich events with career impact scores and diversity enhancement
     * 
     * @param events - Events to enrich
     * @param careerProfile - User's career profile
     * @param supabaseClient - Supabase client
     * @param userId - User ID for behavioral context
     * @param applyDiversityEnhancement - Whether to apply diversity enhancement
     * @returns Events with career impact scores and diversity enhancement
     */
    static async enrichEventsWithCareerImpact(
        events: Event[],
        careerProfile: CareerProfile | null,
        supabaseClient: SupabaseClientType,
        userId?: string,
        applyDiversityEnhancement: boolean = true
    ): Promise<Event[]> {
        if (!careerProfile || events.length === 0) {
            return events;
        }

        try {
            // Use new alignment-core-based enrichment (DRY, consistent scoring)
            const enrichedEvents = await enrichEventsWithNewScoring(
                events,
                careerProfile,
                supabaseClient,
                userId
            );

            // Apply diversity enhancement if requested and we have enough events
            if (applyDiversityEnhancement && enrichedEvents.length >= DIVERSITY_CONFIG.MIN_EVENTS_FOR_DIVERSITY) {
                const diversityResult = DiversityEnhancementService.enhanceRecommendations(enrichedEvents);
                return diversityResult.enhancedRanking;
            }

            return enrichedEvents;
        } catch (error) {
            console.error('Error enriching events with career impact:', error);
            Sentry.captureException(error, {
                extra: { function: 'enrichEventsWithCareerImpact', eventCount: events.length }
            });
            return events; // Return original events if enrichment fails
        }
    }

    /**
     * Apply diversity enhancement to events (standalone method)
     * 
     * @param events - Events to enhance
     * @param maxResults - Maximum number of results to enhance
     * @returns Events with diversity enhancement applied
     */
    static applyDiversityEnhancement(
        events: Event[],
        maxResults: number = 20
    ): Event[] {
        try {
            if (events.length <= 1) {
                return events;
            }

            const diversityResult = DiversityEnhancementService.enhanceRecommendations(events, maxResults);
            return diversityResult.enhancedRanking;
        } catch (error) {
            console.error('Error applying diversity enhancement:', error);
            Sentry.captureException(error, {
                extra: { function: 'applyDiversityEnhancement', eventCount: events.length }
            });
            return events; // Return original events if enhancement fails
        }
    }
}
