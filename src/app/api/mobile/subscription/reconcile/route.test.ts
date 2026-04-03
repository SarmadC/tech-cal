import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  reconcileRevenueCatSubscription: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/lib/mobileSubscriptions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/mobileSubscriptions')>(
    '@/lib/mobileSubscriptions'
  );

  return {
    ...actual,
    reconcileRevenueCatSubscription: (...args: unknown[]) =>
      mocks.reconcileRevenueCatSubscription(...args),
  };
});

describe('POST /api/mobile/subscription/reconcile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no authenticated user is present', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await POST(
      new Request('http://localhost/api/mobile/subscription/reconcile', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'customer_123',
          entitlementId: 'pro',
          productId: 'pro_monthly',
          tier: 'pro',
          status: 'active',
        }),
      }) as any
    );

    expect(response.status).toBe(401);
    expect(mocks.reconcileRevenueCatSubscription).not.toHaveBeenCalled();
  });

  it('validates the subscription payload before reconciling', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      user: { id: 'user-1' },
    });

    const response = await POST(
      new Request('http://localhost/api/mobile/subscription/reconcile', {
        method: 'POST',
        body: JSON.stringify({
          customerId: '',
          entitlementId: 'pro',
          productId: 'pro_monthly',
          tier: 'pro',
          status: 'active',
        }),
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid subscription payload');
    expect(mocks.reconcileRevenueCatSubscription).not.toHaveBeenCalled();
  });

  it('reconciles a RevenueCat subscription for bearer-authenticated mobile clients', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
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
          'Content-Type': 'application/json',
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
      }) as any
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
