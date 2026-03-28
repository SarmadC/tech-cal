import { Platform } from 'react-native';
import {
  getDefaultMobileAuthRedirectUri,
  getMobileAppIdentity,
  resolveMobileAppEnv,
  type MobileAppEnv,
  type MobileAppIdentity,
} from '@/config/appConfig';

type MobilePlatform = 'android' | 'ios' | 'web' | 'windows' | 'macos';
type EnvRecord = Record<string, string | undefined>;

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

function resolveApiBaseUrl(appEnv: MobileAppEnv, platform: MobilePlatform, env: EnvRecord): string {
  if (env.EXPO_PUBLIC_API_URL) {
    return env.EXPO_PUBLIC_API_URL;
  }

  if (appEnv !== 'development') {
    throw new Error('Missing required environment variable: EXPO_PUBLIC_API_URL');
  }

  return platform === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
}

function resolveAuthRedirectUri(appEnv: MobileAppEnv, env: EnvRecord): string {
  if (env.EXPO_PUBLIC_AUTH_REDIRECT_URI) {
    return env.EXPO_PUBLIC_AUTH_REDIRECT_URI;
  }

  if (appEnv !== 'development') {
    throw new Error('Missing required environment variable: EXPO_PUBLIC_AUTH_REDIRECT_URI');
  }

  return getDefaultMobileAuthRedirectUri(appEnv);
}

function resolveRevenueCat(platform: MobilePlatform, appEnv: MobileAppEnv, env: EnvRecord) {
  const iosApiKey =
    requiredOutsideDevelopment(appEnv, 'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS', env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS) ??
    null;
  const androidApiKey =
    requiredOutsideDevelopment(
      appEnv,
      'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID',
      env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID
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
        env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID
      ) ?? 'kure_cal_pro',
    monthlyProductId:
      requiredOutsideDevelopment(
        appEnv,
        'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID',
        env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID
      ) ?? null,
    annualProductId:
      requiredOutsideDevelopment(
        appEnv,
        'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID',
        env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID
      ) ?? null,
  };
}

export function resolveMobileEnvFromProcess(
  env: EnvRecord,
  platform: MobilePlatform = Platform.OS
): ResolvedMobileEnv {
  const appEnv = resolveMobileAppEnv(env.EXPO_PUBLIC_APP_ENV);

  return {
    appEnv,
    appIdentity: getMobileAppIdentity(appEnv),
    apiBaseUrl: resolveApiBaseUrl(appEnv, platform, env),
    authRedirectUri: resolveAuthRedirectUri(appEnv, env),
    supabaseUrl: required('EXPO_PUBLIC_SUPABASE_URL', env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: required('EXPO_PUBLIC_SUPABASE_ANON_KEY', env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    revenueCat: resolveRevenueCat(platform, appEnv, env),
  };
}

let cachedEnv: ResolvedMobileEnv | null = null;

export function getMobileEnv(): ResolvedMobileEnv {
  if (!cachedEnv) {
    cachedEnv = resolveMobileEnvFromProcess(process.env, Platform.OS);
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
