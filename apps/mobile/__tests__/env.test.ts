import { describe, expect, it } from '@jest/globals';
import { resolveMobileEnv } from '../lib/env';

const baseEnv = {
  supabaseUrl: 'https://kurecal.supabase.co',
  supabaseAnonKey: 'anon-key',
  revenueCatApiKeyIos: 'ios-key',
  revenueCatApiKeyAndroid: 'android-key',
  revenueCatProEntitlementId: 'kure_cal_pro',
  revenueCatProMonthlyProductId: 'monthly',
  revenueCatProAnnualProductId: 'annual',
} satisfies Record<string, string>;

describe('mobile env resolution', () => {
  it('allows localhost fallback only in development', () => {
    const resolved = resolveMobileEnv(
      {
        ...baseEnv,
        appEnv: 'development',
      },
      'android'
    );

    expect(resolved.appEnv).toBe('development');
    expect(resolved.apiBaseUrl).toBe('http://10.0.2.2:3000');
    expect(resolved.authRedirectUri).toBe('kurecal-dev://auth/callback');
    expect(resolved.appIdentity.scheme).toBe('kurecal-dev');
  });

  it('requires explicit staging runtime values', () => {
    expect(() =>
      resolveMobileEnv(
        {
          ...baseEnv,
          appEnv: 'staging',
        },
        'ios'
      )
    ).toThrow('EXPO_PUBLIC_API_URL');

    expect(() =>
      resolveMobileEnv(
        {
          ...baseEnv,
          appEnv: 'staging',
          apiBaseUrl: 'https://staging.kurecal.com',
        },
        'ios'
      )
    ).toThrow('EXPO_PUBLIC_AUTH_REDIRECT_URI');
  });

  it('resolves production identity and platform-specific RevenueCat keys', () => {
    const resolved = resolveMobileEnv(
      {
        ...baseEnv,
        appEnv: 'production',
        apiBaseUrl: 'https://app.kurecal.com',
        authRedirectUri: 'kurecal://auth/callback',
      },
      'ios'
    );

    expect(resolved.appIdentity.iosBundleIdentifier).toBe('com.kurecal.mobile');
    expect(resolved.appIdentity.androidPackage).toBe('com.kurecal.mobile');
    expect(resolved.revenueCat.platformApiKey).toBe('ios-key');
    expect(resolved.authRedirectUri).toBe('kurecal://auth/callback');
  });
});
