// src/services/userEventService.ts

import { supabase } from '@/lib/supabaseClient';
import type {
    ApiResponse,
    EventStatus,
    AppTrackedEvent,
    SupabaseTrackedEventWithDetails,
} from '@/types';

// Import the specific transformer we need for this service.
import { trackedEventTransformer } from '@/utils/transformers';

export class UserEventService {
    /**
     * Creates or updates a tracking record for an event for a specific user.
     */
    static async trackEvent(
        userId: string,
        eventId: string,
        status: EventStatus = 'bookmarked',
        notes?: string
    ): Promise<ApiResponse<void>> {
        try {
            // First, check if a record already exists.
            const { data: existing } = await supabase
                .from('user_events')
                .select('id')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            if (existing) {
                // If it exists, update it.
                const { error } = await supabase
                    .from('user_events')
                    .update({ status, notes, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);

                if (error) throw error;
                return { success: true, message: `Event status updated to ${status}` };
            } else {
                // If not, create a new record.
                const { error } = await supabase
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
     * Deletes a tracking record for an event for a specific user.
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
            return { success: false, error: error instanceof Error ? error.message : 'Failed to untrack event' };
        }
    }

    /**
     * Fetches all of a user's tracked events, joining the full event and event_type details.
     */
    static async getTrackedEvents(userId: string): Promise<ApiResponse<AppTrackedEvent[]>> {
        try {
            const { data, error } = await supabase
                .from('user_events')
                .select(`
                    *,
                    events (
                        *,
                        event_type:event_type_id (*)
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Use our robust transformer to map the complex, nested data.
            // The 'as' cast is safe here because our select() query guarantees this shape.
            const trackedEvents = (data as SupabaseTrackedEventWithDetails[] || []).map(trackedEventTransformer.toApp);
            return { success: true, data: trackedEvents };
        } catch (error) {
            console.error('Error fetching tracked events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch tracked events' };
        }
    }

    /**
     * Checks if a single event is tracked by a user and returns its status if it is.
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

            // Supabase returns error PGRST116 if no row is found, which is not a real error for us.
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
            return { success: false, error: error instanceof Error ? error.message : 'Failed to check tracking status' };
        }
    }

    /**
     * Efficiently tracks multiple events, skipping any that are already tracked.
     */
    static async bulkTrackEvents(
        userId: string,
        eventIds: string[],
        status: EventStatus = 'bookmarked'
    ): Promise<ApiResponse<{ tracked: number; skipped: number }>> {
        try {
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
                    message: 'All selected events are already tracked'
                };
            }

            const insertData = newEventIds.map(eventId => ({
                user_id: userId,
                event_id: eventId,
                status,
            }));

            const { error } = await supabase.from('user_events').insert(insertData);
            if (error) throw error;

            return {
                success: true,
                data: {
                    tracked: newEventIds.length,
                    skipped: existingEventIds.size
                },
                message: `Successfully tracked ${newEventIds.length} new events!`
            };
        } catch (error) {
            console.error('Error bulk tracking events:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Failed to track events' };
        }
    }
}