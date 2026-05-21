import * as WebBrowser from 'expo-web-browser';

import { getMobileApiBaseUrl, getMobileRuntimeMetadata } from './env';
import { sessionStorage } from './sessionStorage';
import { supabase } from './supabase';

const MOBILE_CALENDAR_OAUTH_RETURN_KEY = 'mobile_calendar_oauth_return_url';

export async function startGoogleCalendarOAuth(): Promise<boolean> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token?.trim();
  if (!accessToken) {
    throw new Error('Sign in required');
  }

  const returnUrl = `${getMobileRuntimeMetadata().scheme}://calendar/google/callback`;
  const startUrl = new URL(
    '/api/mobile/calendar/google/start',
    getMobileApiBaseUrl()
  );
  startUrl.searchParams.set('returnUrl', returnUrl);

  const response = await fetch(startUrl.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: { authUrl?: string; returnUrl?: string };
    error?: string;
    success?: boolean;
  };

  if (!response.ok || payload.success === false || !payload.data?.authUrl) {
    throw new Error(payload.error || 'Unable to start Google Calendar authorization.');
  }

  if (payload.data.returnUrl) {
    await sessionStorage.setItem(
      MOBILE_CALENDAR_OAUTH_RETURN_KEY,
      payload.data.returnUrl
    );
  }

  const result = await WebBrowser.openAuthSessionAsync(
    payload.data.authUrl,
    payload.data.returnUrl
  );

  if (result.type !== 'success') {
    return false;
  }

  return result.url.includes('connected=true');
}

export async function loadGoogleCalendarOAuthReturnUrl(): Promise<string | null> {
  return sessionStorage.getItem(MOBILE_CALENDAR_OAUTH_RETURN_KEY);
}
