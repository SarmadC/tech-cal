import { logger } from '@/utils/logger';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { GoogleCalendarService } from '@/services/googleCalendarService';
import {
    getGoogleOAuthClientId,
    getGoogleOAuthClientSecret,
} from '@/services/googleCalendarOAuthConfig';
import { encryptToken } from '@/utils/tokenEncryption';
import crypto from 'crypto';

const OAUTH_STATE_COOKIE = 'calendar_oauth_state';

function timingSafeEqual(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    if (aBuffer.length !== bBuffer.length) {
        return false;
    }
    return crypto.timingSafeEqual(aBuffer, bBuffer);
}

async function handleCallback(request: NextRequest) {
    const origin = new URL(request.url).origin;
    const redirectToSettings = (errorCode: string) => {
        const response = NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&error=${errorCode}`);
        response.cookies.set({
            name: OAUTH_STATE_COOKIE,
            value: '',
            maxAge: 0,
            path: '/api/calendar/google/callback',
        });
        return response;
    };

    try {
        logger.debug('[CALENDAR CALLBACK] Request received:', request.url);
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');


        if (error) {
            console.error('[CALENDAR CALLBACK] OAuth error:', error);
            return redirectToSettings('oauth_error');
        }

        const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
        if (!code || !state || !expectedState || !timingSafeEqual(state, expectedState)) {
            console.error('[CALENDAR CALLBACK] Invalid request - code/state validation failed:', {
                hasCode: !!code,
                hasState: !!state,
                hasExpectedState: !!expectedState,
            });
            return redirectToSettings('invalid_request');
        }

        // Exchange authorization code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: getGoogleOAuthClientId(),
                client_secret: getGoogleOAuthClientSecret(),
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${origin}/api/calendar/google/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.text();
            console.error('[CALENDAR CALLBACK] Token exchange failed:', errorData);
            return redirectToSettings('token_exchange_failed');
        }

        const tokens = await tokenResponse.json();
        logger.debug('[CALENDAR CALLBACK] Tokens received from OAuth provider', {
            hasAccessToken: !!tokens?.access_token,
            hasRefreshToken: !!tokens?.refresh_token,
        });
        const { access_token, refresh_token } = tokens;

        if (!access_token || !refresh_token) {
            console.error('[CALENDAR CALLBACK] Missing tokens in OAuth response', {
                hasAccessToken: !!access_token,
                hasRefreshToken: !!refresh_token,
            });
            return redirectToSettings('missing_tokens');
        }

        // Get user's primary calendar
        const calendarId = await GoogleCalendarService.getPrimaryCalendar(access_token);

        // Get current user
        const supabase = await createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('[CALENDAR CALLBACK] User not authenticated:', userError);
            return redirectToSettings('not_authenticated');
        }

        // Store connection in database
        const { data: existing } = await supabase
            .from('calendar_connections')
            .select('id')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single();

        // Encrypt tokens before storage for security
        const encryptedAccessToken = encryptToken(access_token);
        const encryptedRefreshToken = encryptToken(refresh_token);

        if (existing) {
            // Update existing connection
            const { error } = await supabase
                .from('calendar_connections')
                .update({
                    calendar_id: calendarId,
                    access_token: encryptedAccessToken,
                    refresh_token: encryptedRefreshToken,
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
            // Create new connection with encrypted tokens
            const { error } = await supabase
                .from('calendar_connections')
                .insert({
                    user_id: user.id,
                    provider: 'google',
                    calendar_id: calendarId,
                    access_token: encryptedAccessToken,
                    refresh_token: encryptedRefreshToken,
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

        logger.debug('[CALENDAR CALLBACK] Calendar connection created/updated successfully');

        // Redirect back to settings with success
        const successResponse = NextResponse.redirect(`${origin}/dashboard/settings?tab=integrations&connected=true`);
        successResponse.cookies.set({
            name: OAUTH_STATE_COOKIE,
            value: '',
            maxAge: 0,
            path: '/api/calendar/google/callback',
        });
        return successResponse;

    } catch (error) {
        console.error('[CALENDAR CALLBACK] Unexpected error:', error);
        if (error instanceof Error) {
            console.error('[CALENDAR CALLBACK] Error message:', error.message);
            console.error('[CALENDAR CALLBACK] Error stack:', error.stack);
        }
        return redirectToSettings('callback_error');
    }
}

export async function GET(request: NextRequest) {
    return handleCallback(request);
}
