// 1. UPDATE IMPORTS: Use the new, specific type names.
import type {
    EventStatus,
    TrackedEventRecord, // Replaces AppTrackedEvent
    SupabaseTrackedEventWithDetails,
    SupabaseClientType,
} from '@/types';
import { trackedEventTransformer } from '@/utils/transformers';
import * as Sentry from "@sentry/nextjs";

// RPC return type interfaces
interface TrackEventRpcResult {
    success: boolean;
    message?: string;
    error?: string;
    is_new_tracking?: boolean;
}

interface UntrackEventRpcResult {
    success: boolean;
    message?: string;
    error?: string;
    was_tracked?: boolean;
    external_calendar_event_id?: string;
    external_provider?: string;
}

interface ToggleBookmarkRpcResult {
    success: boolean;
    error?: string;
    was_bookmarked: boolean;
    is_bookmarked: boolean;
    is_new_row: boolean;
}

interface SetAttendanceStatusRpcResult {
    success: boolean;
    error?: string;
    previous_status: string | null;
    new_status: string | null;
    auto_bookmarked: boolean;
}

export class UserEventService {
    /**
     * Track an event or update its status using atomic RPC function.
     * This ensures both user_events and profiles tables are updated atomically.
     * @deprecated Use toggleBookmark and setAttendanceStatus instead for decoupled bookmark/attendance.
     */
    static async trackEvent(
        userId: string,
        eventId: string,
        status: EventStatus,
        notes: string | undefined,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const { data, error } = await supabaseClient.rpc('track_event_and_update_profile', {
                p_user_id: userId,
                p_event_id: eventId,
                p_status: status,
                p_notes: notes ?? undefined
            });

            if (error) {
                console.error('RPC error tracking event:', error);
                throw error;
            }

            const result = data as TrackEventRpcResult | null;
            
            if (!result || !result.success) {
                const errorMessage = result?.message || result?.error || 'Failed to track event';
                console.error('❌ Function returned failure:', {
                    data: result,
                    errorMessage,
                    userId,
                    eventId,
                    status
                });
                throw new Error(errorMessage);
            }

            console.log('Event tracked successfully:', {
                userId,
                eventId,
                status,
                isNewTracking: result.is_new_tracking
            });
        } catch (error) {
            console.error('Error tracking event:', error);
            Sentry.captureException(error, { extra: { function: 'trackEvent', userId, eventId, status } });
            throw new Error('Failed to track event.');
        }
    }

    /**
     * Toggle bookmark status for an event (independent of attendance).
     * Creates row if it doesn't exist (first-time bookmark).
     * Returns result with bookmark state info.
     */
    static async toggleBookmark(
        userId: string,
        eventId: string,
        isBookmarked: boolean,
        supabaseClient: SupabaseClientType
    ): Promise<{ wasBookmarked: boolean; isBookmarked: boolean; isNewRow: boolean }> {
        try {
            const { data, error } = await supabaseClient.rpc('toggle_bookmark', {
                p_user_id: userId,
                p_event_id: eventId,
                p_is_bookmarked: isBookmarked
            });

            if (error) {
                console.error('RPC error toggling bookmark:', error);
                throw error;
            }

            const result = data as ToggleBookmarkRpcResult | null;
            
            if (!result || !result.success) {
                const errorMessage = result?.error || 'Failed to toggle bookmark';
                console.error('❌ Function returned failure:', {
                    data: result,
                    errorMessage,
                    userId,
                    eventId,
                    isBookmarked
                });
                throw new Error(errorMessage);
            }

            console.log('Bookmark toggled successfully:', {
                userId,
                eventId,
                wasBookmarked: result.was_bookmarked,
                isBookmarked: result.is_bookmarked,
                isNewRow: result.is_new_row
            });

            return {
                wasBookmarked: result.was_bookmarked,
                isBookmarked: result.is_bookmarked,
                isNewRow: result.is_new_row
            };
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            Sentry.captureException(error, { extra: { function: 'toggleBookmark', userId, eventId, isBookmarked } });
            throw new Error('Failed to toggle bookmark.');
        }
    }

    /**
     * Set attendance status for an event (independent of bookmarking).
     * Auto-bookmarks if status is 'attending' or 'attended' (for calendar sync consistency).
     * Returns result with status change info and auto-bookmark flag.
     */
    static async setAttendanceStatus(
        userId: string,
        eventId: string,
        status: EventStatus | null,
        notes: string | undefined,
        supabaseClient: SupabaseClientType
    ): Promise<{ previousStatus: string | null; newStatus: string | null; autoBookmarked: boolean }> {
        try {
            // Handle null status separately - RPC function doesn't accept null
            // When status is null, we directly update the user_events table to clear attendance
            if (status === null) {
                // First, get the current status before clearing
                const { data: existingRecord } = await supabaseClient
                    .from('user_events')
                    .select('status')
                    .eq('user_id', userId)
                    .eq('event_id', eventId)
                    .maybeSingle();

                const previousStatus = existingRecord?.status ?? null;

                // Update the record to set status to null
                const { error: updateError } = await supabaseClient
                    .from('user_events')
                    .update({ status: null, notes: notes ?? null })
                    .eq('user_id', userId)
                    .eq('event_id', eventId);

                if (updateError) {
                    console.error('Error clearing attendance status:', updateError);
                    throw updateError;
                }

                console.log('Attendance status cleared successfully:', {
                    userId,
                    eventId,
                    previousStatus,
                    newStatus: null
                });

                return {
                    previousStatus,
                    newStatus: null,
                    autoBookmarked: false
                };
            }

            // For non-null status, use the RPC function
            const { data, error } = await supabaseClient.rpc('set_attendance_status', {
                p_user_id: userId,
                p_event_id: eventId,
                p_status: status,
                p_notes: notes ?? undefined
            });

            if (error) {
                console.error('RPC error setting attendance status:', {
                    error,
                    errorCode: error.code,
                    errorMessage: error.message,
                    errorDetails: error.details,
                    errorHint: error.hint,
                    userId,
                    eventId,
                    status,
                    params: {
                        p_user_id: userId,
                        p_event_id: eventId,
                        p_status: status ?? null,
                        p_notes: notes ?? null
                    }
                });
                throw error;
            }

            const result = data as SetAttendanceStatusRpcResult | null;
            
            if (!result || !result.success) {
                const errorMessage = result?.error || 'Failed to set attendance status';
                console.error('❌ Function returned failure:', {
                    data: result,
                    errorMessage,
                    userId,
                    eventId,
                    status
                });
                throw new Error(errorMessage);
            }

            console.log('Attendance status updated successfully:', {
                userId,
                eventId,
                previousStatus: result.previous_status,
                newStatus: result.new_status,
                autoBookmarked: result.auto_bookmarked
            });

            return {
                previousStatus: result.previous_status,
                newStatus: result.new_status,
                autoBookmarked: result.auto_bookmarked
            };
        } catch (error) {
            console.error('Error setting attendance status:', error);
            Sentry.captureException(error, { extra: { function: 'setAttendanceStatus', userId, eventId, status } });
            throw new Error('Failed to set attendance status.');
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
                    id, user_id, event_id, status, notes, created_at, is_bookmarked, bookmarked_at,
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
                    status: item.status as EventStatus | null,
                    notes: item.notes,
                    trackedAt: item.created_at || new Date().toISOString(),
                    isBookmarked: item.is_bookmarked ?? false,
                    bookmarkedAt: item.bookmarked_at || null,
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
     * Untrack an event for a user using atomic RPC function.
     * This ensures both user_events and profiles tables are updated atomically.
     */
    static async untrackEvent(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<{ external_calendar_event_id?: string; external_provider?: string }> {
        try {
            const { data, error } = await supabaseClient.rpc('untrack_event_and_update_profile', {
                p_user_id: userId,
                p_event_id: eventId
            });

            if (error) {
                console.error('RPC error untracking event:', error);
                throw error;
            }

            const result = data as UntrackEventRpcResult | null;
            
            if (!result || !result.success) {
                const errorMessage = result?.message || result?.error || 'Failed to untrack event';
                console.error('❌ Function returned failure:', {
                    data: result,
                    errorMessage,
                    userId,
                    eventId
                });
                throw new Error(errorMessage);
            }

            console.log('Event untracked successfully:', {
                userId,
                eventId,
                wasTracked: result.was_tracked,
                externalCalendarEventId: result.external_calendar_event_id,
                externalProvider: result.external_provider
            });

            return {
                external_calendar_event_id: result.external_calendar_event_id,
                external_provider: result.external_provider
            };
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
                .select(`
                    *, 
                    events (
                        *, 
                        event_type:event_type_id (*), 
                        organizer:organizers (id, name, logo_url),
                        event_tag_relations (
                            event_tags (
                                id,
                                event_tag,
                                color,
                                category
                            )
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            
            // Note: The * selector will include is_bookmarked and bookmarked_at automatically

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
     * Returns both bookmark and attendance status.
     */
    static async isEventTracked(
        userId: string,
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<{ isBookmarked: boolean; isTracked: boolean; status?: EventStatus | null }> {
        try {
            const { data, error } = await supabaseClient
                .from('user_events')
                .select('status, is_bookmarked')
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return { 
                isTracked: !!data, 
                isBookmarked: data?.is_bookmarked ?? false,
                status: data?.status as EventStatus | null | undefined 
            };
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