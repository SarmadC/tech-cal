import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  openAuthSessionAsync: vi.fn(),
  setItem: vi.fn(),
}));

vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync: (...args: unknown[]) =>
    mocks.openAuthSessionAsync(...args),
}));

vi.mock('./env', () => ({
  getMobileApiBaseUrl: () => 'https://mobile.kurecal.test',
  getMobileRuntimeMetadata: () => ({ scheme: 'kurecal' }),
}));

vi.mock('./sessionStorage', () => ({
  sessionStorage: {
    getItem: vi.fn(),
    setItem: (...args: unknown[]) => mocks.setItem(...args),
  },
}));

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
    },
  },
}));

import { startGoogleCalendarOAuth } from './googleCalendarOAuth';

describe('Google Calendar OAuth helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'mobile-token',
        },
      },
    });
  });

  it('starts the backend-owned OAuth flow with bearer auth and mobile return URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              authUrl: 'https://accounts.google.com/o/oauth2/v2/auth?state=abc',
              returnUrl: 'kurecal://calendar/google/callback',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    mocks.openAuthSessionAsync.mockResolvedValue({
      type: 'success',
      url: 'kurecal://calendar/google/callback?connected=true',
    });

    await expect(startGoogleCalendarOAuth()).resolves.toBe(true);

    expect(fetch).toHaveBeenCalledWith(
      'https://mobile.kurecal.test/api/mobile/calendar/google/start?returnUrl=kurecal%3A%2F%2Fcalendar%2Fgoogle%2Fcallback',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer mobile-token',
        },
      })
    );
    expect(mocks.setItem).toHaveBeenCalledWith(
      'mobile_calendar_oauth_return_url',
      'kurecal://calendar/google/callback'
    );
    expect(mocks.openAuthSessionAsync).toHaveBeenCalledWith(
      'https://accounts.google.com/o/oauth2/v2/auth?state=abc',
      'kurecal://calendar/google/callback'
    );
  });

  it('requires an active mobile auth session', async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null } });

    await expect(startGoogleCalendarOAuth()).rejects.toThrow('Sign in required');
  });
});
