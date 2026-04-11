import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  createServiceClient: vi.fn(),
  getBlockedUsersForUser: vi.fn(),
  createRateLimiter: vi.fn(),
  checkRateLimit: vi.fn(),
  blockUser: vi.fn(),
  evaluateTrustLevel: vi.fn(),
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

vi.mock('@/services/blockService', () => ({
  BlockService: {
    getBlockedUsersForUser: (...args: unknown[]) =>
      mocks.getBlockedUsersForUser(...args),
    blockUser: (...args: unknown[]) => mocks.blockUser(...args),
  },
}));

vi.mock('@/services/trustLevelService', () => ({
  TrustLevelService: {
    evaluateAndPersistTrustLevel: (...args: unknown[]) =>
      mocks.evaluateTrustLevel(...args),
  },
}));

describe('/api/blocks', () => {
  const authContext = {
    authMethod: 'bearer' as const,
    supabase: { from: vi.fn() },
    user: { id: '33333333-3333-4333-8333-333333333333' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createRateLimiter.mockReturnValue({});
    mocks.checkRateLimit.mockResolvedValue({ success: true });
    mocks.getAuthenticatedRequestContext.mockResolvedValue(authContext);
  });

  describe('GET', () => {
    it('returns 401 when user is unauthenticated', async () => {
      mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

      const response = await GET(
        new Request('http://localhost/api/blocks') as never
      );
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.success).toBe(false);
      expect(mocks.createServiceClient).not.toHaveBeenCalled();
      expect(mocks.getBlockedUsersForUser).not.toHaveBeenCalled();
    });

    it('returns 500 when service role env vars are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const response = await GET(
        new Request('http://localhost/api/blocks') as never
      );
      const payload = await response.json();

      expect(response.status).toBe(500);
      expect(payload.success).toBe(false);
      expect(mocks.createServiceClient).not.toHaveBeenCalled();
      expect(mocks.getBlockedUsersForUser).not.toHaveBeenCalled();
    });

    it('hydrates blocked user list through the service client', async () => {
      const serviceSupabase = { from: vi.fn() };

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
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

      const response = await GET(
        new Request('http://localhost/api/blocks', {
          headers: { Authorization: 'Bearer mobile-token' },
        }) as never
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.data).toHaveLength(1);
      expect(mocks.createServiceClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'service-role-key'
      );
      expect(mocks.getBlockedUsersForUser).toHaveBeenCalledWith(
        authContext.user.id,
        serviceSupabase
      );
    });
  });

  describe('POST', () => {
    it('returns 401 when user is unauthenticated', async () => {
      mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

      const response = await POST(
        new Request('http://localhost/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            blockedUserId: '44444444-4444-4444-8444-444444444444',
          }),
        }) as never
      );

      expect(response.status).toBe(401);
      expect(mocks.blockUser).not.toHaveBeenCalled();
    });

    it('returns 429 when rate limited', async () => {
      mocks.checkRateLimit.mockResolvedValueOnce({ success: false });

      const response = await POST(
        new Request('http://localhost/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            blockedUserId: '44444444-4444-4444-8444-444444444444',
          }),
        }) as never
      );
      const payload = await response.json();

      expect(response.status).toBe(429);
      expect(payload.success).toBe(false);
      expect(mocks.blockUser).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid input', async () => {
      const response = await POST(
        new Request('http://localhost/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            blockedUserId: 'not-a-uuid',
          }),
        }) as never
      );
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.success).toBe(false);
      expect(mocks.blockUser).not.toHaveBeenCalled();
    });

    it('blocks the user through the authenticated request context', async () => {
      const blockedUserId = '44444444-4444-4444-8444-444444444444';

      const response = await POST(
        new Request('http://localhost/api/blocks', {
          method: 'POST',
          body: JSON.stringify({
            blockedUserId,
          }),
        }) as never
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(mocks.checkRateLimit).toHaveBeenCalledTimes(1);
      expect(mocks.checkRateLimit.mock.calls[0]?.[1]).toBe(authContext.user.id);
      expect(mocks.blockUser).toHaveBeenCalledWith(
        authContext.user.id,
        blockedUserId,
        authContext.supabase
      );
      expect(mocks.evaluateTrustLevel).toHaveBeenCalledWith(
        authContext.user.id,
        authContext.supabase
      );
    });
  });
});
