import { describe, expect, it } from 'vitest';

import { resolveMobileEnv } from './env';

describe('mobile env resolution', () => {
  it('requires the current mobile runtime URLs and anon key', () => {
    expect(() =>
      resolveMobileEnv({
        supabaseUrl: 'https://kurecal.supabase.co',
        apiBaseUrl: 'https://api.kurecal.com',
      })
    ).toThrow('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('normalizes required URLs and keeps RevenueCat optional by default', () => {
    const resolved = resolveMobileEnv({
      supabaseUrl: 'https://kurecal.supabase.co/',
      supabaseAnonKey: ' anon-key ',
      apiBaseUrl: 'https://api.kurecal.com/',
    });

    expect(resolved.supabaseUrl).toBe('https://kurecal.supabase.co');
    expect(resolved.supabaseAnonKey).toBe('anon-key');
    expect(resolved.apiBaseUrl).toBe('https://api.kurecal.com');
    expect(resolved.revenueCat.proEntitlementId).toBe('kure_cal_pro');
    expect(resolved.revenueCat.platformApiKey).toBeNull();
  });

  it('returns the platform-specific RevenueCat key when configured', () => {
    const resolved = resolveMobileEnv(
      {
        supabaseUrl: 'https://kurecal.supabase.co',
        supabaseAnonKey: 'anon-key',
        apiBaseUrl: 'https://api.kurecal.com',
        revenueCatApiKeyIos: 'ios-key',
        revenueCatApiKeyAndroid: 'android-key',
        revenueCatProEntitlementId: 'kurecal_pro',
        revenueCatProMonthlyProductId: 'pro_monthly',
        revenueCatProAnnualProductId: 'pro_annual',
      },
      'android'
    );

    expect(resolved.revenueCat.platformApiKey).toBe('android-key');
    expect(resolved.revenueCat.monthlyProductId).toBe('pro_monthly');
    expect(resolved.revenueCat.annualProductId).toBe('pro_annual');
  });
});
