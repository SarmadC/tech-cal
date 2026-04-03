import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getNormalizedSubscriptionForUser: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/lib/mobileSubscriptions', () => ({
  getNormalizedSubscriptionForUser: (...args: unknown[]) =>
    mocks.getNormalizedSubscriptionForUser(...args),
}));

describe('GET /api/mobile/subscription/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when authentication cannot be resolved', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/subscription/status') as any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
    expect(mocks.getNormalizedSubscriptionForUser).not.toHaveBeenCalled();
  });

  it('returns the normalized subscription for an authenticated user', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      user: { id: 'user-1' },
    });
    mocks.getNormalizedSubscriptionForUser.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      provider: 'revenuecat',
      tier: 'pro',
      status: 'active',
      planType: 'monthly',
      entitlements: {
        calendar_sync: true,
        full_history: true,
        full_recommendations: true,
        unlimited_bookmarks: true,
      },
      trialEndsAt: null,
      currentPeriodEnd: null,
      providerCustomerId: 'customer-1',
      providerProductId: 'product-1',
    });

    const response = await GET(
      new Request('http://localhost/api/mobile/subscription/status', {
        headers: {
          Authorization: 'Bearer mobile-token',
        },
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.getNormalizedSubscriptionForUser).toHaveBeenCalledWith('user-1');
    expect(payload).toMatchObject({
      success: true,
      data: {
        provider: 'revenuecat',
        tier: 'pro',
      },
    });
  });
});
