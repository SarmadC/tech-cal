import Constants from 'expo-constants';

import appConfig from '../../app.base.json';

export type MobilePlatform = 'android' | 'ios' | 'macos' | 'web' | 'windows';

type RequiredMobileEnvName =
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

type OptionalMobileEnvName =
  | 'EXPO_PUBLIC_API_URL'
  | 'EXPO_PUBLIC_AUTH_REDIRECT_URI'
  | 'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID'
  | 'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS'
  | 'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID'
  | 'EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID'
  | 'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID';

type MobileEnvName = RequiredMobileEnvName | OptionalMobileEnvName;
type MobileAppVariant = 'development' | 'production';

interface RevenueCatRuntimeConfig {
  annualProductId: string | null;
  androidApiKey: string | null;
  iosApiKey: string | null;
  monthlyProductId: string | null;
  platformApiKey: string | null;
  proEntitlementId: string;
}

interface MobileAppJson {
  expo?: {
    name?: string;
    scheme?: string;
    slug?: string;
    extra?: {
      eas?: {
        projectId?: string;
      };
    };
  };
}

interface LegacyExpoManifest {
  debuggerHost?: string;
}

const mobileAppConfig = appConfig as MobileAppJson;

const MOBILE_APP_RUNTIME_METADATA = {
  development: {
    appName: 'KureCal Dev',
    easProjectId: '788fd018-fbcd-4809-9760-9fed5af7d221',
    scheme: 'kurecal-dev',
    slug: 'kurecal-mobile',
  },
  production: {
    appName: 'KureCal',
    easProjectId: '788fd018-fbcd-4809-9760-9fed5af7d221',
    scheme: 'kurecal',
    slug: 'kurecal-mobile',
  },
} as const;

function normalizeAppVariant(value: string | undefined): MobileAppVariant | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'production' || normalized === 'prod') {
    return 'production';
  }

  if (
    normalized === 'development' ||
    normalized === 'dev' ||
    normalized === 'preview'
  ) {
    return 'development';
  }

  return null;
}

function resolveAppVariant(): MobileAppVariant {
  return (
    normalizeAppVariant(process.env.APP_VARIANT) ??
    normalizeAppVariant(process.env.EAS_BUILD_PROFILE) ??
    'development'
  );
}

function getOptionalEnv(name: MobileEnvName): string | null {
  let value: string | undefined;

  switch (name) {
    case 'EXPO_PUBLIC_API_URL':
      value = process.env.EXPO_PUBLIC_API_URL;
      break;
    case 'EXPO_PUBLIC_AUTH_REDIRECT_URI':
      value = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI;
      break;
    case 'EXPO_PUBLIC_SUPABASE_URL':
      value = process.env.EXPO_PUBLIC_SUPABASE_URL;
      break;
    case 'EXPO_PUBLIC_SUPABASE_ANON_KEY':
      value = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      break;
    case 'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID':
      value = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;
      break;
    case 'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS':
      value = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
      break;
    case 'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID':
      value = process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID;
      break;
    case 'EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID':
      value = process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID;
      break;
    case 'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID':
      value = process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID;
      break;
  }

  value = value?.trim();
  return value ? value : null;
}

export function getRequiredMobileEnv(name: RequiredMobileEnvName): string {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`${name} is missing from the mobile environment.`);
  }

  return value;
}

export function getMobileApiBaseUrl(): string {
  const configured = getOptionalEnv('EXPO_PUBLIC_API_URL');
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (__DEV__) {
    // Derive the API host from Expo's bundler host so the URL stays correct
    // across WiFi changes without needing to update .env manually.
    const bundlerHost =
      Constants.expoConfig?.hostUri ??
      (Constants.manifest as LegacyExpoManifest | null)?.debuggerHost;

    if (bundlerHost) {
      const host = bundlerHost.split(':')[0];
      return `http://${host}:3000`;
    }
  }

  throw new Error('EXPO_PUBLIC_API_URL is missing from the mobile environment.');
}

export function getSupabaseRuntimeConfig() {
  return {
    anonKey: getRequiredMobileEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    url: getRequiredMobileEnv('EXPO_PUBLIC_SUPABASE_URL'),
  };
}

export function getRevenueCatRuntimeConfig(
  platform: MobilePlatform = 'ios'
): RevenueCatRuntimeConfig {
  const iosApiKey = getOptionalEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_IOS');
  const androidApiKey = getOptionalEnv('EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID');

  return {
    annualProductId: getOptionalEnv('EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID'),
    androidApiKey,
    iosApiKey,
    monthlyProductId: getOptionalEnv('EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID'),
    platformApiKey:
      platform === 'ios'
        ? iosApiKey
        : platform === 'android'
          ? androidApiKey
          : null,
    proEntitlementId:
      getOptionalEnv('EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID') ??
      'kure_cal_pro',
  };
}

export function getRevenueCatApiKey(
  platform: MobilePlatform = 'ios'
): string | null {
  return getRevenueCatRuntimeConfig(platform).platformApiKey;
}

export function getRevenueCatProductIds() {
  const config = getRevenueCatRuntimeConfig();

  return {
    annual: config.annualProductId,
    monthly: config.monthlyProductId,
  };
}

export function getRevenueCatProEntitlementId(): string {
  return getRevenueCatRuntimeConfig().proEntitlementId;
}

export function getMobileRuntimeMetadata() {
  const variant = MOBILE_APP_RUNTIME_METADATA[resolveAppVariant()];

  return {
    appName: variant.appName ?? mobileAppConfig.expo?.name ?? 'KureCal Dev',
    easProjectId:
      variant.easProjectId ?? mobileAppConfig.expo?.extra?.eas?.projectId ?? null,
    scheme: variant.scheme ?? mobileAppConfig.expo?.scheme ?? 'kurecal-dev',
    slug: variant.slug ?? mobileAppConfig.expo?.slug ?? 'kurecal-mobile',
  };
}
