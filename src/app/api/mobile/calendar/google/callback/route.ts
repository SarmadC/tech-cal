import crypto from 'crypto';
import { NextResponse } from 'next/server';

import { CalendarConnectionService } from '@/services/calendarConnectionService';
import { GoogleCalendarService } from '@/services/googleCalendarService';
import {
  getGoogleOAuthClientId,
  getGoogleOAuthClientSecret,
  getGoogleOAuthStateSecret,
} from '@/services/googleCalendarOAuthConfig';
import { createAdminClient } from '@/utils/supabase/server';

interface OAuthStatePayload {
  expiresAt: number;
  returnUrl: string;
  userId: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function decodeState(state: string | null): OAuthStatePayload | null {
  const [body, signature] = state?.split('.') ?? [];
  if (!body || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', getGoogleOAuthStateSecret())
    .update(body)
    .digest('base64url');

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as OAuthStatePayload;
    if (!payload.userId || !payload.returnUrl || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function redirectWithResult(returnUrl: string, params: Record<string, string>) {
  const target = new URL(returnUrl);
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }

  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const statePayload = decodeState(requestUrl.searchParams.get('state'));
  const returnUrl = statePayload?.returnUrl ?? 'kurecal-dev://calendar/google/callback';

  try {
    const code = requestUrl.searchParams.get('code');
    const oauthError = requestUrl.searchParams.get('error');

    if (oauthError) {
      return redirectWithResult(returnUrl, { error: oauthError });
    }

    if (!code || !statePayload) {
      return redirectWithResult(returnUrl, { error: 'invalid_request' });
    }

    const origin = requestUrl.origin;
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
        redirect_uri: `${origin}/api/mobile/calendar/google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      return redirectWithResult(returnUrl, { error: 'token_exchange_failed' });
    }

    const tokens = (await tokenResponse.json()) as {
      access_token?: string;
      expires_in?: number;
      refresh_token?: string;
    };

    if (!tokens.access_token) {
      return redirectWithResult(returnUrl, { error: 'missing_tokens' });
    }

    const supabase = await createAdminClient();
    const existing = await CalendarConnectionService.getConnection(
      statePayload.userId,
      'google',
      supabase
    );
    const refreshToken = tokens.refresh_token ?? null;

    if (!refreshToken && !existing) {
      return redirectWithResult(returnUrl, { error: 'missing_tokens' });
    }

    const calendarId = await GoogleCalendarService.getPrimaryCalendar(
      tokens.access_token
    );
    const tokenExpiry = new Date(
      Date.now() + Math.max(tokens.expires_in ?? 3600, 60) * 1000
    );

    if (existing) {
      await CalendarConnectionService.replaceConnectionCredentials(
        statePayload.userId,
        'google',
        tokens.access_token,
        refreshToken,
        tokenExpiry,
        calendarId,
        supabase
      );
    } else {
      if (!refreshToken) {
        return redirectWithResult(returnUrl, { error: 'missing_tokens' });
      }

      await CalendarConnectionService.createConnection(
        statePayload.userId,
        'google',
        tokens.access_token,
        refreshToken,
        tokenExpiry,
        calendarId,
        supabase
      );
    }

    return redirectWithResult(returnUrl, { connected: 'true' });
  } catch {
    return redirectWithResult(returnUrl, { error: 'callback_error' });
  }
}
