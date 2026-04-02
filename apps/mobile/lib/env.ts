import { Platform } from 'react-native';
import {
  getDefaultMobileAuthRedirectUri,
  getMobileAppIdentity,
  resolveMobileAppEnv,
  type MobileAppEnv,
  type MobileAppIdentity,
} from '@/config/appConfig';

type MobilePlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';

export interface MobilePublicEnv {
  appEnv?: string;
  apiBaseUrl?: string;
  authRedirectUri?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  revenueCatApiKeyIos?: string;
  revenueCatApiKeyAndroid?: string;
  revenueCatProEntitlementId?: string;
  revenueCatProMonthlyProductId?: string;
  revenueCatProAnnualProductId?: string;
}

export interface ResolvedMobileEnv {
  appEnv: MobileAppEnv;
  appIdentity: MobileAppIdentity;
  apiBaseUrl: string;
  authRedirectUri: string;
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

function readExpoPublicEnv(): MobilePublicEnv {
  return {
    appEnv: process.env.EXPO_PUBLIC_APP_ENV,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_URL,
    authRedirectUri: process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS,
    revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID,
    revenueCatProEntitlementId: process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID,
    revenueCatProMonthlyProductId: process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID,
    revenueCatProAnnualProductId: process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID,
  };
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function requiredOutsideDevelopment(
  appEnv: MobileAppEnv,
  name: string,
  value: string | undefined
): string | undefined {
  if (value) {
    return value;
  }

  if (appEnv !== 'development') {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return undefined;
}

function resolveApiBaseUrl(appEnv: MobileAppEnv, platform: MobilePlatform, value?: string): string {
  if (value) {
    return value;
  }

  if (appEnv !== 'development') {
    throw new Error('Missing required environment variable: EXPO_PUBLIC_API_URL');
  }

  return platform === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

function resolveAuthRedirectUri(appEnv: MobileAppEnv, value?: string): string {
  if (value) {
    return value;
  }

  if (appEnv !== 'development') {
    throw new Error('Missing required environment variable: EXPO_PUBLIC_AUTH_REDIRECT_URI');
  }

  return getDefaultMobileAuthRedirectUri(appEnv);
}

function resolveRevenueCat(platform: MobilePlatform, appEnv: MobileAppEnv, env: MobilePublicEnv) {
  const iosApiKey =
    requiredOutsideDevelopment(appEnv, 'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS', env.revenueCatApiKeyIos) ??
    null;
  const androidApiKey =
    requiredOutsideDevelopment(
      appEnv,
      'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID',
      env.revenueCatApiKeyAndroid
    ) ?? null;
  const platformApiKey =
    platform === 'ios' ? iosApiKey : platform === 'android' ? androidApiKey : null;

  return {
    platformApiKey,
    iosApiKey,
    androidApiKey,
    proEntitlementId:
      requiredOutsideDevelopment(
        appEnv,
        'EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID',
        env.revenueCatProEntitlementId
      ) ?? 'kure_cal_pro',
    monthlyProductId:
      requiredOutsideDevelopment(
        appEnv,
        'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID',
        env.revenueCatProMonthlyProductId
      ) ?? null,
    annualProductId:
      requiredOutsideDevelopment(
        appEnv,
        'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID',
        env.revenueCatProAnnualProductId
      ) ?? null,
  };
}

export function resolveMobileEnv(
  env: MobilePublicEnv,
  platform: MobilePlatform = Platform.OS
): ResolvedMobileEnv {
  const appEnv = resolveMobileAppEnv(env.appEnv);

  return {
    appEnv,
    appIdentity: getMobileAppIdentity(appEnv),
    apiBaseUrl: resolveApiBaseUrl(appEnv, platform, env.apiBaseUrl),
    authRedirectUri: resolveAuthRedirectUri(appEnv, env.authRedirectUri),
    supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', env.supabaseUrl),
    supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', env.supabaseAnonKey),
    revenueCat: resolveRevenueCat(platform, appEnv, env),
  };
}

let cachedEnv: ResolvedMobileEnv | null = null;

export function getMobileEnv(): ResolvedMobileEnv {
  if (!cachedEnv) {
    cachedEnv = resolveMobileEnv(readExpoPublicEnv(), Platform.OS);
  }

  return cachedEnv;
}

export function resetMobileEnvForTests() {
  cachedEnv = null;
}

export function getSupabaseUrl(): string {
  return getMobileEnv().supabaseUrl;
}

export function getSupabaseAnonKey(): string {
  return getMobileEnv().supabaseAnonKey;
}

export function getApiBaseUrl(): string {
  return getMobileEnv().apiBaseUrl;
}

export function getAuthRedirectUri(): string {
  return getMobileEnv().authRedirectUri;
}

export function getRevenueCatApiKey(): string | null {
  return getMobileEnv().revenueCat.platformApiKey;
}

export function getRevenueCatProEntitlementId(): string {
  return getMobileEnv().revenueCat.proEntitlementId;
}
