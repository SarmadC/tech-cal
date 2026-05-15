import baseConfig from './app.base.json';

type MobileAppVariant = 'development' | 'production';

const DEV_FACE_ID_DESCRIPTION =
  'Allow KureCal Dev to securely unlock saved sessions.';
const PROD_FACE_ID_DESCRIPTION =
  'Allow KureCal to securely unlock saved sessions.';

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
      ios: {
        ...baseConfig.expo.ios,
        bundleIdentifier: isProduction
          ? 'com.kurecal.mobile'
          : 'com.kurecal.mobile.dev',
        infoPlist: {
          ...baseConfig.expo.ios.infoPlist,
          NSFaceIDUsageDescription: isProduction
            ? PROD_FACE_ID_DESCRIPTION
            : DEV_FACE_ID_DESCRIPTION,
        },
      },
      name: isProduction ? 'KureCal' : 'KureCal Dev',
      scheme: isProduction ? 'kurecal' : 'kurecal-dev',
    },
  };
}
