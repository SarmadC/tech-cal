export type MobilePlatform = 'android' | 'ios' | 'macos' | 'web' | 'windows';

export interface MobilePublicEnv {
  apiBaseUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  revenueCatApiKeyIos?: string;
  revenueCatApiKeyAndroid?: string;
  revenueCatProEntitlementId?: string;
  revenueCatProMonthlyProductId?: string;
  revenueCatProAnnualProductId?: string;
}

export interface ResolvedMobileEnv {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  revenueCat: {
    platformApiKey: string | null;
    iosApiKey: string | null;
    androidApiKey: string | null;
    proEntitlementId: string;
    monthlyProductId: string | null;
    annualProductId: string | null;
  };
}

function normalizeValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requiredAbsoluteUrl(name: string, value: string | undefined): string {
  const resolved = required(name, normalizeValue(value));

  try {
    return new URL(resolved).toString().replace(/\/$/, '');
  } catch {
    throw new Error(`Environment variable ${name} must be a valid absolute URL.`);
  }
}

function readExpoPublicEnv(): MobilePublicEnv {
  return {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
    revenueCatProEntitlementId: process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID,
    revenueCatProMonthlyProductId: process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID,
    revenueCatProAnnualProductId: process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID,
  };
}

function resolveRevenueCat(platform: MobilePlatform, env: MobilePublicEnv) {
  const iosApiKey = normalizeValue(env.revenueCatApiKeyIos) ?? null;
  const androidApiKey = normalizeValue(env.revenueCatApiKeyAndroid) ?? null;

  return {
    platformApiKey:
      platform === 'ios'
        ? iosApiKey
        : platform === 'android'
          ? androidApiKey
          : null,
    iosApiKey,
    androidApiKey,
    proEntitlementId: normalizeValue(env.revenueCatProEntitlementId) ?? 'kure_cal_pro',
    monthlyProductId: normalizeValue(env.revenueCatProMonthlyProductId) ?? null,
    annualProductId: normalizeValue(env.revenueCatProAnnualProductId) ?? null,
  };
}

function resolveApiBaseUrl(env: MobilePublicEnv): string {
  return requiredAbsoluteUrl('EXPO_PUBLIC_API_URL', env.apiBaseUrl);
}

function resolveSupabaseUrl(env: MobilePublicEnv): string {
  return requiredAbsoluteUrl('EXPO_PUBLIC_SUPABASE_URL', env.supabaseUrl);
}

function resolveSupabaseAnonKey(env: MobilePublicEnv): string {
  return required(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    normalizeValue(env.supabaseAnonKey)
  );
}

export function resolveMobileEnv(
  env: MobilePublicEnv,
  platform: MobilePlatform = 'ios'
): ResolvedMobileEnv {
  return {
    apiBaseUrl: resolveApiBaseUrl(env),
    supabaseUrl: resolveSupabaseUrl(env),
    supabaseAnonKey: resolveSupabaseAnonKey(env),
    revenueCat: resolveRevenueCat(platform, env),
  };
}

export function getMobileEnv(platform?: MobilePlatform): ResolvedMobileEnv {
  return resolveMobileEnv(readExpoPublicEnv(), platform);
}

export function getApiBaseUrl(platform?: MobilePlatform): string {
  void platform;
  return resolveApiBaseUrl(readExpoPublicEnv());
}

export function getSupabaseUrl(platform?: MobilePlatform): string {
  void platform;
  return resolveSupabaseUrl(readExpoPublicEnv());
}

export function getSupabaseAnonKey(platform?: MobilePlatform): string {
  void platform;
  return resolveSupabaseAnonKey(readExpoPublicEnv());
}

export function getRevenueCatApiKey(platform: MobilePlatform): string | null {
  return getMobileEnv(platform).revenueCat.platformApiKey;
}

export function getRevenueCatProEntitlementId(platform?: MobilePlatform): string {
  return getMobileEnv(platform).revenueCat.proEntitlementId;
}
