import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createRateLimiter: vi.fn(),
  checkRateLimit: vi.fn(),
  evaluateTrustLevel: vi.fn(),
  followUser: vi.fn(),
}));

const userScopedSupabase = {
  auth: {
    getUser: (...args: unknown[]) => mocks.authGetUser(...args),
  },
};

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(async () => userScopedSupabase),
}));

vi.mock('@/utils/rateLimit', () => ({
  createRateLimiter: (...args: unknown[]) => mocks.createRateLimiter(...args),
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

vi.mock('@/services/trustLevelService', () => ({
  TrustLevelService: {
    evaluateAndPersistTrustLevel: (...args: unknown[]) => mocks.evaluateTrustLevel(...args),
  },
}));

vi.mock('@/services/followService', () => ({
  FollowService: {
    followUser: (...args: unknown[]) => mocks.followUser(...args),
  },
}));

describe('POST /api/follows', () => {
  const viewerId = '11111111-1111-4111-8111-111111111111';
  const targetUserId = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createRateLimiter.mockReturnValue({});
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.followUser.mockResolvedValue(undefined);
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST({
      headers: new Headers(),
      json: async () => ({ userId: targetUserId }),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.followUser).not.toHaveBeenCalled();
  });

  it('returns 403 when trust level is below follow threshold', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: viewerId } },
      error: null,
    });
    mocks.evaluateTrustLevel.mockResolvedValue({
      level: 0,
      accountAgeDays: 2,
      hasCompletedOnboarding: true,
      bookmarkedEventsCount: 1,
    });

    const response = await POST({
      json: async () => ({ userId: targetUserId }),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(mocks.followUser).not.toHaveBeenCalled();
  });

  it('follows target user when request is valid and trust-gated', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: viewerId } },
      error: null,
    });
    mocks.evaluateTrustLevel.mockResolvedValue({
      level: 1,
      accountAgeDays: 10,
      hasCompletedOnboarding: true,
      bookmarkedEventsCount: 1,
    });

    const response = await POST({
      json: async () => ({ userId: targetUserId }),
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.followUser).toHaveBeenCalledWith(viewerId, targetUserId, userScopedSupabase);
  });
});
