import { describe, expect, it, vi } from 'vitest';

import { completeMobileAuthCallback } from './mobileAuthCompletion';

function authClient() {
  return {
    exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
    setSession: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe('completeMobileAuthCallback', () => {
  it('exchanges a PKCE callback code and reports recovery state', async () => {
    const auth = authClient();

    await expect(
      completeMobileAuthCallback(
        auth as never,
        'kurecal://auth/callback?code=pkce-code&type=recovery'
      )
    ).resolves.toEqual({ isRecovery: true });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('pkce-code');
  });

  it('restores a token callback without exposing tokens elsewhere', async () => {
    const auth = authClient();

    await completeMobileAuthCallback(
      auth as never,
      'kurecal://auth/callback#access_token=access&refresh_token=refresh'
    );

    expect(auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('surfaces provider errors before attempting a session exchange', async () => {
    const auth = authClient();

    await expect(
      completeMobileAuthCallback(
        auth as never,
        'kurecal://auth/callback?error_description=Access%20denied&code=ignored'
      )
    ).rejects.toThrow('Access denied');
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('rejects callbacks without supported credentials', async () => {
    await expect(
      completeMobileAuthCallback(
        authClient() as never,
        'kurecal://auth/callback?state=only'
      )
    ).rejects.toThrow('missing the data needed');
  });
});
