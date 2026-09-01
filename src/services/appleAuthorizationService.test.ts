import { generateKeyPairSync } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  retainAppleAuthorization,
  revokeRetainedAppleAuthorization,
} from './appleAuthorizationService';
import { encryptToken } from '@/utils/tokenEncryption';

function appleIdToken(subject: string) {
  return `header.${Buffer.from(JSON.stringify({ sub: subject })).toString('base64url')}.signature`;
}

function configureAppleEnvironment() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  vi.stubEnv('APPLE_CLIENT_ID', 'com.kurecal.mobile');
  vi.stubEnv('APPLE_TEAM_ID', 'TEAM123');
  vi.stubEnv('APPLE_SIGN_IN_KEY_ID', 'KEY123');
  vi.stubEnv(
    'APPLE_SIGN_IN_PRIVATE_KEY',
    privateKey.export({ format: 'pem', type: 'pkcs8' }).toString(),
  );
  vi.stubEnv('TOKEN_ENCRYPTION_KEY', '11'.repeat(32));
}

describe('appleAuthorizationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    configureAppleEnvironment();
  });

  it('exchanges and encrypts an authorization code for later revocation', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ upsert })) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id_token: appleIdToken('apple-subject'),
      refresh_token: 'refresh-secret',
    }), { status: 200 })));

    await retainAppleAuthorization(client as never, {
      authorizationCode: 'one-time-code',
      clientId: 'com.kurecal.mobile',
      expectedSubject: 'apple-subject',
      userId: 'user-1',
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        apple_subject: 'apple-subject',
        client_id: 'com.kurecal.mobile',
        user_id: 'user-1',
        refresh_token: expect.not.stringContaining('refresh-secret'),
      }),
      { onConflict: 'user_id' },
    );
  });

  it('revokes a retained refresh token with Apple', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        client_id: 'com.kurecal.mobile',
        refresh_token: encryptToken('refresh-secret'),
      },
      error: null,
    });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const client = { from: vi.fn(() => ({ select })) };
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(revokeRetainedAppleAuthorization(client as never, 'user-1'))
      .resolves.toBe(true);
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://appleid.apple.com/auth/revoke');
    expect(String(request.body)).toContain('token=refresh-secret');
  });
});
