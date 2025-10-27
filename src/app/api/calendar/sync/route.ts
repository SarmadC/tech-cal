/**
 * POST /api/calendar/sync
 * 
 * Sync a single event to/from Google Calendar
 * 
 * @server-only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CalendarSyncService } from '@/services/calendarSyncService';
import * as Sentry from '@sentry/nextjs';
import { getErrorMessage } from '@/utils/errorHandling';

export async function POST(request: NextRequest) {
    try {
        // Authenticate user
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { eventId, action, external_calendar_event_id, external_provider } = body;

        if (!eventId || !action) {
            return NextResponse.json({
                error: 'Missing required fields: eventId, action'
            }, { status: 400 });
        }

        if (action === 'sync') {
            // Sync event to calendar
            const result = await CalendarSyncService.syncTrackedEvent(
                user.id,
                eventId,
                supabase
            );

            if (result.success) {
                return NextResponse.json({
                    success: true,
                    message: 'Event synced to calendar'
                });
            } else {
                return NextResponse.json({
                    error: result.error || 'Failed to sync event'
                }, { status: 500 });
            }

        } else if (action === 'delete') {
            // Remove event from calendar
            if (external_calendar_event_id && external_provider === 'google') {
                const result = await CalendarSyncService.unsyncTrackedEvent(
                    user.id,
                    eventId,
                    external_calendar_event_id,
                    supabase
                );

                if (result.success) {
                    return NextResponse.json({
                        success: true,
                        message: 'Event removed from calendar'
                    });
                } else {
                    return NextResponse.json({
                        error: result.error || 'Failed to remove event from calendar'
                    }, { status: 500 });
                }
            } else {
                return NextResponse.json({
                    error: 'Missing external calendar event ID'
                }, { status: 400 });
            }

        } else {
            return NextResponse.json({
                error: 'Invalid action. Must be "sync" or "delete"'
            }, { status: 400 });
        }

    } catch (error: unknown) {
        console.error('Error syncing calendar event:', error);
        
        Sentry.captureException(error, {
            tags: { api: 'calendar_sync' },
            contexts: {
                request: {
                    url: request.url,
                    method: request.method
                }
            }
        });

        return NextResponse.json({
            error: 'Failed to sync calendar event',
            details: getErrorMessage(error)
        }, { status: 500 });
    }
}