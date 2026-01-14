/**
 * POST /api/calendar/bulk-sync
 * 
 * Sync all tracked events to Google Calendar
 * 
 * @server-only
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CalendarSyncService } from '@/services/calendarSyncService';
import * as Sentry from '@sentry/nextjs';
import { getErrorMessage } from '@/utils/errorHandling';
import { withSubscription } from '@/lib/subscription';

export const POST = withSubscription(
    async (request: Request) => {
        try {
            // Authenticate user (subscription wrapper already validated session)
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                return NextResponse.json(
                    { error: 'Not authenticated' },
                    { status: 401 }
                );
            }

            // Bulk sync all tracked events
            const result = await CalendarSyncService.bulkSyncExistingEvents(
                user.id,
                supabase
            );

            return NextResponse.json({
                success: true,
                message: `Synced ${result.synced} of ${result.total} events`,
                synced: result.synced,
                total: result.total,
                failed: result.failed,
                errors: result.errors
            });

        } catch (error: unknown) {
            console.error('Error bulk syncing calendar events:', error);
            
            Sentry.captureException(error, {
                tags: { api: 'calendar_bulk_sync' },
                contexts: {
                    request: {
                        url: request.url,
                        method: request.method
                    }
                }
            });

            return NextResponse.json({
                error: 'Failed to bulk sync calendar events',
                details: getErrorMessage(error)
            }, { status: 500 });
        }
    },
    { requireFeature: 'calendar_sync' }
);
