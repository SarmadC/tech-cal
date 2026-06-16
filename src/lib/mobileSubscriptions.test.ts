import { afterEach, describe, expect, it } from "vitest";

import type { Subscription } from "@/types/subscription";

import {
  buildRevenueCatReconcileInputFromWebhookEvent,
  buildRevenueCatSubscriptionInsert,
  getMobileSubscriptionOfferings,
  isRevenueCatWebhookEventStale,
  resolveRevenueCatWebhookUserId,
  toNormalizedSubscription,
} from "./mobileSubscriptions";

const userId = "33333333-3333-4333-8333-333333333333";

function buildSubscription(
  overrides: Partial<Subscription> = {},
): Subscription {
  return {
    billing_provider: "paddle",
    created_at: "2026-03-01T00:00:00.000Z",
    current_period_end: "2026-04-01T00:00:00.000Z",
    current_period_start: "2026-03-01T00:00:00.000Z",
    entitlements: {
      calendar_sync: true,
      full_history: true,
      full_recommendations: true,
      unlimited_bookmarks: true,
    },
    id: "44444444-4444-4444-8444-444444444444",
    paddle_customer_id: "paddle-customer",
    paddle_price_id: "price-monthly",
    paddle_subscription_id: "paddle-subscription",
    past_due_at: null,
    plan_type: "monthly",
    revenuecat_customer_id: null,
    revenuecat_entitlement_id: null,
    revenuecat_product_id: null,
    seats_included: 1,
    seats_used: 1,
    status: "active",
    tier: "pro",
    trial_ends_at: null,
    trial_started_at: null,
    updated_at: "2026-03-01T00:00:00.000Z",
    user_id: userId,
    ...overrides,
  };
}

describe("mobileSubscriptions", () => {
  afterEach(() => {
    delete process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID;
    delete process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID;
    delete process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID;
    delete process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID;
  });

  it("returns a free manual subscription when no paid record exists", () => {
    const normalized = toNormalizedSubscription(null, userId);

    expect(normalized).toMatchObject({
      id: userId,
      userId,
      provider: "manual",
      tier: "free",
      status: "canceled",
      providerCustomerId: null,
      providerProductId: null,
    });
    expect(normalized.entitlements.full_recommendations).toBe(false);
  });

  it("preserves revenuecat provider metadata and expired status", () => {
    const normalized = toNormalizedSubscription(
      buildSubscription({
        billing_provider: "revenuecat",
        status: "expired",
        revenuecat_customer_id: "rc_customer_1",
        revenuecat_product_id: "pro_annual",
        paddle_customer_id: null,
        paddle_price_id: null,
      }),
      userId,
    );

    expect(normalized.provider).toBe("revenuecat");
    expect(normalized.status).toBe("expired");
    expect(normalized.providerCustomerId).toBe("rc_customer_1");
    expect(normalized.providerProductId).toBe("pro_annual");
  });

  it("builds offerings from configured RevenueCat product identifiers", () => {
    process.env.REVENUECAT_PRO_MONTHLY_PRODUCT_ID = "kurecal_pro_monthly";
    process.env.REVENUECAT_PRO_ANNUAL_PRODUCT_ID = "kurecal_pro_annual";

    expect(getMobileSubscriptionOfferings()).toEqual([
      expect.objectContaining({
        identifier: "pro-monthly",
        productIdentifier: "kurecal_pro_monthly",
        planType: "monthly",
      }),
      expect.objectContaining({
        identifier: "pro-annual",
        productIdentifier: "kurecal_pro_annual",
        planType: "annual",
      }),
    ]);
  });

  it("builds a typed RevenueCat insert payload with provider metadata", () => {
    const upsertPayload = buildRevenueCatSubscriptionInsert(userId, {
      customerId: "rc_customer_1",
      entitlementId: "kure_cal_pro",
      productId: "kurecal_pro_annual",
      tier: "pro",
      status: "active",
      planType: "annual",
      currentPeriodStart: "2026-03-01T00:00:00.000Z",
      currentPeriodEnd: "2027-03-01T00:00:00.000Z",
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
      billing_provider: "revenuecat",
      revenuecat_customer_id: "rc_customer_1",
      revenuecat_entitlement_id: "kure_cal_pro",
      revenuecat_product_id: "kurecal_pro_annual",
      plan_type: "annual",
      status: "active",
      tier: "pro",
    });
  });

  it("maps RevenueCat initial purchases and trials into active subscription payloads", () => {
    const payload = buildRevenueCatReconcileInputFromWebhookEvent({
      app_user_id: userId,
      entitlement_ids: ["kure_cal_pro"],
      event_timestamp_ms: 1770000000000,
      expiration_at_ms: 1772600000000,
      id: "event_initial",
      period_type: "TRIAL",
      product_id: "kurecal_pro_annual",
      purchased_at_ms: 1770000000000,
      type: "INITIAL_PURCHASE",
    });

    expect(payload).toMatchObject({
      customerId: userId,
      entitlementId: "kure_cal_pro",
      productId: "kurecal_pro_annual",
      planType: "annual",
      status: "trialing",
      tier: "pro",
      trialStartedAt: "2026-02-02T02:40:00.000Z",
      trialEndsAt: "2026-03-04T04:53:20.000Z",
    });
    expect(payload?.entitlements.full_recommendations).toBe(true);
  });

  it("keeps canceled RevenueCat subscriptions paid through their current period", () => {
    const payload = buildRevenueCatReconcileInputFromWebhookEvent({
      app_user_id: userId,
      entitlement_ids: ["kure_cal_pro"],
      event_timestamp_ms: 1770000000000,
      expiration_at_ms: 1772600000000,
      id: "event_cancel",
      period_type: "NORMAL",
      product_id: "kurecal_pro_monthly",
      purchased_at_ms: 1770000000000,
      type: "CANCELLATION",
    });

    expect(payload).toMatchObject({
      status: "canceled",
      tier: "pro",
      currentPeriodEnd: "2026-03-04T04:53:20.000Z",
    });
    expect(payload?.entitlements.calendar_sync).toBe(true);
  });

  it("maps RevenueCat expiration events to a free expired subscription", () => {
    const payload = buildRevenueCatReconcileInputFromWebhookEvent({
      app_user_id: userId,
      entitlement_ids: ["kure_cal_pro"],
      event_timestamp_ms: 1770000000000,
      expiration_at_ms: 1772600000000,
      id: "event_expiration",
      period_type: "NORMAL",
      product_id: "kurecal_pro_monthly",
      purchased_at_ms: 1770000000000,
      type: "EXPIRATION",
    });

    expect(payload).toMatchObject({
      status: "expired",
      tier: "free",
    });
    expect(payload?.entitlements.full_recommendations).toBe(false);
  });

  it("maps RevenueCat billing issues to past due with a grace-period anchor", () => {
    const payload = buildRevenueCatReconcileInputFromWebhookEvent({
      app_user_id: userId,
      entitlement_ids: ["kure_cal_pro"],
      event_timestamp_ms: 1770000000000,
      expiration_at_ms: 1772600000000,
      id: "event_billing_issue",
      period_type: "NORMAL",
      product_id: "kurecal_pro_monthly",
      purchased_at_ms: 1770000000000,
      type: "BILLING_ISSUE",
    });

    expect(payload).toMatchObject({
      pastDueAt: "2026-02-02T02:40:00.000Z",
      status: "past_due",
      tier: "pro",
    });
  });

  it("ignores unsupported RevenueCat webhook events instead of granting access", () => {
    expect(
      buildRevenueCatReconcileInputFromWebhookEvent({
        app_user_id: userId,
        entitlement_ids: ["kure_cal_pro"],
        event_timestamp_ms: 1770000000000,
        expiration_at_ms: 1772600000000,
        id: "event_unknown",
        period_type: "NORMAL",
        product_id: "kurecal_pro_monthly",
        purchased_at_ms: 1770000000000,
        type: "SOME_NEW_REVENUECAT_EVENT",
      }),
    ).toBeNull();
  });

  it("detects older RevenueCat lifecycle events as stale", () => {
    const existing = buildSubscription({
      billing_provider: "revenuecat",
      current_period_end: "2026-04-01T00:00:00.000Z",
      revenuecat_customer_id: userId,
      revenuecat_product_id: "kurecal_pro_monthly",
    });
    const event = {
      app_user_id: userId,
      entitlement_ids: ["kure_cal_pro"],
      event_timestamp_ms: 1770000000000,
      expiration_at_ms: 1772600000000,
      id: "event_old_expiration",
      period_type: "NORMAL",
      product_id: "kurecal_pro_monthly",
      purchased_at_ms: 1770000000000,
      type: "EXPIRATION",
    };
    const payload = buildRevenueCatReconcileInputFromWebhookEvent(event);

    expect(payload).not.toBeNull();
    expect(isRevenueCatWebhookEventStale(existing, event, payload!)).toBe(true);
  });

  it("keeps terminal same-period RevenueCat events from being overwritten by older active events", () => {
    const existing = buildSubscription({
      billing_provider: "revenuecat",
      current_period_end: "2026-03-04T04:53:20.000Z",
      revenuecat_customer_id: userId,
      revenuecat_product_id: "kurecal_pro_monthly",
      status: "canceled",
    });
    const event = {
      app_user_id: userId,
      entitlement_ids: ["kure_cal_pro"],
      event_timestamp_ms: 1770000000000,
      expiration_at_ms: 1772600000000,
      id: "event_old_renewal",
      period_type: "NORMAL",
      product_id: "kurecal_pro_monthly",
      purchased_at_ms: 1770000000000,
      type: "RENEWAL",
    };
    const payload = buildRevenueCatReconcileInputFromWebhookEvent(event);

    expect(payload).not.toBeNull();
    expect(isRevenueCatWebhookEventStale(existing, event, payload!)).toBe(true);
  });

  it("resolves Supabase user ids from RevenueCat aliases when app_user_id is anonymous", () => {
    expect(
      resolveRevenueCatWebhookUserId({
        aliases: ["$RCAnonymousID:abc", userId],
        app_user_id: "$RCAnonymousID:def",
        entitlement_ids: ["kure_cal_pro"],
        event_timestamp_ms: 1770000000000,
        id: "event_alias",
        period_type: "NORMAL",
        product_id: "kurecal_pro_monthly",
        type: "RENEWAL",
      }),
    ).toBe(userId);
  });
});
