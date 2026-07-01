import baseConfig from './app.base.json';

type MobileAppVariant = 'development' | 'production';

const DEV_FACE_ID_DESCRIPTION =
  'Allow KureCal Dev to securely unlock saved sessions.';
const PROD_FACE_ID_DESCRIPTION =
  'Allow KureCal to securely unlock saved sessions.';
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

export default function getMobileExpoConfig() {
  const variant = resolveMobileAppVariant();
  const isProduction = variant === 'production';

  return {
    expo: {
      ...baseConfig.expo,
      plugins: [
        ...(baseConfig.expo.plugins ?? []),
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
            iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? '',
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
          NSFaceIDUsageDescription: isProduction
            ? PROD_FACE_ID_DESCRIPTION
            : DEV_FACE_ID_DESCRIPTION,
          NSPhotoLibraryUsageDescription: isProduction
            ? PROD_PHOTOS_DESCRIPTION
            : DEV_PHOTOS_DESCRIPTION,
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
