/**
 * GET /api/calendar/google/status
 * 
 * Get calendar connection status for the authenticated user
 * 
 * @server-only
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CalendarConnectionService } from '@/services/calendarConnectionService';
import { getErrorMessage } from '@/utils/errorHandling';
import { withSubscription } from '@/lib/subscription';

export const GET = withSubscription(
    async (_request: Request) => {
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

            // Get connection status
            const connection = await CalendarConnectionService.getConnection(
                user.id,
                'google',
                supabase
            );

            if (!connection) {
                return NextResponse.json({
                    connected: false,
                    provider: null,
                    isActive: false,
                    hasRefreshToken: false,
                    lastSyncStatus: null,
                    lastSyncAt: null,
                    lastSyncError: null
                });
            }

            return NextResponse.json({
                connected: true,
                provider: connection.provider,
                isActive: connection.is_active,
                hasRefreshToken: connection.has_refresh_token,
                lastSyncStatus: connection.last_sync_status,
                lastSyncAt: connection.last_sync_at,
                lastSyncError: connection.last_sync_error,
                calendarId: connection.calendar_id
            });

        } catch (error: unknown) {
            console.error('Error getting calendar status:', error);
            
            return NextResponse.json({
                error: 'Failed to get calendar status',
                details: getErrorMessage(error)
            }, { status: 500 });
        }
    },
    { requireFeature: 'calendar_sync' }
);
