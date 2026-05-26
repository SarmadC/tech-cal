import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getGoogleOAuthClientId } from '@/services/googleCalendarOAuthConfig';
import type { SubscriptionStatus } from '@/types/subscription';

const OAUTH_STATE_COOKIE = 'calendar_oauth_state';
const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&error=not_authenticated', request.url));
        }

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status,tier,current_period_end')
            .eq('user_id', user.id)
            .maybeSingle();

        const activeStatuses: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];
        const isCanceledButActive =
            subscription?.status === 'canceled' &&
            !!subscription.current_period_end &&
            new Date(subscription.current_period_end).getTime() > Date.now();

        const canSync =
            !!subscription &&
            (activeStatuses.includes(subscription.status) || isCanceledButActive) &&
            subscription.tier !== 'free';

        if (!canSync) {
            return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&error=requires_upgrade', request.url));
        }

        const origin = new URL(request.url).origin;
        const state = crypto.randomUUID();
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', getGoogleOAuthClientId());
        authUrl.searchParams.set('redirect_uri', `${origin}/api/calendar/google/callback`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', state);

        const response = NextResponse.redirect(authUrl);
        response.cookies.set({
            name: OAUTH_STATE_COOKIE,
            value: state,
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: OAUTH_STATE_TTL_SECONDS,
            path: '/api/calendar/google/callback',
        });

        return response;
    } catch (error) {
        console.error('[CALENDAR START] Failed to initiate OAuth flow:', error);
        return NextResponse.redirect(new URL('/dashboard/settings?tab=integrations&error=oauth_start_failed', request.url));
    }
}
