import { logger } from '@/utils/logger';
/**
 * POST /api/calendar/google/connect
 *
 * Extract OAuth tokens from Supabase session and store in calendar_connections
 *
 * CRITICAL TIMING: Must be called IMMEDIATELY after OAuth redirect
 * Supabase only surfaces provider_refresh_token right after OAuth flow
 *
 * @server-only
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { CalendarConnectionService } from '@/services/calendarConnectionService';
import { GoogleCalendarService } from '@/services/googleCalendarService';
import { getPostHogClient } from '@/lib/posthog-server';
import * as Sentry from '@sentry/nextjs';
import { getErrorMessage } from '@/utils/errorHandling';
import type { SubscriptionStatus } from '@/types/subscription';

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

        // Basic entitlement check for calendar sync (Pro or trialing)
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status,tier,current_period_end')
            .eq('user_id', user.id)
            .maybeSingle();

        const activeStatuses: SubscriptionStatus[] = ['active', 'trialing', 'past_due'];
        
        const isCanceledButActive = subscription?.status === 'canceled' && 
            subscription?.current_period_end && 
            new Date(subscription.current_period_end).getTime() > Date.now();

        const canSync = !!subscription && (activeStatuses.includes(subscription.status) || isCanceledButActive) && subscription.tier !== 'free';

        if (!canSync) {
            return NextResponse.json(
                { error: 'Calendar sync is a Pro feature. Upgrade to use this integration.', requiresUpgrade: true },
                { status: 402 }
            );
        }

        // Get session with provider tokens
        // CRITICAL: This must run immediately after OAuth redirect
        const { data: { session } } = await supabase.auth.getSession();

        logger.debug('DEBUG: Session data:', {
            hasSession: !!session,
            hasProviderToken: !!session?.provider_token,
            hasProviderRefreshToken: !!session?.provider_refresh_token,
            providerTokenLength: session?.provider_token?.length,
            providerRefreshTokenLength: session?.provider_refresh_token?.length
        });

        if (!session?.provider_token) {
            console.error('No provider_token in session');
            return NextResponse.json({
                error: 'No calendar access token found. Please sign in again with calendar access.',
                requiresReauth: true
            }, { status: 400 });
        }

        if (!session?.provider_refresh_token) {
            console.error('No provider_refresh_token in session');
            return NextResponse.json({
                error: 'No refresh token found. Please sign in again and grant calendar access.',
                requiresReauth: true
            }, { status: 400 });
        }

        // Check if connection already exists
        const existingConnection = await CalendarConnectionService.getConnection(
            user.id,
            'google',
            supabase
        );

        if (existingConnection) {
            // Update existing connection with new tokens
            logger.debug('Updating existing calendar connection');
            
            // Get primary calendar ID
            const calendarId = await GoogleCalendarService.getPrimaryCalendar(
                session.provider_token
            );

            // Calculate token expiry (typically 1 hour)
            const tokenExpiry = new Date(Date.now() + 3600 * 1000);

            // Delete old connection and create new one (to update Vault secrets)
            await CalendarConnectionService.deleteConnection(
                user.id,
                'google',
                supabase
            );

            await CalendarConnectionService.createConnection(
                user.id,
                'google',
                session.provider_token,
                session.provider_refresh_token || '',
                tokenExpiry,
                calendarId,
                supabase
            );

            Sentry.addBreadcrumb({
                category: 'calendar_api',
                message: 'Calendar connection updated',
                data: { userId: user.id },
                level: 'info'
            });

            return NextResponse.json({
                success: true,
                message: 'Calendar reconnected successfully',
                hasRefreshToken: true
            });
        }

        // Create new connection
        logger.debug('Creating new calendar connection');

        // Get primary calendar ID
        const calendarId = await GoogleCalendarService.getPrimaryCalendar(
            session.provider_token
        );

        // Calculate token expiry (typically 1 hour)
        const tokenExpiry = new Date(Date.now() + 3600 * 1000);

        // Store connection with tokens in Vault
        await CalendarConnectionService.createConnection(
            user.id,
            'google',
            session.provider_token,
            session.provider_refresh_token || '',
            tokenExpiry,
            calendarId,
            supabase
        );

        Sentry.addBreadcrumb({
            category: 'calendar_api',
            message: 'Calendar connection created',
            data: { userId: user.id },
            level: 'info'
        });

        // Track calendar connection in PostHog
        try {
            const posthog = getPostHogClient();
            posthog.capture({
                distinctId: user.id,
                event: 'calendar_connected',
                properties: {
                    provider: 'google',
                    is_reconnection: false,
                    source: 'api_route',
                }
            });
        } catch (posthogError) {
            logger.error('[PostHog] Failed to track calendar connection:', posthogError);
        }

        return NextResponse.json({
            success: true,
            message: 'Calendar connected successfully',
            hasRefreshToken: true
        });

    } catch (error: unknown) {
        console.error('Error connecting calendar:', error);
        
        Sentry.captureException(error, {
            tags: { api: 'calendar_connect' },
            contexts: {
                request: {
                    url: request.url,
                    method: request.method
                }
            }
        });

        return NextResponse.json({
            error: 'Failed to connect calendar. Please try again.',
            details: getErrorMessage(error)
        }, { status: 500 });
    }
}
