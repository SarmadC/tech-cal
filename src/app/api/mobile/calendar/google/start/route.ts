import crypto from 'crypto';
import { NextResponse } from 'next/server';

import {
  mobileDataResponse,
  requireCalendarSyncEntitlement,
  requireMobileAuth,
} from '../_shared';
import {
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  getGoogleOAuthStateSecret,
} from '@/services/googleCalendarOAuthConfig';

const OAUTH_STATE_TTL_SECONDS = 10 * 60;

function encodeState(payload: {
  expiresAt: number;
  returnUrl: string;
  userId: string;
}) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getGoogleOAuthStateSecret())
    .update(body)
    .digest('base64url');

  return `${body}.${signature}`;
}

function isAllowedMobileReturnUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'kurecal:' || parsed.protocol === 'kurecal-dev:') &&
      parsed.host === 'calendar' &&
      parsed.pathname === '/google/callback'
    );
  } catch {
    return false;
  }
}

function resolveMobileReturnUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const configured = requestUrl.searchParams.get('returnUrl')?.trim();
  if (configured && isAllowedMobileReturnUrl(configured)) {
    return configured;
  }

  return 'kurecal-dev://calendar/google/callback';
}

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await requireMobileAuth(request);
  if ('response' in auth) {
    return auth.response;
  }

  try {
    const { supabase, user } = auth.authContext;
    const entitlementResponse = await requireCalendarSyncEntitlement(
      supabase,
      user.id
    );
    if (entitlementResponse) {
      return entitlementResponse;
    }

    const googleClientId = getGoogleOAuthClientId();
    getGoogleOAuthClientSecret();

    const origin = new URL(request.url).origin;
    const returnUrl = resolveMobileReturnUrl(request);
    const state = encodeState({
      expiresAt: Date.now() + OAUTH_STATE_TTL_SECONDS * 1000,
      returnUrl,
      userId: user.id,
    });
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', googleClientId);
    authUrl.searchParams.set(
      'redirect_uri',
      `${origin}/api/mobile/calendar/google/callback`
    );
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    const response = mobileDataResponse({
      authUrl: authUrl.toString(),
      returnUrl,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to start Google Calendar authorization',
      },
      { status: 500 }
    );
  }
}
