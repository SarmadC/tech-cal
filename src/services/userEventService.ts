// src/services/userEventService.ts (Corrected and Final)

import { supabase as browserSupabaseClient, SupabaseClientType } from '@/lib/supabaseClient';
import type {
    ApiResponse,
    EventStatus,
    AppTrackedEvent,
    SupabaseTrackedEventWithDetails,
} from '@/types';
import { trackedEventTransformer } from '@/utils/transformers';

export class UserEventService {
    /**
     * Track an event for a user
     */
    static async trackEvent(
        userId: string,
        eventId: string,
        status: EventStatus = 'bookmarked',
        notes?: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
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
                    .update({ status, notes, updated_at: new Date().toISOString() }) // FIX: update `updated_at`
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
            return { success: false, error: error instanceof Error ? error.message : 'Failed to track event' };
        }
    }

    /**
     * Untrack an event
     */
    static async untrackEvent(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
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
            return { success: false, error: error instanceof Error ? error.message : 'Failed to untrack event' };
        }
    }

    /**
     * Get user's tracked events with full event data
     */
    static async getTrackedEvents(
        userId: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
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
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tracked events' };
        }
    }

    /**
     * Check if event is tracked by user
     */
    static async isEventTracked(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<{ isTracked: boolean; status?: EventStatus }>> {
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select('status')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data: { isTracked: !!data, status: data?.status as EventStatus } };
        } catch (error) {
            console.error('Error checking event tracking status:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to check tracking status' };
        }
    }

    /**
     * Bulk track multiple events
     */
    static async bulkTrackEvents(
        userId: string,
        eventIds: string[],
        status: EventStatus = 'bookmarked',
        supabaseClient: SupabaseClientType = browserSupabaseClient
    ): Promise<ApiResponse<{ tracked: number; skipped: number }>> {
        try {
            const { data: existing } = await supabaseClient
                .from('user_events')
                .select('event_id')
                .eq('user_id', userId)
                .in('event_id', eventIds);

            const existingEventIds = new Set(existing?.map((e: { event_id: string }) => e.event_id) || []); // FIX: Add explicit type for 'e'
            const newEventIds = eventIds.filter(id => !existingEventIds.has(id));

            if (newEventIds.length === 0) {
                return { success: true, data: { tracked: 0, skipped: eventIds.length }, message: 'All events are already tracked' };
            }

            const insertData = newEventIds.map(eventId => ({ user_id: userId, event_id: eventId, status }));
            const { error } = await supabaseClient.from('user_events').insert(insertData);
            if (error) throw error;

            return { success: true, data: { tracked: newEventIds.length, skipped: existingEventIds.size }, message: `Successfully tracked ${newEventIds.length} events!` };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to track events' };
        }
    }
}