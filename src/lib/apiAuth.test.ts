import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
  createUserScopedClient: vi.fn(),
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: (...args: unknown[]) => mocks.createClient(...args),
}));

vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
  createUserScopedClient: (...args: unknown[]) => mocks.createUserScopedClient(...args),
}));

import { getApiAuthContext } from './apiAuth';

describe('getApiAuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://kurecal.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  it('builds a bearer-auth context from the Authorization header', async () => {
    const bearerSupabase = { from: vi.fn() };
    const serviceClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
          error: null,
        }),
      },
    };

    mocks.createUserScopedClient.mockReturnValue(bearerSupabase);
    mocks.createServiceClient.mockReturnValue(serviceClient);

    const context = await getApiAuthContext(
      new Request('http://localhost/api/profile', {
        headers: {
          Authorization: 'Bearer mobile-access-token',
        },
      })
    );

    expect(context.authMode).toBe('bearer');
    expect(context.accessToken).toBe('mobile-access-token');
    expect(context.user?.id).toBe('11111111-1111-4111-8111-111111111111');
    expect(mocks.createUserScopedClient).toHaveBeenCalledWith(
      'https://kurecal.supabase.co',
      'anon-key',
      'mobile-access-token'
    );
    expect(serviceClient.auth.getUser).toHaveBeenCalledWith('mobile-access-token');
  });

  it('falls back to cookie auth when no bearer token is present', async () => {
    const cookieSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '22222222-2222-4222-8222-222222222222' } },
          error: null,
        }),
      },
    };

    mocks.createClient.mockResolvedValue(cookieSupabase);

    const context = await getApiAuthContext(new Request('http://localhost/api/profile'));

    expect(context.authMode).toBe('cookie');
    expect(context.accessToken).toBeNull();
    expect(context.user?.id).toBe('22222222-2222-4222-8222-222222222222');
    expect(mocks.createClient).toHaveBeenCalled();
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });
});
