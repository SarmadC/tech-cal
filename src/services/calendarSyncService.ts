/**
 * CalendarSyncService - Orchestrates calendar sync operations
 * 
 * Manages the complete flow of syncing tracked events to external calendars:
 * - Check connection status
 * - Handle token refresh if needed
 * - Create/delete calendar events
 * - Update sync status in database
 * 
 * @module CalendarSyncService
 * @server-only This service must only run server-side
 */

import * as Sentry from '@sentry/nextjs';
import type { SupabaseClientType } from '@/types';
import { CalendarConnectionService } from './calendarConnectionService';
import { GoogleCalendarService, type CalendarEvent } from './googleCalendarService';
import { getErrorMessage } from '@/utils/errorHandling';

export interface SyncResult {
    success: boolean;
    requiresReauth?: boolean;
    error?: string;
}

export class CalendarSyncService {
    /**
     * Sync a tracked event to user's Google Calendar
     * Called from API route after user tracks an event
     */
    static async syncTrackedEvent(
        userId: string,
        eventId: string,
        supabase: SupabaseClientType
    ): Promise<SyncResult> {
        try {
            // Get event details from database
            const { data: userEvent, error: eventError } = await supabase
                .from('user_events')
                .select(`
                    *,
                    events (
                        id,
                        title,
                        description,
                        location,
                        start_time,
                        end_time,
                        source_url
                    )
                `)
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .single();

            if (eventError || !userEvent || !userEvent.events) {
                console.error('Event not found:', eventError);
                return { success: false, error: 'Event not found' };
            }

            // Get calendar connection with tokens
            const connection = await CalendarConnectionService.getConnectionWithTokens(
                userId,
                'google',
                supabase
            );

            if (!connection || !connection.is_active) {
                console.log('No active calendar connection for user:', userId);
                return { success: false, error: 'No active calendar connection' };
            }

            // Check if token needs refresh
            let accessToken = connection.accessToken;
            const tokenExpiry = new Date(connection.token_expiry || 0);
            const now = new Date();

            if (tokenExpiry <= now) {
                console.log('Access token expired, refreshing...');
                
                if (!connection.refreshToken) {
                    console.error('No refresh token available');
                    await CalendarConnectionService.markRequiresReauth(
                        userId,
                        'google',
                        'Refresh token missing. Please reconnect your calendar.',
                        supabase
                    );
                    return { 
                        success: false, 
                        requiresReauth: true,
                        error: 'Refresh token missing'
                    };
                }

                try {
                    const refreshed = await GoogleCalendarService.refreshAccessToken(
                        connection.refreshToken
                    );

                    await CalendarConnectionService.updateTokens(
                        userId,
                        'google',
                        refreshed.accessToken,
                        refreshed.expiresAt,
                        supabase
                    );

                    accessToken = refreshed.accessToken;
                    console.log('Access token refreshed successfully');
                } catch (refreshError: unknown) {
                    console.error('Token refresh failed:', refreshError);
                    await CalendarConnectionService.markRequiresReauth(
                        userId,
                        'google',
                        'Token refresh failed. Please reconnect your calendar.',
                        supabase
                    );
                    return { 
                        success: false, 
                        requiresReauth: true,
                        error: 'Token refresh failed'
                    };
                }
            }

            // Prepare calendar event data
            const event = userEvent.events;
            const calendarEvent: CalendarEvent = {
                title: event.title,
                description: event.description || '',
                location: event.location || '',
                startTime: event.start_time,
                endTime: event.end_time || event.start_time,
                sourceUrl: event.source_url || undefined
            };

            let googleEventId: string;

            // Check if event already exists in calendar
            if (userEvent.external_calendar_event_id && userEvent.external_provider === 'google') {
                // Update existing event
                console.log('Updating existing calendar event:', userEvent.external_calendar_event_id);
                await GoogleCalendarService.updateCalendarEvent(
                    accessToken,
                    connection.calendar_id,
                    userEvent.external_calendar_event_id,
                    calendarEvent
                );
                googleEventId = userEvent.external_calendar_event_id;
            } else {
                // Create new event
                console.log('Creating new calendar event');
                googleEventId = await GoogleCalendarService.createCalendarEvent(
                    accessToken,
                    connection.calendar_id,
                    calendarEvent
                );
            }

            // Update user_events with sync result
            await supabase
                .from('user_events')
                .update({
                    external_calendar_event_id: googleEventId,
                    external_provider: 'google',
                    calendar_sync_status: 'synced',
                    calendar_synced_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('event_id', eventId);

            // Update connection status
            await CalendarConnectionService.updateConnection(
                userId,
                'google',
                {
                    last_sync_at: new Date().toISOString(),
                    last_sync_status: 'success',
                    last_sync_error: null
                },
                supabase
            );

            Sentry.addBreadcrumb({
                category: 'calendar_sync',
                message: 'Event synced to calendar',
                data: { userId, eventId, googleEventId },
                level: 'info'
            });

            return { success: true };

        } catch (error: unknown) {
            console.error('Error syncing tracked event:', getErrorMessage(error));

            // Log error to Sentry with context
            Sentry.captureException(error, {
                tags: { 
                    service: 'calendar_sync',
                    operation: 'sync_tracked_event',
                    error_code: GoogleCalendarService.getErrorCode(error) || 'unknown'
                },
                extra: { userId, eventId }
            });

            // Update user_events sync status
            await supabase
                .from('user_events')
                .update({ calendar_sync_status: 'failed' })
                .eq('user_id', userId)
                .eq('event_id', eventId)
                .then(null, err => console.error('Failed to update sync status:', err));

            // Update connection status
            const friendlyError = GoogleCalendarService.getFriendlyError(error);
            await CalendarConnectionService.updateConnection(
                userId,
                'google',
                {
                    last_sync_status: 'failed',
                    last_sync_error: friendlyError
                },
                supabase
            ).then(null, err => console.error('Failed to update connection status:', err));

            return {
                success: false,
                error: friendlyError,
                requiresReauth: GoogleCalendarService.isTokenExpiredError(error)
            };
        }
    }

    /**
     * Remove a synced event from user's Google Calendar
     * Called from API route after user untracks an event
     */
    static async unsyncTrackedEvent(
        userId: string,
        eventId: string,
        googleEventId: string,
        supabase: SupabaseClientType
    ): Promise<SyncResult> {
        try {
            // Get calendar connection with tokens
            const connection = await CalendarConnectionService.getConnectionWithTokens(
                userId,
                'google',
                supabase
            );

            if (!connection) {
                console.log('No calendar connection found for user:', userId);
                return { success: false, error: 'No calendar connection' };
            }

            // Check if token needs refresh (same logic as syncTrackedEvent)
            let accessToken = connection.accessToken;
            const tokenExpiry = new Date(connection.token_expiry || 0);
            const now = new Date();

            if (tokenExpiry <= now && connection.refreshToken) {
                try {
                    const refreshed = await GoogleCalendarService.refreshAccessToken(
                        connection.refreshToken
                    );
                    await CalendarConnectionService.updateTokens(
                        userId,
                        'google',
                        refreshed.accessToken,
                        refreshed.expiresAt,
                        supabase
                    );
                    accessToken = refreshed.accessToken;
                } catch (refreshError) {
                    console.error('Token refresh failed during unsync:', refreshError);
                    // Continue anyway - deletion is best-effort
                }
            }

            // Delete from Google Calendar
            await GoogleCalendarService.deleteCalendarEvent(
                accessToken,
                connection.calendar_id,
                googleEventId
            );

            Sentry.addBreadcrumb({
                category: 'calendar_sync',
                message: 'Event removed from calendar',
                data: { userId, eventId, googleEventId },
                level: 'info'
            });

            // Update connection status on successful unsync
            await CalendarConnectionService.updateConnection(
                userId,
                'google',
                {
                    last_sync_at: new Date().toISOString(),
                    last_sync_status: 'success',
                    last_sync_error: null
                },
                supabase
            ).then(null, err => console.error('Failed to update connection status:', err));

            return { success: true };

        } catch (error: unknown) {
            console.error('Error unsyncing tracked event:', getErrorMessage(error));

            Sentry.captureException(error, {
                tags: { 
                    service: 'calendar_sync',
                    operation: 'unsync_tracked_event',
                    error_code: GoogleCalendarService.getErrorCode(error) || 'unknown'
                },
                extra: { userId, eventId, googleEventId }
            });

            // Don't fail the untrack operation if calendar deletion fails
            // The event is already removed from user_events
            return {
                success: false,
                error: GoogleCalendarService.getFriendlyError(error)
            };
        }
    }

    /**
     * Sync all existing tracked events for a user (bulk sync)
     * Called when user first connects their calendar
     */
    static async bulkSyncExistingEvents(
        userId: string,
        supabase: SupabaseClientType
    ): Promise<{
        total: number;
        synced: number;
        failed: number;
        errors: string[];
    }> {
        try {
            // Get all tracked events that aren't synced yet
            const { data: trackedEvents, error } = await supabase
                .from('user_events')
                .select('event_id')
                .eq('user_id', userId)
                .is('external_calendar_event_id', null);

            if (error) throw error;

            if (!trackedEvents || trackedEvents.length === 0) {
                return { total: 0, synced: 0, failed: 0, errors: [] };
            }

            const total = trackedEvents.length;
            let synced = 0;
            let failed = 0;
            const errors: string[] = [];

            // Process in batches to respect rate limits
            const BATCH_SIZE = 10;
            const BATCH_DELAY_MS = 2000; // 2 seconds between batches

            for (let i = 0; i < trackedEvents.length; i += BATCH_SIZE) {
                const batch = trackedEvents.slice(i, i + BATCH_SIZE);
                
                // Sync batch in parallel
                const results = await Promise.allSettled(
                    batch.map(({ event_id }) =>
                        this.syncTrackedEvent(userId, event_id, supabase)
                    )
                );

                // Count results
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value.success) {
                        synced++;
                    } else {
                        failed++;
                        const eventId = batch[index].event_id;
                        const error = result.status === 'rejected' 
                            ? result.reason 
                            : (result as PromiseFulfilledResult<SyncResult>).value.error;
                        errors.push(`${eventId}: ${error}`);
                    }
                });

                // Delay between batches (except for last batch)
                if (i + BATCH_SIZE < trackedEvents.length) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
                }
            }

            Sentry.addBreadcrumb({
                category: 'calendar_sync',
                message: 'Bulk sync completed',
                data: { userId, total, synced, failed },
                level: 'info'
            });

            return { total, synced, failed, errors };

        } catch (error) {
            console.error('Error during bulk sync:', error);
            Sentry.captureException(error, {
                tags: { service: 'calendar_sync', operation: 'bulk_sync' },
                extra: { userId }
            });
            throw error;
        }
    }
}

