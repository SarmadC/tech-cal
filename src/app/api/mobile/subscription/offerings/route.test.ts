import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  getMobileSubscriptionOfferings: vi.fn(),
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));

vi.mock('@/lib/mobileSubscriptions', () => ({
  getMobileSubscriptionOfferings: (...args: unknown[]) =>
    mocks.getMobileSubscriptionOfferings(...args),
}));

describe('GET /api/mobile/subscription/offerings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when authentication cannot be resolved', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await GET(
      new Request('http://localhost/api/mobile/subscription/offerings') as any
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Authentication required');
    expect(mocks.getMobileSubscriptionOfferings).not.toHaveBeenCalled();
  });

  it('returns configured offerings for authenticated mobile clients', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      user: { id: 'user-1' },
    });
    mocks.getMobileSubscriptionOfferings.mockReturnValue([
      {
        identifier: 'pro-monthly',
        productIdentifier: 'kurecal_pro_monthly',
        title: 'Pro Monthly',
        description: 'Monthly access',
        tier: 'pro',
        planType: 'monthly',
      },
    ]);

    const response = await GET(
      new Request('http://localhost/api/mobile/subscription/offerings', {
        headers: {
          Authorization: 'Bearer mobile-token',
        },
      }) as any
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      data: [
        {
          identifier: 'pro-monthly',
        },
      ],
    });
  });
});
