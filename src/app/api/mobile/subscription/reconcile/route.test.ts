import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getApiAuthContext: vi.fn(),
  reconcileRevenueCatSubscription: vi.fn(),
}));

vi.mock('@/lib/apiAuth', () => ({
  getApiAuthContext: (...args: unknown[]) => mocks.getApiAuthContext(...args),
}));

vi.mock('@/lib/mobileSubscriptions', () => ({
  reconcileRevenueCatSubscription: (...args: unknown[]) =>
    mocks.reconcileRevenueCatSubscription(...args),
}));

describe('POST /api/mobile/subscription/reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no authenticated user is present', async () => {
    mocks.getApiAuthContext.mockResolvedValue({ user: null });

    const response = await POST(
      new Request('http://localhost/api/mobile/subscription/reconcile', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'customer_123',
          entitlementId: 'pro',
          productId: 'pro_monthly',
          tier: 'pro',
          status: 'active',
          entitlements: {
            calendar_sync: true,
            full_history: true,
            full_recommendations: true,
            unlimited_bookmarks: true,
          },
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.reconcileRevenueCatSubscription).not.toHaveBeenCalled();
  });

  it('reconciles a RevenueCat subscription for bearer-authenticated mobile clients', async () => {
    mocks.getApiAuthContext.mockResolvedValue({
      user: { id: '88888888-8888-4888-8888-888888888888' },
    });
    mocks.reconcileRevenueCatSubscription.mockResolvedValue({
      id: '99999999-9999-4999-8999-999999999999',
      userId: '88888888-8888-4888-8888-888888888888',
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
      providerCustomerId: 'customer_123',
      providerProductId: 'pro_monthly',
    });

    const response = await POST(
      new Request('http://localhost/api/mobile/subscription/reconcile', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mobile-token',
        },
        body: JSON.stringify({
          customerId: 'customer_123',
          entitlementId: 'pro',
          productId: 'pro_monthly',
          tier: 'pro',
          status: 'active',
          planType: 'monthly',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          trialStartedAt: null,
          trialEndsAt: null,
          pastDueAt: null,
          entitlements: {
            calendar_sync: true,
            full_history: true,
            full_recommendations: true,
            unlimited_bookmarks: true,
          },
        }),
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mocks.reconcileRevenueCatSubscription).toHaveBeenCalledWith(
      '88888888-8888-4888-8888-888888888888',
      expect.objectContaining({
        customerId: 'customer_123',
        status: 'active',
      })
    );
  });
});
