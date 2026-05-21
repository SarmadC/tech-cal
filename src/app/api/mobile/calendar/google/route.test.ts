import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bulkSyncExistingEvents: vi.fn(),
  createConnection: vi.fn(),
  createAdminClient: vi.fn(),
  deleteConnection: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  getConnection: vi.fn(),
  getPrimaryCalendar: vi.fn(),
  replaceConnectionCredentials: vi.fn(),
  syncTrackedEvent: vi.fn(),
  unsyncTrackedEvent: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/services/calendarConnectionService', () => ({
  CalendarConnectionService: {
    createConnection: (...args: unknown[]) => mocks.createConnection(...args),
    deleteConnection: (...args: unknown[]) => mocks.deleteConnection(...args),
    getConnection: (...args: unknown[]) => mocks.getConnection(...args),
    replaceConnectionCredentials: (...args: unknown[]) =>
      mocks.replaceConnectionCredentials(...args),
  },
}));

vi.mock('@/services/googleCalendarService', () => ({
  GoogleCalendarService: {
    getPrimaryCalendar: (...args: unknown[]) => mocks.getPrimaryCalendar(...args),
  },
}));

vi.mock('@/services/calendarSyncService', () => ({
  CalendarSyncService: {
    bulkSyncExistingEvents: (...args: unknown[]) =>
      mocks.bulkSyncExistingEvents(...args),
    syncTrackedEvent: (...args: unknown[]) => mocks.syncTrackedEvent(...args),
    unsyncTrackedEvent: (...args: unknown[]) => mocks.unsyncTrackedEvent(...args),
  },
}));

vi.mock('@/utils/supabase/server', () => ({
  createAdminClient: (...args: unknown[]) => mocks.createAdminClient(...args),
}));

import { POST as bulkSyncGoogleCalendar } from './bulk-sync/route';
import { GET as callbackGoogleCalendar } from './callback/route';
import { POST as disconnectGoogleCalendar } from './disconnect/route';
import { POST as syncGoogleCalendar } from './sync/route';
import { GET as startGoogleCalendar } from './start/route';
import { GET as getGoogleCalendarStatus } from './status/route';

function buildSupabase({
  subscription = {
    status: 'active',
    tier: 'pro',
    current_period_end: null,
    entitlements: { calendar_sync: true },
  },
  userEvent = {
    external_calendar_event_id: 'google-event-1',
    external_provider: 'google',
  },
}: {
  subscription?: unknown;
  userEvent?: unknown;
} = {}) {
  const updateEq = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
  const update = vi.fn(() => ({ eq: updateEq }));

  return {
    from: vi.fn((table: string) => {
      if (table === 'subscriptions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: subscription,
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === 'user_events') {
        const secondEq = vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: userEvent,
            error: null,
          }),
        }));
        const firstEq = vi.fn(() => ({ eq: secondEq }));

        return {
          select: vi.fn(() => ({ eq: firstEq })),
          update,
        };
      }

      return {};
    }),
    update,
  };
}

function mockAuth(supabase = buildSupabase()) {
  mocks.getAuthenticatedRequestContext.mockResolvedValue({
    authMethod: 'bearer',
    supabase,
    user: { id: 'user-1' },
  });
  return supabase;
}

describe('mobile Google Calendar routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', 'google-client-id');
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_SECRET', 'google-client-secret');
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'public-google-client-id');
    mockAuth();
    mocks.createAdminClient.mockResolvedValue({ admin: true });
    mocks.getConnection.mockResolvedValue({
      provider: 'google',
      calendar_id: 'primary',
      is_active: true,
      has_refresh_token: true,
      last_sync_status: 'success',
      last_sync_at: '2026-05-01T00:00:00.000Z',
      last_sync_error: null,
    });
    mocks.getPrimaryCalendar.mockResolvedValue('primary');
    mocks.syncTrackedEvent.mockResolvedValue({ success: true });
    mocks.unsyncTrackedEvent.mockResolvedValue({ success: true });
    mocks.bulkSyncExistingEvents.mockResolvedValue({
      total: 2,
      synced: 2,
      failed: 0,
      errors: [],
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await getGoogleCalendarStatus(
      new Request('http://localhost/api/mobile/calendar/google/status')
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
  });

  it('returns Google Calendar connection status', async () => {
    const response = await getGoogleCalendarStatus(
      new Request('http://localhost/api/mobile/calendar/google/status')
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.connected).toBe(true);
    expect(payload.data.calendarId).toBe('primary');
    expect(payload.data.requiresUpgrade).toBe(false);
  });

  it('blocks Google OAuth start for users without calendar sync entitlement', async () => {
    mockAuth(
      buildSupabase({
        subscription: {
          entitlements: { calendar_sync: false },
          status: 'active',
          tier: 'free',
          current_period_end: null,
        },
      })
    );

    const response = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal-dev://calendar/google/callback'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.requiresUpgrade).toBe(true);
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });

  it('blocks Google OAuth start when the explicit calendar sync entitlement is disabled', async () => {
    mockAuth(
      buildSupabase({
        subscription: {
          entitlements: { calendar_sync: false },
          status: 'active',
          tier: 'pro',
          current_period_end: null,
        },
      })
    );

    const response = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal-dev://calendar/google/callback'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(402);
    expect(payload.requiresUpgrade).toBe(true);
  });

  it('starts Google OAuth with a signed mobile callback state', async () => {
    const response = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal://calendar/google/callback'
      )
    );
    const payload = await response.json();
    const authUrl = new URL(payload.data.authUrl);

    expect(response.status).toBe(200);
    expect(authUrl.origin).toBe('https://accounts.google.com');
    expect(authUrl.searchParams.get('scope')).toBe(
      'https://www.googleapis.com/auth/calendar'
    );
    expect(authUrl.searchParams.get('access_type')).toBe('offline');
    expect(authUrl.searchParams.get('prompt')).toBe('consent');
    expect(authUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost/api/mobile/calendar/google/callback'
    );
    expect(authUrl.searchParams.get('client_id')).toBe('google-client-id');
    expect(authUrl.searchParams.get('client_id')).not.toBe(
      'public-google-client-id'
    );
    expect(authUrl.searchParams.get('state')).toContain('.');
    expect(payload.data.returnUrl).toBe('kurecal://calendar/google/callback');
  });

  it('fails closed when the server Google OAuth config is missing', async () => {
    vi.stubEnv('GOOGLE_OAUTH_CLIENT_ID', '');

    const response = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal-dev://calendar/google/callback'
      )
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('GOOGLE_OAUTH_CLIENT_ID is not configured.');
  });

  it('creates a Google Calendar connection from the OAuth callback', async () => {
    mocks.getConnection.mockResolvedValueOnce(null);
    const startResponse = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal-dev://calendar/google/callback'
      )
    );
    const startPayload = await startResponse.json();
    const state = new URL(startPayload.data.authUrl).searchParams.get('state');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'access',
            expires_in: 3600,
            refresh_token: 'refresh',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const response = await callbackGoogleCalendar(
      new Request(
        `http://localhost/api/mobile/calendar/google/callback?code=code-1&state=${encodeURIComponent(
          state ?? ''
        )}`
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('connected=true');
    const tokenRequest = vi.mocked(fetch).mock.calls[0]?.[1] as
      | RequestInit
      | undefined;
    const tokenBody = tokenRequest?.body as URLSearchParams | undefined;
    expect(tokenBody?.get('client_id')).toBe('google-client-id');
    expect(tokenBody?.get('client_secret')).toBe('google-client-secret');
    expect(mocks.createAdminClient).toHaveBeenCalled();
    expect(mocks.getPrimaryCalendar).toHaveBeenCalledWith('access');
    expect(mocks.createConnection).toHaveBeenCalledWith(
      'user-1',
      'google',
      'access',
      'refresh',
      expect.any(Date),
      'primary',
      expect.anything()
    );
    expect(mocks.deleteConnection).not.toHaveBeenCalled();
  });

  it('replaces Google Calendar credentials on reconnect without deleting the connection first', async () => {
    const startResponse = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal-dev://calendar/google/callback'
      )
    );
    const startPayload = await startResponse.json();
    const state = new URL(startPayload.data.authUrl).searchParams.get('state');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'new-access',
            expires_in: 3600,
            refresh_token: 'new-refresh',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const response = await callbackGoogleCalendar(
      new Request(
        `http://localhost/api/mobile/calendar/google/callback?code=code-1&state=${encodeURIComponent(
          state ?? ''
        )}`
      )
    );

    expect(response.status).toBe(307);
    expect(mocks.replaceConnectionCredentials).toHaveBeenCalledWith(
      'user-1',
      'google',
      'new-access',
      'new-refresh',
      expect.any(Date),
      'primary',
      expect.anything()
    );
    expect(mocks.deleteConnection).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });

  it('preserves the existing Google refresh token when reconnect omits a new one', async () => {
    const startResponse = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal-dev://calendar/google/callback'
      )
    );
    const startPayload = await startResponse.json();
    const state = new URL(startPayload.data.authUrl).searchParams.get('state');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'new-access',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const response = await callbackGoogleCalendar(
      new Request(
        `http://localhost/api/mobile/calendar/google/callback?code=code-1&state=${encodeURIComponent(
          state ?? ''
        )}`
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('connected=true');
    expect(mocks.replaceConnectionCredentials).toHaveBeenCalledWith(
      'user-1',
      'google',
      'new-access',
      null,
      expect.any(Date),
      'primary',
      expect.anything()
    );
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });

  it('rejects first-time Google connections when the callback omits a refresh token', async () => {
    mocks.getConnection.mockResolvedValueOnce(null);
    const startResponse = await startGoogleCalendar(
      new Request(
        'http://localhost/api/mobile/calendar/google/start?returnUrl=kurecal-dev://calendar/google/callback'
      )
    );
    const startPayload = await startResponse.json();
    const state = new URL(startPayload.data.authUrl).searchParams.get('state');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: 'access',
            expires_in: 3600,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    const response = await callbackGoogleCalendar(
      new Request(
        `http://localhost/api/mobile/calendar/google/callback?code=code-1&state=${encodeURIComponent(
          state ?? ''
        )}`
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('error=missing_tokens');
    expect(mocks.getPrimaryCalendar).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });

  it('syncs and unsyncs events through the shared CalendarSyncService', async () => {
    const syncResponse = await syncGoogleCalendar(
      new Request('http://localhost/api/mobile/calendar/google/sync', {
        method: 'POST',
        body: JSON.stringify({ eventId: 'event-1', action: 'sync' }),
      })
    );
    const unsyncResponse = await syncGoogleCalendar(
      new Request('http://localhost/api/mobile/calendar/google/sync', {
        method: 'POST',
        body: JSON.stringify({ eventId: 'event-1', action: 'delete' }),
      })
    );

    expect(syncResponse.status).toBe(200);
    expect(unsyncResponse.status).toBe(200);
    expect(mocks.syncTrackedEvent).toHaveBeenCalledWith(
      'user-1',
      'event-1',
      expect.anything()
    );
    expect(mocks.unsyncTrackedEvent).toHaveBeenCalledWith(
      'user-1',
      'event-1',
      'google-event-1',
      expect.anything()
    );
  });

  it('bulk syncs existing tracked events and disconnects Google Calendar', async () => {
    const bulkResponse = await bulkSyncGoogleCalendar(
      new Request('http://localhost/api/mobile/calendar/google/bulk-sync', {
        method: 'POST',
      })
    );
    const disconnectResponse = await disconnectGoogleCalendar(
      new Request('http://localhost/api/mobile/calendar/google/disconnect', {
        method: 'POST',
      })
    );
    const bulkPayload = await bulkResponse.json();
    const disconnectPayload = await disconnectResponse.json();

    expect(bulkResponse.status).toBe(200);
    expect(bulkPayload.data.synced).toBe(2);
    expect(mocks.bulkSyncExistingEvents).toHaveBeenCalledWith(
      'user-1',
      expect.anything()
    );
    expect(disconnectResponse.status).toBe(200);
    expect(disconnectPayload.data.connected).toBe(false);
    expect(mocks.deleteConnection).toHaveBeenCalledWith(
      'user-1',
      'google',
      expect.anything()
    );
  });
});
