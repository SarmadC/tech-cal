import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

function createNextRequest(url: string, init?: RequestInit) {
  const request = new Request(url, init);
  return Object.assign(request, {
    nextUrl: new URL(url),
  });
}

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  searchUsers: vi.fn(),
  createRateLimiter: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
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

describe('GET /api/mobile/community/directory', () => {
  const authContext = {
    authMethod: 'bearer' as const,
    supabase: { kind: 'viewer-supabase' },
    user: { id: '22222222-2222-4222-8222-222222222222' },
  };

  const person = {
    id: '33333333-3333-4333-8333-333333333333',
    fullName: 'Ada Lovelace',
    avatarUrl: null,
    username: 'ada',
    headline: 'Computing pioneer',
    joinedAt: '2026-04-01T00:00:00.000Z',
    followerCount: 10,
    followingCount: 3,
    activity: {
      upcomingAttendingCount: 1,
      attendingThisWeekCount: 1,
      sharedSavedEventCount: 0,
      recentFollowerCount: 2,
      isViewerFollowing: false,
      sharedCircleCount: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mocks.createRateLimiter.mockReturnValue({});
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.createServiceClient.mockReturnValue({ kind: 'read-supabase' });
    mocks.getAuthenticatedRequestContext.mockResolvedValue(authContext);
    mocks.searchUsers.mockResolvedValue({
      users: [person],
      nextCursor: 'next-cursor',
      highlights: {
        attendingSavedEvents: [person],
        networkAttendingThisWeek: [],
        newMembers: [person],
      },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await GET(
      createNextRequest('http://localhost/api/mobile/community/directory?q=ada') as never
    );

    expect(response.status).toBe(401);
    expect(mocks.searchUsers).not.toHaveBeenCalled();
  });

  it('maps user search results to the mobile directory contract', async () => {
    const response = await GET(
      createNextRequest(
        'http://localhost/api/mobile/community/directory?q=ada&limit=8&cursor=cursor',
        {
          headers: { Authorization: 'Bearer mobile-token' },
        }
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.people[0].username).toBe('ada');
    expect(payload.data.nextCursor).toBe('next-cursor');
    expect(mocks.searchUsers).toHaveBeenCalledWith(
      authContext.user.id,
      authContext.supabase,
      { kind: 'read-supabase' },
      {
        q: 'ada',
        limit: 8,
        cursor: 'cursor',
      }
    );
  });

  it('returns 429 when rate limited', async () => {
    mocks.checkRateLimit.mockResolvedValueOnce({ success: false });

    const response = await GET(
      createNextRequest('http://localhost/api/mobile/community/directory?q=ada') as never
    );

    expect(response.status).toBe(429);
    expect(mocks.searchUsers).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid cursors thrown by the service', async () => {
    mocks.searchUsers.mockRejectedValueOnce(new Error('Invalid pagination cursor.'));

    const response = await GET(
      createNextRequest(
        'http://localhost/api/mobile/community/directory?cursor=bad-cursor'
      ) as never
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid pagination cursor.');
  });
});
