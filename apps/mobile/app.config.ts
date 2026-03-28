import type { ExpoConfig } from 'expo/config';

const MOBILE_APP_VERSION = '1.0.0';
const MOBILE_APP_SLUG = 'kurecal-mobile';

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

export default (): ExpoConfig => {
  const appEnv = inferMobileAppEnv();
  const identity = MOBILE_APP_IDENTITIES[appEnv];

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
        authRedirectUri:
          process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI ?? `${identity.scheme}://auth/callback`,
      },
    },
  };
};
