import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({
  authGetUser: vi.fn(),
  createServiceClient: vi.fn(),
  getBlockedUsersForUser: vi.fn(),
  createRateLimiter: vi.fn(),
  checkRateLimit: vi.fn(),
  blockUser: vi.fn(),
  evaluateTrustLevel: vi.fn(),
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

vi.mock('@/utils/rateLimit', () => ({
  createRateLimiter: (...args: unknown[]) => mocks.createRateLimiter(...args),
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

vi.mock('@/services/blockService', () => ({
  BlockService: {
    getBlockedUsersForUser: (...args: unknown[]) => mocks.getBlockedUsersForUser(...args),
    blockUser: (...args: unknown[]) => mocks.blockUser(...args),
  },
}));

vi.mock('@/services/trustLevelService', () => ({
  TrustLevelService: {
    evaluateAndPersistTrustLevel: (...args: unknown[]) => mocks.evaluateTrustLevel(...args),
  },
}));

describe('GET /api/blocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createRateLimiter.mockReturnValue({});
    mocks.checkRateLimit.mockResolvedValue({ success: true });
  });

  it('returns 401 when user is unauthenticated', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.success).toBe(false);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.getBlockedUsersForUser).not.toHaveBeenCalled();
  });

  it('returns 500 when service role env vars are missing', async () => {
    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: '33333333-3333-4333-8333-333333333333' } },
      error: null,
    });
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.getBlockedUsersForUser).not.toHaveBeenCalled();
  });

  it('hydrates blocked user list through service client', async () => {
    const userId = '33333333-3333-4333-8333-333333333333';
    const serviceSupabase = { from: vi.fn() };

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    mocks.authGetUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    mocks.createServiceClient.mockReturnValue(serviceSupabase);
    mocks.getBlockedUsersForUser.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        fullName: 'Blocked User',
        avatarUrl: 'https://example.com/avatar.png',
        username: 'blocked-user',
        headline: 'ML Engineer',
        blockedAt: '2026-02-17T00:00:00.000Z',
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
    expect(mocks.createServiceClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key'
    );
    expect(mocks.getBlockedUsersForUser).toHaveBeenCalledWith(userId, serviceSupabase);
  });
});
