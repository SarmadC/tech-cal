import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceClient: vi.fn(),
  getEventAttendees: vi.fn(),
}));

const userScopedSupabase = {
  auth: {
    getUser: (...args: unknown[]) => mocks.authGetUser(...args),
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => userScopedSupabase),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/services/whosGoingService', () => ({
  WhosGoingService: {
    getEventAttendees: (...args: unknown[]) => mocks.getEventAttendees(...args),
  },
}));

describe('GET /api/events/[id]/attendees', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';

  const buildNextRequest = (url: string) => ({
    nextUrl: new URL(url),
  }) as unknown as Request;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET(
      buildNextRequest(`http://localhost/api/events/${eventId}/attendees`) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      { params: Promise.resolve({ id: eventId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.getEventAttendees).not.toHaveBeenCalled();
  });

  it('uses service client reads for authenticated attendee fetch', async () => {
    const userId = '22222222-2222-4222-8222-222222222222';
    const serviceSupabase = { from: vi.fn() };

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.createServiceClient.mockReturnValue(serviceSupabase);
    mocks.getEventAttendees.mockResolvedValue({
      eventId,
      totalAttending: 3,
      visibleAttendeeCount: 2,
      viewerIsAttending: true,
      attendees: [],
    });

    const response = await GET(
      buildNextRequest(`http://localhost/api/events/${eventId}/attendees?limit=6`) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      { params: Promise.resolve({ id: eventId }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.createServiceClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key'
    );
    expect(mocks.getEventAttendees).toHaveBeenCalledWith(
      eventId,
      userId,
      serviceSupabase,
      6
    );
  });
});
