// src/services/userEventService.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import type {
    ApiResponse,
    EventStatus,
    AppTrackedEvent,
    SupabaseTrackedEventWithDetails,
} from '@/types';
import { trackedEventTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

// Define the fully-typed Supabase client type
type SupabaseClientType = SupabaseClient<Database>;

export class UserEventService {
    /**
     * Track an event for a user or update its status if already tracked.
     */
    static async trackEvent(
        userId: string,
        eventId: string,
        status: EventStatus,
        notes: string | undefined,
        supabaseClient: SupabaseClientType // Now a required parameter
    ): Promise<ApiResponse<void>> {
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
                return { success: true, message: `Event status updated to ${status}` };
            } else {
                const { error } = await supabaseClient
                    .from('user_events')
                    .insert({ user_id: userId, event_id: eventId, status, notes });
                if (error) throw error;
                return { success: true, message: 'Event tracked successfully!' };
            }
        } catch (error) {
            console.error('Error tracking event:', error);
            Sentry.captureException(error, { extra: { function: 'trackEvent', userId, eventId, status } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to track event' };
        }
    }

    /**
     * Untrack an event for a user.
     */
    static async untrackEvent(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType // Now a required parameter
    ): Promise<ApiResponse<void>> {
        try {
            const { error } = await supabaseClient
                .from('user_events')
                .delete()
                .eq('user_id', userId)
                .eq('event_id', eventId);
            if (error) throw error;
            return { success: true, message: 'Event untracked successfully!' };
        } catch (error) {
            console.error('Error untracking event:', error);
            Sentry.captureException(error, { extra: { function: 'untrackEvent', userId, eventId } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to untrack event' };
        }
    }

    /**
     * Get a user's tracked events with full event data.
     */
    static async getTrackedEvents(
        userId: string,
        supabaseClient: SupabaseClientType // Now a required parameter
    ): Promise<ApiResponse<AppTrackedEvent[]>> {
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select(`
                    *, 
                    events (
                        *, 
                        event_type:event_type_id (*),
                        organizer:organizers (id, name)
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const trackedEvents = (data as SupabaseTrackedEventWithDetails[] || []).map(trackedEventTransformer.toApp);
            return { success: true, data: trackedEvents };
        } catch (error) {
            console.error('Error fetching tracked events:', error);
            Sentry.captureException(error, { extra: { function: 'getTrackedEvents', userId } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tracked events' };
        }
    }

    /**
     * Check if an event is tracked by a user and get its status.
     */
    static async isEventTracked(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType // Now a required parameter
    ): Promise<ApiResponse<{ isTracked: boolean; status?: EventStatus }>> {
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select('status')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();
            if (error && error.code !== 'PGRST116') throw error; // 'PGRST116' means no rows found, which is not an error here
            return { success: true, data: { isTracked: !!data, status: data?.status as EventStatus | undefined } };
        } catch (error) {
            console.error('Error checking event tracking status:', error);
            Sentry.captureException(error, { extra: { function: 'isEventTracked', userId, eventId } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to check tracking status' };
        }
    }

    /**
     * Bulk track multiple events for a user.
     */
    static async bulkTrackEvents(
        userId: string,
        eventIds: string[],
        status: EventStatus,
        supabaseClient: SupabaseClientType // Now a required parameter
    ): Promise<ApiResponse<{ tracked: number; skipped: number }>> {
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
                return { success: true, data: { tracked: 0, skipped: eventIds.length }, message: 'All selected events are already tracked' };
            }

            const insertData = newEventIds.map(eventId => ({ user_id: userId, event_id: eventId, status }));
            const { error: insertError } = await supabaseClient.from('user_events').insert(insertData);
            if (insertError) throw insertError;

            return { success: true, data: { tracked: newEventIds.length, skipped: existingEventIds.size }, message: `Successfully tracked ${newEventIds.length} events!` };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            Sentry.captureException(error, { extra: { function: 'bulkTrackEvents', userId, eventIdsCount: eventIds.length, status } });
            return { success: false, error: error instanceof Error ? error.message : 'Failed to track events' };
        }
    }
}