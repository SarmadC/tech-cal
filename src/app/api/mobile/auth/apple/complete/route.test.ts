import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
  retainAppleAuthorization: vi.fn(),
}));

vi.mock('@/services/appleAuthorizationService', () => ({
  retainAppleAuthorization: (...args: unknown[]) => mocks.retainAppleAuthorization(...args),
}));
vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) => mocks.getAuthenticatedRequestContext(...args),
}));
vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

import { POST } from './route';

describe('POST /api/mobile/auth/apple/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    mocks.createServiceClient.mockReturnValue({ service: true });
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      user: {
        id: 'user-1',
        identities: [{ provider: 'apple', identity_data: { sub: 'apple-subject' } }],
      },
    });
    mocks.retainAppleAuthorization.mockResolvedValue(undefined);
  });

  it('requires an authenticated Apple identity', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);
    const response = await POST(new Request('http://localhost/api/mobile/auth/apple/complete', {
      method: 'POST',
      body: JSON.stringify({ authorizationCode: 'code', clientId: 'com.kurecal.mobile' }),
    }) as never);
    expect(response.status).toBe(401);
  });

  it('retains the authorization for later account deletion', async () => {
    const response = await POST(new Request('http://localhost/api/mobile/auth/apple/complete', {
      method: 'POST',
      body: JSON.stringify({ authorizationCode: 'code', clientId: 'com.kurecal.mobile' }),
    }) as never);
    expect(response.status).toBe(200);
    expect(mocks.retainAppleAuthorization).toHaveBeenCalledWith(
      { service: true },
      {
        authorizationCode: 'code',
        clientId: 'com.kurecal.mobile',
        expectedSubject: 'apple-subject',
        userId: 'user-1',
      },
    );
  });
});
