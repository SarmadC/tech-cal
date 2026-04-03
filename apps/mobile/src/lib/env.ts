import appConfig from '../../app.json';

export type MobilePlatform = 'android' | 'ios' | 'macos' | 'web' | 'windows';

type RequiredMobileEnvName =
  | 'EXPO_PUBLIC_API_URL'
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

type OptionalMobileEnvName =
  | 'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID'
  | 'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS'
  | 'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID'
  | 'EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID'
  | 'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID';

type MobileEnvName = RequiredMobileEnvName | OptionalMobileEnvName;

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
    slug?: string;
    extra?: {
      eas?: {
        projectId?: string;
      };
    };
  };
}

const mobileAppConfig = appConfig as MobileAppJson;

function getOptionalEnv(name: MobileEnvName): string | null {
  let value: string | undefined;

  switch (name) {
    case 'EXPO_PUBLIC_API_URL':
      value = process.env.EXPO_PUBLIC_API_URL;
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
  return getRequiredMobileEnv('EXPO_PUBLIC_API_URL').replace(/\/$/, '');
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
  return {
    appName: mobileAppConfig.expo?.name ?? 'KureCal Dev',
    easProjectId: mobileAppConfig.expo?.extra?.eas?.projectId ?? null,
    slug: mobileAppConfig.expo?.slug ?? 'kurecal-mobile',
  };
}
