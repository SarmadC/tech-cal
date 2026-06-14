import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DELETE } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  checkRateLimit: vi.fn(),
  createRateLimiter: vi.fn(),
  unblockUser: vi.fn(),
  evaluateTrustLevel: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/utils/rateLimit', () => ({
  createRateLimiter: (...args: unknown[]) => mocks.createRateLimiter(...args),
  checkRateLimit: (...args: unknown[]) => mocks.checkRateLimit(...args),
}));

vi.mock('@/services/blockService', () => ({
  BlockService: {
    unblockUser: (...args: unknown[]) => mocks.unblockUser(...args),
  },
}));

vi.mock('@/services/trustLevelService', () => ({
  TrustLevelService: {
    evaluateAndPersistTrustLevel: (...args: unknown[]) =>
      mocks.evaluateTrustLevel(...args),
  },
}));

describe('DELETE /api/blocks/[userId]', () => {
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

  it('returns 401 when unauthenticated', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);

    const response = await DELETE(
      new Request('http://localhost/api/blocks/44444444-4444-4444-8444-444444444444'),
      {
        params: Promise.resolve({
          userId: '44444444-4444-4444-8444-444444444444',
        }),
      }
    );

    expect(response.status).toBe(401);
    expect(mocks.unblockUser).not.toHaveBeenCalled();
  });

  it('unblocks through the bearer-authenticated request context', async () => {
    const blockedUserId = '44444444-4444-4444-8444-444444444444';

    const response = await DELETE(
      new Request(`http://localhost/api/blocks/${blockedUserId}`, {
        headers: { Authorization: 'Bearer mobile-token' },
      }),
      {
        params: Promise.resolve({
          userId: blockedUserId,
        }),
      }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      undefined,
      authContext.user.id
    );
    expect(mocks.unblockUser).toHaveBeenCalledWith(
      authContext.user.id,
      blockedUserId,
      authContext.supabase
    );
    expect(mocks.evaluateTrustLevel).toHaveBeenCalledWith(
      authContext.user.id,
      authContext.supabase
    );
  });

  it('returns 400 for invalid user ids', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/blocks/not-a-uuid'),
      {
        params: Promise.resolve({
          userId: 'not-a-uuid',
        }),
      }
    );

    expect(response.status).toBe(400);
    expect(mocks.unblockUser).not.toHaveBeenCalled();
  });
});
