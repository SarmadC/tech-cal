import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  deleteUserAccount: vi.fn(),
  getAuthenticatedRequestContext: vi.fn(),
}));

vi.mock('@/services/accountDeletionService', () => ({
  deleteUserAccount: (...args: unknown[]) => mocks.deleteUserAccount(...args),
}));
vi.mock('@/utils/supabase/requestAuth', () => ({
  getAuthenticatedRequestContext: (...args: unknown[]) =>
    mocks.getAuthenticatedRequestContext(...args),
}));
vi.mock('@/utils/supabase/service', () => ({
  createServiceClient: (...args: unknown[]) => mocks.createServiceClient(...args),
}));

import { DELETE } from './route';

describe('DELETE /api/mobile/account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    mocks.getAuthenticatedRequestContext.mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111', identities: [] },
    });
    mocks.createServiceClient.mockReturnValue({ service: true });
    mocks.deleteUserAccount.mockResolvedValue({
      appleAuthorizationRevoked: false,
      appleManualRevocationRequired: false,
    });
  });

  it('requires authentication', async () => {
    mocks.getAuthenticatedRequestContext.mockResolvedValueOnce(null);
    const response = await DELETE(new Request('http://localhost/api/mobile/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    }) as never);
    expect(response.status).toBe(401);
  });

  it('requires explicit confirmation', async () => {
    const response = await DELETE(new Request('http://localhost/api/mobile/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'delete' }),
    }) as never);
    expect(response.status).toBe(400);
    expect(mocks.deleteUserAccount).not.toHaveBeenCalled();
  });

  it('deletes the authenticated account and returns revocation status', async () => {
    const response = await DELETE(new Request('http://localhost/api/mobile/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    }) as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        appleAuthorizationRevoked: false,
        appleManualRevocationRequired: false,
      },
    });
    expect(mocks.deleteUserAccount).toHaveBeenCalledWith(
      { service: true },
      '11111111-1111-4111-8111-111111111111',
      { usesAppleSignIn: false },
    );
  });
});
