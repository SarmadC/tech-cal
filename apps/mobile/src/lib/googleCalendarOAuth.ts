import * as WebBrowser from 'expo-web-browser';

import { getMobileApiBaseUrl, getMobileRuntimeMetadata } from './env';
import { sessionStorage } from './sessionStorage';
import { supabase } from './supabase';

const MOBILE_CALENDAR_OAUTH_RETURN_KEY = 'mobile_calendar_oauth_return_url';

function getOAuthCallbackErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'invalid_request':
      return 'Google Calendar authorization expired. Please connect again.';
    case 'missing_tokens':
      return 'Google did not provide the required calendar permissions. Please connect again.';
    case 'token_exchange_failed':
      return 'Google Calendar authorization could not be completed. Please connect again.';
    default:
      return 'Google Calendar connection failed. Please try again.';
  }
}

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

  const callbackUrl = new URL(result.url);
  const callbackError = callbackUrl.searchParams.get('error');
  if (callbackError) {
    throw new Error(getOAuthCallbackErrorMessage(callbackError));
  }

  return callbackUrl.searchParams.get('connected') === 'true';
}

export async function loadGoogleCalendarOAuthReturnUrl(): Promise<string | null> {
  return sessionStorage.getItem(MOBILE_CALENDAR_OAUTH_RETURN_KEY);
}
