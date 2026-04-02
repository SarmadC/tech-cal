import type { ExpoConfig } from 'expo/config';

const MOBILE_APP_VERSION = '1.0.0';
const MOBILE_APP_SLUG = 'kurecal-mobile';
const MOBILE_AUTH_CALLBACK_PATH = '/auth/callback';

type MobileAppEnv = 'development' | 'staging' | 'production';

const MOBILE_APP_IDENTITIES = {
  development: {
    appName: 'KureCal Dev',
    slug: MOBILE_APP_SLUG,
    scheme: 'kurecal-dev',
    iosBundleIdentifier: 'com.kurecal.mobile.dev',
    androidPackage: 'com.kurecal.mobile.dev',
  },
  staging: {
    appName: 'KureCal Staging',
    slug: MOBILE_APP_SLUG,
    scheme: 'kurecal-staging',
    iosBundleIdentifier: 'com.kurecal.mobile.staging',
    androidPackage: 'com.kurecal.mobile.staging',
  },
  production: {
    appName: 'KureCal',
    slug: MOBILE_APP_SLUG,
    scheme: 'kurecal',
    iosBundleIdentifier: 'com.kurecal.mobile',
    androidPackage: 'com.kurecal.mobile',
  },
} as const satisfies Record<
  MobileAppEnv,
  {
    appName: string;
    slug: string;
    scheme: string;
    iosBundleIdentifier: string;
    androidPackage: string;
  }
>;

function inferMobileAppEnv(): MobileAppEnv {
  const explicitValue = (process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? '')
    .trim()
    .toLowerCase();

  if (
    explicitValue === 'development' ||
    explicitValue === 'staging' ||
    explicitValue === 'production'
  ) {
    return explicitValue;
  }

  const buildProfile = (process.env.EAS_BUILD_PROFILE ?? '').trim().toLowerCase();
  if (buildProfile === 'preview') {
    return 'staging';
  }
  if (buildProfile === 'production') {
    return 'production';
  }

  return 'development';
}

function normalizeValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function getPathFromUri(uri: string): string {
  const parsed = new URL(uri);

  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    return parsed.pathname || '/';
  }

  const hostPath = parsed.host ? `/${parsed.host}` : '';
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
  const combined = `${hostPath}${pathname}` || '/';

  return combined.startsWith('/') ? combined : `/${combined}`;
}

function requireBuildEnvVar(appEnv: MobileAppEnv, name: string, value: string | undefined): string | undefined {
  if (value) {
    return value;
  }

  if (appEnv !== 'development') {
    throw new Error(`Missing required environment variable for ${appEnv} mobile builds: ${name}`);
  }

  return undefined;
}

function requireAbsoluteUrl(name: string, value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`Environment variable ${name} must be a valid absolute URL. Received: ${value}`);
  }
}

function validateAuthRedirectUri(
  appEnv: MobileAppEnv,
  identity: (typeof MOBILE_APP_IDENTITIES)[MobileAppEnv],
  configuredValue: string | undefined
): string {
  const expectedRedirectUri = `${identity.scheme}://auth/callback`;

  if (!configuredValue) {
    if (appEnv !== 'development') {
      throw new Error(
        `Missing required environment variable for ${appEnv} mobile builds: EXPO_PUBLIC_AUTH_REDIRECT_URI`
      );
    }

    return expectedRedirectUri;
  }

  let parsed: URL;
  try {
    parsed = new URL(configuredValue);
  } catch {
    throw new Error(`EXPO_PUBLIC_AUTH_REDIRECT_URI must be a valid URL. Received: ${configuredValue}`);
  }

  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    throw new Error(
      `EXPO_PUBLIC_AUTH_REDIRECT_URI must use the native ${identity.scheme} scheme. Received: ${configuredValue}`
    );
  }

  if (parsed.protocol !== `${identity.scheme}:`) {
    throw new Error(
      `EXPO_PUBLIC_AUTH_REDIRECT_URI must use the ${identity.scheme} scheme for ${appEnv}. Received: ${configuredValue}`
    );
  }

  if (getPathFromUri(configuredValue) !== MOBILE_AUTH_CALLBACK_PATH) {
    throw new Error(
      `EXPO_PUBLIC_AUTH_REDIRECT_URI must point to ${expectedRedirectUri}. Received: ${configuredValue}`
    );
  }

  if (parsed.search || parsed.hash) {
    throw new Error(
      `EXPO_PUBLIC_AUTH_REDIRECT_URI must not include query parameters or fragments. Received: ${configuredValue}`
    );
  }

  return configuredValue;
}

export default (): ExpoConfig => {
  const appEnv = inferMobileAppEnv();
  const identity = MOBILE_APP_IDENTITIES[appEnv];
  const apiBaseUrl = requireAbsoluteUrl(
    'EXPO_PUBLIC_API_URL',
    requireBuildEnvVar(appEnv, 'EXPO_PUBLIC_API_URL', normalizeValue(process.env.EXPO_PUBLIC_API_URL))
  );
  const supabaseUrl = requireAbsoluteUrl(
    'EXPO_PUBLIC_SUPABASE_URL',
    requireBuildEnvVar(
      appEnv,
      'EXPO_PUBLIC_SUPABASE_URL',
      normalizeValue(process.env.EXPO_PUBLIC_SUPABASE_URL)
    )
  );
  const supabaseAnonKey = requireBuildEnvVar(
    appEnv,
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    normalizeValue(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  );
  const authRedirectUri = validateAuthRedirectUri(
    appEnv,
    identity,
    normalizeValue(process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI)
  );
  const revenueCatApiKeyIos = requireBuildEnvVar(
    appEnv,
    'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS',
    normalizeValue(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS)
  );
  const revenueCatApiKeyAndroid = requireBuildEnvVar(
    appEnv,
    'EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID',
    normalizeValue(process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID)
  );
  const revenueCatEntitlementId = requireBuildEnvVar(
    appEnv,
    'EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID',
    normalizeValue(process.env.EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID)
  );
  const revenueCatMonthlyProductId = requireBuildEnvVar(
    appEnv,
    'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID',
    normalizeValue(process.env.EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID)
  );
  const revenueCatAnnualProductId = requireBuildEnvVar(
    appEnv,
    'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID',
    normalizeValue(process.env.EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID)
  );

  void apiBaseUrl;
  void supabaseUrl;
  void supabaseAnonKey;
  void revenueCatApiKeyIos;
  void revenueCatApiKeyAndroid;
  void revenueCatEntitlementId;
  void revenueCatMonthlyProductId;
  void revenueCatAnnualProductId;

  return {
    name: identity.appName,
    slug: identity.slug,
    version: MOBILE_APP_VERSION,
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: identity.scheme,
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: identity.iosBundleIdentifier,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'Allow KureCal to detect your location for nearby discovery results.',
      },
    },
    android: {
      package: identity.androidPackage,
      permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: ['expo-router', 'expo-secure-store', 'expo-apple-authentication', 'expo-location'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      mobile: {
        appEnv,
        authRedirectUri,
      },
    },
  };
};
