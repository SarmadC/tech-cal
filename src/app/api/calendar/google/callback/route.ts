import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleCalendarService } from '@/services/googleCalendarService';

async function handleCallback(request: NextRequest) {
    try {
        console.log('[CALENDAR CALLBACK] Request received:', request.url);
        const { searchParams, origin } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');


        if (error) {
            console.error('[CALENDAR CALLBACK] OAuth error:', error);
            return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&error=oauth_error`);
        }

        if (!code || state !== 'calendar_connect') {
            console.error('[CALENDAR CALLBACK] Invalid request - missing code or state mismatch:', { hasCode: !!code, state });
            return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&error=invalid_request`);
        }

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
                client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${origin}/api/calendar/google/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('[CALENDAR CALLBACK] Token exchange failed:', errorData);
            return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&error=token_exchange_failed`);
        }

        const tokens = await tokenResponse.json();
        console.log('[CALENDAR CALLBACK] Tokens received:', tokens);
        const { access_token, refresh_token } = tokens;

        if (!access_token || !refresh_token) {
            console.error('[CALENDAR CALLBACK] Missing tokens in response:', tokens);
            return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&error=missing_tokens`);
        }

        // Get user's primary calendar
        const calendarId = await GoogleCalendarService.getPrimaryCalendar(access_token);

        // Get current user
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('[CALENDAR CALLBACK] User not authenticated:', userError);
            return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&error=not_authenticated`);
        }

        // Store connection in database
        // For production, these tokens should be encrypted before storage
        const { data: existing } = await supabase
            .from('calendar_connections')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single();

        if (existing) {
            // Update existing connection
            const { error } = await supabase
                .from('calendar_connections')
                .update({
                    calendar_id: calendarId,
                    access_token: access_token,  // TODO: Encrypt in production
                    refresh_token: refresh_token,  // TODO: Encrypt in production
                    token_expiry: new Date(Date.now() + 3599 * 1000).toISOString(),
                    last_sync_at: new Date().toISOString(),
                    last_sync_status: 'success',
                    last_sync_error: null,
                    access_token_secret_id: null,
                    refresh_token_secret_id: null
                })
                .eq('user_id', user.id)
                .eq('provider', 'google');

            if (error) {
                console.error('[CALENDAR CALLBACK] Error updating connection:', error);
                throw error;
            }
        } else {
            // Create new connection
            const { error } = await supabase
                .from('calendar_connections')
                .insert({
                    user_id: user.id,
                    provider: 'google',
                    calendar_id: calendarId,
                    access_token: access_token,  // TODO: Encrypt in production
                    refresh_token: refresh_token,  // TODO: Encrypt in production
                    token_expiry: new Date(Date.now() + 3599 * 1000).toISOString(),
                    is_active: true,
                    has_refresh_token: true,
                    last_sync_at: new Date().toISOString(),
                    last_sync_status: 'success',
                    last_sync_error: null,
                    access_token_secret_id: null,
                    refresh_token_secret_id: null
                });

            if (error) {
                console.error('[CALENDAR CALLBACK] Error creating connection:', error);
                throw error;
            }
        }

        console.log('[CALENDAR CALLBACK] Calendar connection created/updated successfully');

        // Redirect back to settings with success
        return NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&connected=true`);

    } catch (error) {
        console.error('[CALENDAR CALLBACK] Unexpected error:', error);
        if (error instanceof Error) {
            console.error('[CALENDAR CALLBACK] Error message:', error.message);
            console.error('[CALENDAR CALLBACK] Error stack:', error.stack);
        }
        // Get origin from request URL for error redirect
        const requestOrigin = new URL(request.url).origin;
        return NextResponse.redirect(`${requestOrigin}/dashboard/settings?tab=integrations&error=callback_error`);
    }
}

// Export both GET and POST handlers
export async function GET(request: NextRequest) {
    return handleCallback(request);
}

export async function POST(request: NextRequest) {
    return handleCallback(request);
}
