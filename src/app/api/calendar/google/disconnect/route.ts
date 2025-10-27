/**
 * POST /api/calendar/google/disconnect
 * 
 * Disconnect user's Google Calendar integration
 * 
 * @server-only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CalendarConnectionService } from '@/services/calendarConnectionService';
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

        // Delete connection and clean up Vault secrets
        await CalendarConnectionService.deleteConnection(
            user.id,
            'google',
            supabase
        );

        Sentry.addBreadcrumb({
            category: 'calendar_api',
            message: 'Calendar connection deleted',
            data: { userId: user.id },
            level: 'info'
        });

        return NextResponse.json({
            success: true,
            message: 'Calendar disconnected successfully'
        });

    } catch (error: unknown) {
        console.error('Error disconnecting calendar:', error);
        
        Sentry.captureException(error, {
            tags: { api: 'calendar_disconnect' },
            contexts: {
                request: {
                    url: request.url,
                    method: request.method
                }
            }
        });

        return NextResponse.json({
            error: 'Failed to disconnect calendar',
            details: getErrorMessage(error)
        }, { status: 500 });
    }
}