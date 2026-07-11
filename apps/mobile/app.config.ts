import baseConfig from './app.base.json';

type MobileAppVariant = 'development' | 'production';

const DEV_CALENDAR_DESCRIPTION =
  'Allow KureCal Dev to add, update, and remove events in your calendar.';
const PROD_CALENDAR_DESCRIPTION =
  'Allow KureCal to add, update, and remove events in your calendar.';
const DEV_REMINDERS_DESCRIPTION =
  'Allow KureCal Dev to add reminders for saved calendar events.';
const PROD_REMINDERS_DESCRIPTION =
  'Allow KureCal to add reminders for saved calendar events.';
const DEV_PHOTOS_DESCRIPTION =
  'Allow KureCal Dev to attach photos to community posts.';
const PROD_PHOTOS_DESCRIPTION =
  'Allow KureCal to attach photos to community posts.';
const DEV_LOCATION_DESCRIPTION =
  'Allow KureCal Dev to detect your location for nearby discovery results.';
const PROD_LOCATION_DESCRIPTION =
  'Allow KureCal to detect your location for nearby discovery results.';

function normalizeVariant(value: string | undefined): MobileAppVariant | null {
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

function resolveMobileAppVariant(): MobileAppVariant {
  return (
    normalizeVariant(process.env.APP_VARIANT) ??
    normalizeVariant(process.env.EAS_BUILD_PROFILE) ??
    'development'
  );
}

function requireProductionEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for a production mobile build.`);
  }
  return value;
}

export default function getMobileExpoConfig() {
  const variant = resolveMobileAppVariant();
  const isProduction = variant === 'production';
  if (isProduction) {
    [
      'EXPO_PUBLIC_API_URL',
      'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
      'EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME',
      'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
      'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS',
      'EXPO_PUBLIC_REVENUECAT_PRO_ANNUAL_PRODUCT_ID',
      'EXPO_PUBLIC_REVENUECAT_PRO_ENTITLEMENT_ID',
      'EXPO_PUBLIC_REVENUECAT_PRO_MONTHLY_PRODUCT_ID',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_SUPABASE_URL',
    ].forEach(requireProductionEnv);
  }

  return {
    expo: {
      ...baseConfig.expo,
      plugins: [
        ...(baseConfig.expo.plugins ?? []),
        [
          'expo-location',
          {
            isIosBackgroundLocationEnabled: false,
            locationAlwaysAndWhenInUsePermission: false,
            locationAlwaysPermission: false,
            locationWhenInUsePermission: isProduction
              ? PROD_LOCATION_DESCRIPTION
              : DEV_LOCATION_DESCRIPTION,
          },
        ],
        [
          'expo-calendar',
          {
            calendarPermission: isProduction
              ? PROD_CALENDAR_DESCRIPTION
              : DEV_CALENDAR_DESCRIPTION,
            remindersPermission: isProduction
              ? PROD_REMINDERS_DESCRIPTION
              : DEV_REMINDERS_DESCRIPTION,
          },
        ],
        [
          'expo-image-picker',
          {
            cameraPermission: false,
            microphonePermission: false,
            photosPermission: isProduction
              ? PROD_PHOTOS_DESCRIPTION
              : DEV_PHOTOS_DESCRIPTION,
          },
        ],
        'expo-notifications',
        './plugins/withPrivacyManifest',
        './plugins/withPodfileModularHeaders',
        [
          '@react-native-google-signin/google-signin',
          {
            iosUrlScheme: isProduction
              ? requireProductionEnv('EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME')
              : process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? '',
          },
        ],
      ],
      ios: {
        ...baseConfig.expo.ios,
        bundleIdentifier: isProduction
          ? 'com.kurecal.mobile'
          : 'com.kurecal.mobile.dev',
        infoPlist: {
          ...baseConfig.expo.ios.infoPlist,
          NSCalendarsUsageDescription: isProduction
            ? PROD_CALENDAR_DESCRIPTION
            : DEV_CALENDAR_DESCRIPTION,
          NSCalendarsFullAccessUsageDescription: isProduction
            ? PROD_CALENDAR_DESCRIPTION
            : DEV_CALENDAR_DESCRIPTION,
          NSCalendarsWriteOnlyAccessUsageDescription: isProduction
            ? PROD_CALENDAR_DESCRIPTION
            : DEV_CALENDAR_DESCRIPTION,
          NSRemindersUsageDescription: isProduction
            ? PROD_REMINDERS_DESCRIPTION
            : DEV_REMINDERS_DESCRIPTION,
          NSPhotoLibraryUsageDescription: isProduction
            ? PROD_PHOTOS_DESCRIPTION
            : DEV_PHOTOS_DESCRIPTION,
          NSLocationWhenInUseUsageDescription: isProduction
            ? PROD_LOCATION_DESCRIPTION
            : DEV_LOCATION_DESCRIPTION,
          ITSAppUsesNonExemptEncryption: false,
          UIBackgroundModes: Array.from(
            new Set([
              ...((baseConfig.expo.ios.infoPlist as { UIBackgroundModes?: string[] })
                ?.UIBackgroundModes ?? []),
              'remote-notification',
            ])
          ),
        },
        entitlements: {
          'com.apple.developer.applesignin': ['Default'],
          'aps-environment': isProduction ? 'production' : 'development',
        },
      },
      android: {
        package: isProduction ? 'com.kurecal.mobile' : 'com.kurecal.mobile.dev',
      },
      name: isProduction ? 'KureCal' : 'KureCal Dev',
      scheme: isProduction ? 'kurecal' : 'kurecal-dev',
    },
  };
}
