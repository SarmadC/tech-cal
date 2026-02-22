import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceClient: vi.fn(),
  getFollowers: vi.fn(),
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

vi.mock('@/services/followService', () => ({
  FollowService: {
    getFollowers: (...args: unknown[]) => mocks.getFollowers(...args),
  },
}));

describe('GET /api/follows/followers', () => {
  const viewerId = '11111111-1111-4111-8111-111111111111';

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

    const response = await GET(buildNextRequest('http://localhost/api/follows/followers') as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.getFollowers).not.toHaveBeenCalled();
  });

  it('hydrates follower list through service role reads', async () => {
    const serviceSupabase = { from: vi.fn() };
    const targetUserId = '22222222-2222-4222-8222-222222222222';

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: viewerId } },
      error: null,
    });
    mocks.createServiceClient.mockReturnValue(serviceSupabase);
    mocks.getFollowers.mockResolvedValue({
      users: [],
      nextCursor: null,
    });

    const response = await GET(
      buildNextRequest(
        `http://localhost/api/follows/followers?userId=${targetUserId}&limit=12&cursor=2026-02-17T00:00:00.000Z`
      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.createServiceClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key'
    );
    expect(mocks.getFollowers).toHaveBeenCalledWith(
      targetUserId,
      viewerId,
      userScopedSupabase,
      serviceSupabase,
      {
        limit: 12,
        cursor: '2026-02-17T00:00:00.000Z',
      }
    );
  });
});
