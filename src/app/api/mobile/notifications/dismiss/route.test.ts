import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PATCH } from './route';

const mocks = vi.hoisted(() => ({
  getAuthenticatedRequestContext: vi.fn(),
  validateSameOriginRequest: vi.fn()
}));

vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args)
}));

vi.mock('@/lib/requestSecurity', () => ({
  validateSameOriginRequest: (...args: unknown[]) =>
    mocks.validateSameOriginRequest(...args)
}));

function createSupabaseResult(result: {
  count?: number | null;
  error?: { message?: string } | null;
}) {
  const chain = {
    from: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    in: vi.fn()
  };
  chain.from.mockReturnValue(chain);
  chain.update.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockResolvedValue({
    count: result.count ?? null,
    error: result.error ?? null
  });
  return chain;
}

describe('PATCH /api/mobile/notifications/dismiss', () => {
  const notificationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateSameOriginRequest.mockReturnValue(null);
  });

  it('requires authentication', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue(null);

    const response = await PATCH(
      new Request('http://localhost/api/mobile/notifications/dismiss', {
        method: 'PATCH',
        body: JSON.stringify({ ids: [notificationId], dismissed: true })
      })
    );

    expect(response.status).toBe(401);
  });

  it('enforces same-origin protection for cookie authentication', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'cookie',
      supabase: createSupabaseResult({}),
      user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }
    });
    mocks.validateSameOriginRequest.mockReturnValue('Invalid request origin');

    const response = await PATCH(
      new Request('http://localhost/api/mobile/notifications/dismiss', {
        method: 'PATCH',
        body: JSON.stringify({ ids: [notificationId], dismissed: true })
      })
    );

    expect(response.status).toBe(403);
  });

  it('rejects malformed notification ids', async () => {
    const supabase = createSupabaseResult({});
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase,
      user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/notifications/dismiss', {
        method: 'PATCH',
        body: JSON.stringify({ ids: ['not-a-uuid'], dismissed: true })
      })
    );

    expect(response.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'scopes dismissed=%s updates to the recipient',
    async (dismissed) => {
      const supabase = createSupabaseResult({ count: 1 });
      const userId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      mocks.getAuthenticatedRequestContext.mockResolvedValue({
        authMethod: 'bearer',
        supabase,
        user: { id: userId }
      });

      const response = await PATCH(
        new Request('http://localhost/api/mobile/notifications/dismiss', {
          method: 'PATCH',
          body: JSON.stringify({ ids: [notificationId], dismissed })
        })
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toEqual({ success: true, data: { updated: 1 } });
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(supabase.update).toHaveBeenCalledWith(
        { dismissed_at: dismissed ? expect.any(String) : null },
        { count: 'exact' }
      );
      expect(supabase.eq).toHaveBeenCalledWith('recipient_id', userId);
      expect(supabase.in).toHaveBeenCalledWith('id', [notificationId]);
    }
  );

  it('returns database failures', async () => {
    const supabase = createSupabaseResult({
      error: { message: 'database unavailable' }
    });
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      authMethod: 'bearer',
      supabase,
      user: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }
    });

    const response = await PATCH(
      new Request('http://localhost/api/mobile/notifications/dismiss', {
        method: 'PATCH',
        body: JSON.stringify({ ids: [notificationId], dismissed: true })
      })
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({
      success: false,
      error: 'database unavailable'
    });
  });
});
