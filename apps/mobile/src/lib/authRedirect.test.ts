import { afterEach, describe, expect, it } from 'vitest';

import {
  MOBILE_AUTH_CALLBACK_PATH,
  MOBILE_RESET_PASSWORD_PATH,
  getAuthCallbackParams,
  getMobileEmailRedirectUri,
  getMobileOAuthRedirectUri,
  getMobileRecoveryRedirectUri,
  getPathFromUrl,
  isMobileAuthCallbackUrl,
} from './authRedirect';

const ORIGINAL_ENV = { ...process.env };

describe('mobile auth redirect helpers', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('derives the default mobile callback URI from the committed app scheme', () => {
    delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI;

    expect(getMobileOAuthRedirectUri()).toBe('kurecal-dev://auth/callback');
    expect(getMobileEmailRedirectUri()).toBe('kurecal-dev://auth/callback');
    expect(getMobileRecoveryRedirectUri()).toBe(
      'kurecal-dev://auth/callback?type=recovery'
    );
  });

  it('accepts a native redirect override when it matches the callback path', () => {
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'kurecal-dev://auth/callback';

    expect(getMobileOAuthRedirectUri()).toBe('kurecal-dev://auth/callback');
  });

  it('rejects an invalid redirect override', () => {
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'https://kurecal.com/auth/callback';

    expect(() => getMobileOAuthRedirectUri()).toThrow(
      'Mobile auth redirect URI must use the kurecal-dev native scheme.'
    );
  });

  it('parses callback paths from native and hash-fragment URLs', () => {
    expect(getPathFromUrl('kurecal-dev://auth/callback')).toBe(
      MOBILE_AUTH_CALLBACK_PATH
    );
    expect(
      getPathFromUrl('kurecal-dev://auth/callback#access_token=test-token')
    ).toBe(MOBILE_AUTH_CALLBACK_PATH);
    expect(isMobileAuthCallbackUrl('kurecal-dev://auth/callback')).toBe(true);
  });

  it('reads auth callback params and exposes the recovery route constant', () => {
    const params = getAuthCallbackParams(
      'kurecal-dev://auth/callback#access_token=test&refresh_token=refresh&type=recovery'
    );

    expect(params.get('access_token')).toBe('test');
    expect(params.get('type')).toBe('recovery');
    expect(MOBILE_RESET_PASSWORD_PATH).toBe('/auth/reset-password');
  });
});
