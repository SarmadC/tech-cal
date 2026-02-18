import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceClient: vi.fn(),
  getNetworkCountsForEvents: vi.fn(),
  createRateLimiter: vi.fn(),
  checkRateLimit: vi.fn(),
}));

const viewerSupabase = {
  auth: {
    getUser: (...args: unknown[]) => mocks.authGetUser(...args),
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => viewerSupabase),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/utils/rateLimit', () => ({
  createRateLimiter: (...args: unknown[]) => mocks.createRateLimiter(...args),
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

vi.mock('@/services/networkEventCountsService', () => ({
  NetworkEventCountsService: {
    getNetworkCountsForEvents: (...args: unknown[]) => mocks.getNetworkCountsForEvents(...args),
  },
}));

const buildNextRequest = (url: string) => ({
  nextUrl: new URL(url),
}) as unknown as Request;

describe('GET /api/events/network-counts', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const eventIdA = '22222222-2222-4222-8222-222222222222';
  const eventIdB = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.createRateLimiter.mockReturnValue({});
    mocks.checkRateLimit.mockResolvedValue({ success: true });
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET(
      buildNextRequest(`http://localhost/api/events/network-counts?eventIds=${eventIdA}`) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.getNetworkCountsForEvents).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.checkRateLimit.mockResolvedValue({ success: false });

    const response = await GET(
      buildNextRequest(`http://localhost/api/events/network-counts?eventIds=${eventIdA}`) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.success).toBe(false);
    expect(mocks.getNetworkCountsForEvents).not.toHaveBeenCalled();
  });

  it('returns parsed network count payload', async () => {
    const readSupabase = { from: vi.fn() };

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.createServiceClient.mockReturnValue(readSupabase);
    mocks.getNetworkCountsForEvents.mockResolvedValue([
      {
        eventId: eventIdA,
        networkCount: 2,
        sampleAvatars: ['https://example.com/a.png'],
      },
      {
        eventId: eventIdB,
        networkCount: 0,
        sampleAvatars: [],
      },
    ]);

    const response = await GET(
      buildNextRequest(`http://localhost/api/events/network-counts?eventIds=${eventIdA},${eventIdB}`) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.createServiceClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key'
    );
    expect(mocks.getNetworkCountsForEvents).toHaveBeenCalledWith(
      userId,
      [eventIdA, eventIdB],
      readSupabase
    );
    expect(payload.data.counts).toHaveLength(2);
  });

  it('returns 400 for invalid event ids', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });

    const response = await GET(
      buildNextRequest('http://localhost/api/events/network-counts?eventIds=invalid-id') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(mocks.getNetworkCountsForEvents).not.toHaveBeenCalled();
  });
});

