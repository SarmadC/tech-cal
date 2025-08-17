import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
// 1. UPDATE IMPORTS: Use the new, specific type names.
import type {
    EventStatus,
    TrackedEventRecord, // Replaces AppTrackedEvent
    SupabaseTrackedEventWithDetails,
} from '@/types';
import { trackedEventTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

type SupabaseClientType = SupabaseClient<Database>;

export class UserEventService {
    /**
     * Track an event or update its status. Throws on failure.
     */
    static async trackEvent(
        userId: string,
        eventId: string,
        status: EventStatus,
        notes: string | undefined,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const { data: existing } = await supabaseClient
                .from('user_events')
                .select('id, status')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            if (existing) {
                const { error } = await supabaseClient
                    .from('user_events')
                    .update({ status, notes, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient
                    .from('user_events')
                    .insert({ user_id: userId, event_id: eventId, status, notes });
                if (error) throw error;
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            Sentry.captureException(error, { extra: { function: 'trackEvent', userId, eventId, status } });
            throw new Error('Failed to track event.');
        }
    }

    static async getAllTrackedEventIds(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<string[]> {
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select('event_id')
                .eq('user_id', userId);

            if (error) throw error;

            return (data || []).map(item => item.event_id);
        } catch (error) {
            console.error('Error fetching all tracked event IDs:', error);
            Sentry.captureException(error, { extra: { function: 'getAllTrackedEventIds', userId } });
            throw new Error('Failed to fetch tracked event IDs.');
        }
    }

    /**
     * Gets all tracked events for a user with a lightweight version of the event data.
     * Optimized for dashboard calculations. Throws on failure.
     */
    // 2. UPDATE SIGNATURE: The function now returns a promise of `TrackedEventRecord[]`.
    static async getLightweightTrackedEvents(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<TrackedEventRecord[]> {
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select(`
                    id, user_id, event_id, status, notes, created_at,
                    events (
                        id,
                        title,
                        start_time,
                        organizer_id,
                        event_type_id,
                        organizers ( name ) 
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // 3. UPDATE MAPPING: The returned object now perfectly matches the `TrackedEventRecord` type.
            return (data || []).map((item): TrackedEventRecord => {
                const partialEvent = item.events as {
                    id: string;
                    title: string;
                    start_time: string;
                    event_type_id: string;
                    organizers: { name: string } | null;
                } | null;

                return {
                    trackingId: item.id,
                    userId: item.user_id,
                    eventId: item.event_id,
                    status: item.status as EventStatus,
                    notes: item.notes,
                    trackedAt: item.created_at || new Date().toISOString(),
                    event: partialEvent ? {
                        id: partialEvent.id,
                        title: partialEvent.title,
                        startTime: partialEvent.start_time,
                        eventTypeId: partialEvent.event_type_id,
                        organizer: partialEvent.organizers?.name || 'Unknown',
                        createdAt: '',
                        description: '',
                        endTime: null,
                        location: '',
                        status: 'confirmed',
                        sourceUrl: '',
                        livestreamUrl: null,
                    } : null
                };
            });
        } catch (error) {
            console.error('Error fetching lightweight tracked events:', error);
            Sentry.captureException(error, { extra: { function: 'getLightweightTrackedEvents', userId } });
            throw new Error('Failed to fetch dashboard event data.');
        }
    }

    /**
     * Untrack an event for a user. Throws on failure.
     */
    static async untrackEvent(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const { error } = await supabaseClient
                .from('user_events')
                .delete()
                .eq('user_id', userId)
                .eq('event_id', eventId);
            if (error) throw error;
        } catch (error) {
            console.error('Error untracking event:', error);
            Sentry.captureException(error, { extra: { function: 'untrackEvent', userId, eventId } });
            throw new Error('Failed to untrack event.');
        }
    }

    /**
     * Get a user's tracked events with pagination. Throws on failure.
     */
    // 4. UPDATE SIGNATURE: The function now returns a promise of `TrackedEventRecord[]`.
    static async getTrackedEvents(
        userId: string,
        supabaseClient: SupabaseClientType,
        page?: number,
        pageSize?: number
    ): Promise<TrackedEventRecord[]> {
        try {
            let query = supabaseClient
                .from('user_events')
                .select(`*, events (*, event_type:event_type_id (*), organizer:organizers (id, name))`)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (page && pageSize) {
                const from = (page - 1) * pageSize;
                const to = from + pageSize - 1;
                query = query.range(from, to);
            }

            const { data, error } = await query;
            if (error) throw error;

            // This works because we already updated `trackedEventTransformer` to return `TrackedEventRecord`.
            return (data as SupabaseTrackedEventWithDetails[] || []).map(trackedEventTransformer.toApp);
        } catch (error) {
            console.error('Error fetching tracked events:', error);
            Sentry.captureException(error, { extra: { function: 'getTrackedEvents', userId } });
            throw new Error('Failed to fetch tracked events.');
        }
    }

    /**
     * Check if an event is tracked by a user. Throws on failure.
     */
    static async isEventTracked(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<{ isTracked: boolean; status?: EventStatus }> {
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select('status')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return { isTracked: !!data, status: data?.status as EventStatus | undefined };
        } catch (error) {
            console.error('Error checking event tracking status:', error);
            Sentry.captureException(error, { extra: { function: 'isEventTracked', userId, eventId } });
            throw new Error('Failed to check tracking status.');
        }
    }

    /**
     * Bulk track multiple events. Throws on failure.
     */
    static async bulkTrackEvents(
        userId: string,
        eventIds: string[],
        status: EventStatus,
        supabaseClient: SupabaseClientType
    ): Promise<{ tracked: number; skipped: number }> {
        try {
            const { data: existing, error: fetchError } = await supabaseClient
                .from('user_events')
                .select('event_id')
                .eq('user_id', userId)
                .in('event_id', eventIds);

            if (fetchError) throw fetchError;

            const existingEventIds = new Set(existing?.map(e => e.event_id) || []);
            const newEventIds = eventIds.filter(id => !existingEventIds.has(id));

            if (newEventIds.length === 0) {
                return { tracked: 0, skipped: eventIds.length };
            }

            const insertData = newEventIds.map(eventId => ({ user_id: userId, event_id: eventId, status }));
            const { error: insertError } = await supabaseClient.from('user_events').insert(insertData);
            if (insertError) throw insertError;

            return { tracked: newEventIds.length, skipped: existingEventIds.size };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            Sentry.captureException(error, { extra: { function: 'bulkTrackEvents', userId, eventIdsCount: eventIds.length, status } });
            throw new Error('Failed to track events in bulk.');
        }
    }
}