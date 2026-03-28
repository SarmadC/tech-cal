import { afterEach, describe, expect, it } from '@jest/globals';
import {
  MOBILE_AUTH_CALLBACK_PATH,
  getAuthCallbackParams,
  getMobileAuthRedirectUri,
  getMobileRecoveryRedirectUri,
  getPathFromUrl,
  isMobileAuthCallbackUrl,
} from '@/lib/authRedirect';
import { resetMobileEnvForTests } from '@/lib/env';

describe('auth redirect helpers', () => {
  const originalAppEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const originalRedirectUri = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI;

  afterEach(() => {
    if (originalAppEnv === undefined) {
      delete process.env.EXPO_PUBLIC_APP_ENV;
    } else {
      process.env.EXPO_PUBLIC_APP_ENV = originalAppEnv;
    }

    if (originalRedirectUri === undefined) {
      delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI;
    } else {
      process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = originalRedirectUri;
    }

    resetMobileEnvForTests();
  });

  it('resolves the native auth callback uri by default', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI;
    resetMobileEnvForTests();

    expect(getMobileAuthRedirectUri()).toBe('kurecal-dev://auth/callback');
  });

  it('uses the environment scheme for staging and production', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'kurecal-staging://auth/callback';
    resetMobileEnvForTests();

    expect(getMobileAuthRedirectUri()).toBe('kurecal-staging://auth/callback');

    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'kurecal://auth/callback';
    resetMobileEnvForTests();

    expect(getMobileAuthRedirectUri()).toBe('kurecal://auth/callback');
  });

  it('builds the mobile recovery redirect from the native callback uri', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    delete process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI;
    resetMobileEnvForTests();

    expect(getMobileRecoveryRedirectUri()).toBe('kurecal-dev://auth/callback?type=recovery');
  });

  it('rejects web callback overrides for the native app', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'https://app.kurecal.com/auth/callback';
    resetMobileEnvForTests();

    expect(() => getMobileAuthRedirectUri()).toThrow('native app scheme');
  });

  it('rejects callback overrides that do not match the active mobile environment scheme', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'development';
    process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI = 'kurecal://auth/callback';
    resetMobileEnvForTests();

    expect(() => getMobileAuthRedirectUri()).toThrow('kurecal-dev scheme');
  });

  it('detects the mobile callback path for custom scheme urls', () => {
    expect(getPathFromUrl('kurecal://auth/callback#access_token=test')).toBe(
      MOBILE_AUTH_CALLBACK_PATH
    );
    expect(isMobileAuthCallbackUrl('kurecal://auth/callback?refresh_token=test')).toBe(true);
    expect(isMobileAuthCallbackUrl('kurecal://settings')).toBe(false);
  });

  it('extracts auth params from hash-style callback urls', () => {
    const params = getAuthCallbackParams(
      'kurecal://auth/callback#access_token=abc&refresh_token=def'
    );

    expect(params.get('access_token')).toBe('abc');
    expect(params.get('refresh_token')).toBe('def');
  });
});
