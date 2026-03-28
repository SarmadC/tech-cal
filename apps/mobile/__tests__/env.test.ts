import { describe, expect, it } from '@jest/globals';
import { resolveMobileEnvFromProcess } from '../lib/env';

const baseEnv = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://kurecal.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
  EXPO_PUBLIC_REVENUECAT_API_KEY_IOS: 'ios-key',
  EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID: 'android-key',
  EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID: 'kure_cal_pro',
  EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID: 'monthly',
  EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID: 'annual',
} satisfies Record<string, string>;

describe('mobile env resolution', () => {
  it('allows localhost fallback only in development', () => {
    const resolved = resolveMobileEnvFromProcess(
      {
        ...baseEnv,
        EXPO_PUBLIC_APP_ENV: 'development',
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
      resolveMobileEnvFromProcess(
        {
          ...baseEnv,
          EXPO_PUBLIC_APP_ENV: 'staging',
        },
        'ios'
      )
    ).toThrow('EXPO_PUBLIC_API_URL');

    expect(() =>
      resolveMobileEnvFromProcess(
        {
          ...baseEnv,
          EXPO_PUBLIC_APP_ENV: 'staging',
          EXPO_PUBLIC_API_URL: 'https://staging.kurecal.com',
        },
        'ios'
      )
    ).toThrow('EXPO_PUBLIC_AUTH_REDIRECT_URI');
  });

  it('resolves production identity and platform-specific RevenueCat keys', () => {
    const resolved = resolveMobileEnvFromProcess(
      {
        ...baseEnv,
        EXPO_PUBLIC_APP_ENV: 'production',
        EXPO_PUBLIC_API_URL: 'https://app.kurecal.com',
        EXPO_PUBLIC_AUTH_REDIRECT_URI: 'kurecal://auth/callback',
      },
      'ios'
    );

    expect(resolved.appIdentity.iosBundleIdentifier).toBe('com.kurecal.mobile');
    expect(resolved.appIdentity.androidPackage).toBe('com.kurecal.mobile');
    expect(resolved.revenueCat.platformApiKey).toBe('ios-key');
    expect(resolved.authRedirectUri).toBe('kurecal://auth/callback');
  });
});
