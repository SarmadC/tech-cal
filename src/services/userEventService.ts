import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type {
    EventStatus,
    AppTrackedEvent,
    SupabaseTrackedEventWithDetails,
} from '@/types'; // ApiResponse removed
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
    ): Promise<void> { // Return type is now Promise<void>
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

    /**
     * Untrack an event for a user. Throws on failure.
     */
    static async untrackEvent(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<void> { // Return type is now Promise<void>
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
     * Get a user's tracked events. Throws on failure.
     */
    static async getTrackedEvents(
        userId: string,
        supabaseClient: SupabaseClientType
    ): Promise<AppTrackedEvent[]> { // Return type is now Promise<AppTrackedEvent[]>
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select(`*, events (*, event_type:event_type_id (*), organizer:organizers (id, name))`)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

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
    ): Promise<{ isTracked: boolean; status?: EventStatus }> { // Return type updated
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select('status')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            // 'PGRST116' means 0 rows found, which is a valid success case here (event is not tracked).
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
    ): Promise<{ tracked: number; skipped: number }> { // Return type updated
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
                // This is a success case, so we return directly.
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