import { afterEach, describe, expect, it } from 'vitest';

import {
  getRevenueCatApiKey,
  getRevenueCatProductIds,
  getRevenueCatProEntitlementId,
  getRevenueCatRuntimeConfig,
  getMobileApiBaseUrl,
  getMobileRuntimeMetadata,
  getRequiredMobileEnv,
  getSupabaseRuntimeConfig,
} from './env';

const ORIGINAL_ENV = { ...process.env };

describe('mobile env helpers', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('normalizes the mobile API base URL', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.kurecal.test/';

    expect(getMobileApiBaseUrl()).toBe('https://api.kurecal.test');
  });

  it('throws when a required env var is missing', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;

    expect(() => getRequiredMobileEnv('EXPO_PUBLIC_SUPABASE_URL')).toThrow(
      'EXPO_PUBLIC_SUPABASE_URL is missing from the mobile environment.'
    );
  });

  it('returns the current Supabase runtime config', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    expect(getSupabaseRuntimeConfig()).toEqual({
      anonKey: 'anon-key',
      url: 'https://supabase.example.test',
    });
  });

  it('resolves RevenueCat keys and product metadata per platform', () => {
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS = 'ios-key';
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID = 'android-key';
    process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID = 'pro-access';
    process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID =
      'kurecal_pro_monthly';
    process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID =
      'kurecal_pro_annual';

    expect(getRevenueCatApiKey('ios')).toBe('ios-key');
    expect(getRevenueCatApiKey('android')).toBe('android-key');
    expect(getRevenueCatApiKey('web')).toBeNull();
    expect(getRevenueCatProductIds()).toEqual({
      annual: 'kurecal_pro_annual',
      monthly: 'kurecal_pro_monthly',
    });
    expect(getRevenueCatProEntitlementId()).toBe('pro-access');
    expect(getRevenueCatRuntimeConfig('ios')).toMatchObject({
      annualProductId: 'kurecal_pro_annual',
      iosApiKey: 'ios-key',
      monthlyProductId: 'kurecal_pro_monthly',
      platformApiKey: 'ios-key',
      proEntitlementId: 'pro-access',
    });
  });

  it('reads runtime metadata from the committed Expo app config', () => {
    expect(getMobileRuntimeMetadata()).toEqual({
      appName: 'KureCal Dev',
      easProjectId: '788fd018-fbcd-4809-9760-9fed5af7d221',
      scheme: 'kurecal-dev',
      slug: 'kurecal-mobile',
    });
  });

  it('switches runtime metadata to production when APP_VARIANT=production', () => {
    process.env.APP_VARIANT = 'production';

    expect(getMobileRuntimeMetadata()).toEqual({
      appName: 'KureCal',
      easProjectId: '788fd018-fbcd-4809-9760-9fed5af7d221',
      scheme: 'kurecal',
      slug: 'kurecal-mobile',
    });
  });
});
