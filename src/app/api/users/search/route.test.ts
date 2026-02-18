import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceClient: vi.fn(),
  searchUsers: vi.fn(),
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

vi.mock('@/services/userSearchService', () => ({
  UserSearchService: {
    searchUsers: (...args: unknown[]) => mocks.searchUsers(...args),
  },
}));

const buildNextRequest = (url: string) => ({
  nextUrl: new URL(url),
}) as unknown as Request;

describe('GET /api/users/search', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

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
      buildNextRequest('http://localhost/api/users/search?q=test') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.searchUsers).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.checkRateLimit.mockResolvedValue({ success: false });

    const response = await GET(
      buildNextRequest('http://localhost/api/users/search?q=test') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(429);
    expect(payload.success).toBe(false);
    expect(mocks.searchUsers).not.toHaveBeenCalled();
  });

  it('returns search result payload with parsed params', async () => {
    const readSupabase = { from: vi.fn() };

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.createServiceClient.mockReturnValue(readSupabase);
    mocks.searchUsers.mockResolvedValue({
      users: [],
      nextCursor: null,
    });

    const response = await GET(
      buildNextRequest(
        'http://localhost/api/users/search?q=ml&hasHeadline=true&limit=12&cursor=eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTE3VDAwOjAwOjAwLjAwMFoiLCJpZCI6IjIyMjIyMjIyLTIyMjItNDIyMi04MjIyLTIyMjIyMjIyMjIyMiJ9'
      ) as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.createServiceClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key'
    );
    expect(mocks.searchUsers).toHaveBeenCalledWith(
      userId,
      viewerSupabase,
      readSupabase,
      {
        q: 'ml',
        hasHeadline: true,
        limit: 12,
        cursor: 'eyJjcmVhdGVkQXQiOiIyMDI2LTAyLTE3VDAwOjAwOjAwLjAwMFoiLCJpZCI6IjIyMjIyMjIyLTIyMjItNDIyMi04MjIyLTIyMjIyMjIyMjIyMiJ9',
      }
    );
  });

  it('returns 400 when search service rejects invalid cursor', async () => {
    const readSupabase = { from: vi.fn() };

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.createServiceClient.mockReturnValue(readSupabase);
    mocks.searchUsers.mockRejectedValue(new Error('Invalid pagination cursor.'));

    const response = await GET(
      buildNextRequest('http://localhost/api/users/search?cursor=bad-cursor') as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Invalid pagination cursor.');
  });
});
