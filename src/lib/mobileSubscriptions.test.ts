import { afterEach, describe, expect, it } from 'vitest';

import type { Subscription } from '@/types/subscription';
import {
  buildRevenueCatSubscriptionInsert,
  getMobileSubscriptionOfferings,
  toNormalizedSubscription,
} from './mobileSubscriptions';

const userId = '33333333-3333-4333-8333-333333333333';

function buildSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    user_id: userId,
    tier: 'pro',
    status: 'active',
    plan_type: 'monthly',
    paddle_customer_id: 'paddle-customer',
    paddle_subscription_id: 'paddle-subscription',
    paddle_price_id: 'price-monthly',
    current_period_start: '2026-03-01T00:00:00.000Z',
    current_period_end: '2026-04-01T00:00:00.000Z',
    entitlements: {
      calendar_sync: true,
      full_history: true,
      full_recommendations: true,
      unlimited_bookmarks: true,
    },
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
    billing_provider: 'paddle',
    revenuecat_customer_id: null,
    revenuecat_entitlement_id: null,
    revenuecat_product_id: null,
    past_due_at: null,
    trial_started_at: null,
    trial_ends_at: null,
    seats_included: 1,
    seats_used: 1,
    ...overrides,
  };
}

describe('mobileSubscriptions', () => {
  afterEach(() => {
    delete process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID;
    delete process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID;
    delete process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID;
    delete process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID;
  });

  it('returns a free manual subscription when no paid record exists', () => {
    const normalized = toNormalizedSubscription(null, userId);

    expect(normalized).toMatchObject({
      id: userId,
      userId,
      provider: 'manual',
      tier: 'free',
      status: 'canceled',
      providerCustomerId: null,
      providerProductId: null,
    });
    expect(normalized.entitlements.full_recommendations).toBe(false);
  });

  it('preserves revenuecat provider metadata and expired status', () => {
    const normalized = toNormalizedSubscription(
      buildSubscription({
        billing_provider: 'revenuecat',
        status: 'expired',
        revenuecat_customer_id: 'rc_customer_1',
        revenuecat_product_id: 'pro_annual',
        paddle_customer_id: null,
        paddle_price_id: null,
      }),
      userId
    );

    expect(normalized.provider).toBe('revenuecat');
    expect(normalized.status).toBe('expired');
    expect(normalized.providerCustomerId).toBe('rc_customer_1');
    expect(normalized.providerProductId).toBe('pro_annual');
  });

  it('builds offerings from configured RevenueCat product identifiers', () => {
    process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID = 'kurecal_pro_monthly';
    process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID = 'kurecal_pro_annual';

    expect(getMobileSubscriptionOfferings()).toEqual([
      expect.objectContaining({
        identifier: 'pro-monthly',
        productIdentifier: 'kurecal_pro_monthly',
        planType: 'monthly',
      }),
      expect.objectContaining({
        identifier: 'pro-annual',
        productIdentifier: 'kurecal_pro_annual',
        planType: 'annual',
      }),
    ]);
  });

  it('builds a typed RevenueCat upsert payload with provider metadata', () => {
    const upsertPayload = buildRevenueCatSubscriptionInsert(userId, {
      customerId: 'rc_customer_1',
      entitlementId: 'kure_cal_pro',
      productId: 'kurecal_pro_annual',
      tier: 'pro',
      status: 'active',
      planType: 'annual',
      currentPeriodStart: '2026-03-01T00:00:00.000Z',
      currentPeriodEnd: '2027-03-01T00:00:00.000Z',
      trialStartedAt: null,
      trialEndsAt: null,
      pastDueAt: null,
      entitlements: {
        calendar_sync: true,
        full_history: true,
        full_recommendations: true,
        unlimited_bookmarks: true,
      },
    });

    expect(upsertPayload).toMatchObject({
      user_id: userId,
      billing_provider: 'revenuecat',
      revenuecat_customer_id: 'rc_customer_1',
      revenuecat_entitlement_id: 'kure_cal_pro',
      revenuecat_product_id: 'kurecal_pro_annual',
      plan_type: 'annual',
      status: 'active',
      tier: 'pro',
    });
  });
});
