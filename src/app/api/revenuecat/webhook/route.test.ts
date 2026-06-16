import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import { POST } from './route';

const mocks = vi.hoisted(() => ({
  processRevenueCatWebhookEvent: vi.fn(),
}));

vi.mock('@/lib/mobileSubscriptions', async () => {
  const actual = await vi.importActual<typeof import('@/lib/mobileSubscriptions')>(
    '@/lib/mobileSubscriptions'
  );

  return {
    ...actual,
    processRevenueCatWebhookEvent: (...args: unknown[]) =>
      mocks.processRevenueCatWebhookEvent(...args),
  };
});

const ORIGINAL_ENV = { ...process.env };

function buildRequest(
  body: unknown,
  authorization = 'Bearer revenuecat-webhook-secret'
) {
  return new Request('http://localhost/api/revenuecat/webhook', {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function buildEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    api_version: '1.0',
    event: {
      app_user_id: '88888888-8888-4888-8888-888888888888',
      entitlement_ids: ['kure_cal_pro'],
      event_timestamp_ms: 1770000000000,
      expiration_at_ms: 1772600000000,
      id: 'event_1',
      period_type: 'NORMAL',
      product_id: 'kurecal_pro_monthly',
      purchased_at_ms: 1770000000000,
      type: 'INITIAL_PURCHASE',
      ...overrides,
    },
  };
}

describe('POST /api/revenuecat/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...ORIGINAL_ENV,
      REVENUECAT_WEBHOOK_SECRET: 'Bearer revenuecat-webhook-secret',
    };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('rejects requests when the webhook authorization is not configured', async () => {
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
    delete process.env.REVENUECAT_WEBHOOK_AUTHORIZATION;

    const response = await POST(buildRequest(buildEnvelope()));

    expect(response.status).toBe(401);
    expect(mocks.processRevenueCatWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects requests with the wrong authorization header', async () => {
    const response = await POST(
      buildRequest(buildEnvelope(), 'Bearer wrong-secret')
    );

    expect(response.status).toBe(401);
    expect(mocks.processRevenueCatWebhookEvent).not.toHaveBeenCalled();
  });

  it('validates RevenueCat webhook payloads before processing', async () => {
    const response = await POST(buildRequest({ api_version: '1.0', event: {} }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe('Invalid RevenueCat webhook payload');
    expect(mocks.processRevenueCatWebhookEvent).not.toHaveBeenCalled();
  });

  it('processes a valid lifecycle event', async () => {
    mocks.processRevenueCatWebhookEvent.mockResolvedValue({
      currentPeriodEnd: '2026-03-01T00:00:00.000Z',
      entitlements: {
        calendar_sync: true,
        full_history: true,
        full_recommendations: true,
        unlimited_bookmarks: true,
      },
      id: '99999999-9999-4999-8999-999999999999',
      planType: 'monthly',
      provider: 'revenuecat',
      providerCustomerId: '88888888-8888-4888-8888-888888888888',
      providerProductId: 'kurecal_pro_monthly',
      status: 'active',
      tier: 'pro',
      trialEndsAt: null,
      userId: '88888888-8888-4888-8888-888888888888',
    });

    const response = await POST(buildRequest(buildEnvelope()));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.provider).toBe('revenuecat');
    expect(mocks.processRevenueCatWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          id: 'event_1',
          type: 'INITIAL_PURCHASE',
        }),
      })
    );
  });

  it('returns success for an already processed duplicate event', async () => {
    mocks.processRevenueCatWebhookEvent.mockResolvedValue(null);

    const response = await POST(
      buildRequest(buildEnvelope({ id: 'event_duplicate' }))
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true, data: null });
  });
});
