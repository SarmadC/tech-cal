import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  createRateLimiter: vi.fn((..._args: unknown[]) => ({})),
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  searchUsers: vi.fn(),
}));

const viewerSupabase = { from: vi.fn() };

vi.mock('@/utils/rateLimit', () => ({
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
  createRateLimiter: (...args: unknown[]) => mocks.createRateLimiter(...args),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

vi.mock('@/services/userSearchService', () => ({
  UserSearchService: {
    searchUsers: (...args: unknown[]) => mocks.searchUsers(...args),
  },
}));

const buildNextRequest = (url: string) => ({
  nextUrl: new URL(url),
}) as unknown as Request;

describe('GET /api/mobile/community/mentions', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.createRateLimiter.mockReturnValue({});
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      user: { id: userId },
      supabase: viewerSupabase,
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await GET(
      buildNextRequest('http://localhost/api/mobile/community/mentions?q=ada') as any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.searchUsers).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockResolvedValue({ success: false });

    const response = await GET(
      buildNextRequest('http://localhost/api/mobile/community/mentions?q=ada') as any
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.success).toBe(false);
    expect(mocks.searchUsers).not.toHaveBeenCalled();
  });

  it('returns mention candidates from public user search', async () => {
    const readSupabase = { from: vi.fn() };
    mocks.createServiceClient.mockReturnValue(readSupabase);
    mocks.searchUsers.mockResolvedValue({
      users: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          username: 'ada',
          fullName: 'Ada Lovelace',
          avatarUrl: null,
        },
        {
          id: '33333333-3333-4333-8333-333333333333',
          username: null,
          fullName: 'No Username',
          avatarUrl: null,
        },
      ],
    });

    const response = await GET(
      buildNextRequest('http://localhost/api/mobile/community/mentions?q=ada') as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(expect.anything(), userId);
    expect(mocks.searchUsers).toHaveBeenCalledWith(
      userId,
      viewerSupabase,
      readSupabase,
      { q: 'ada', limit: 8 }
    );
    expect(payload.data).toEqual([
      {
        id: '22222222-2222-4222-8222-222222222222',
        username: 'ada',
        fullName: 'Ada Lovelace',
        avatarUrl: null,
      },
    ]);
  });
});
