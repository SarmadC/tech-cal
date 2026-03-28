export type MobileAppEnv = 'development' | 'staging' | 'production';

export interface MobileAppIdentity {
  appEnv: MobileAppEnv;
  appName: string;
  slug: string;
  scheme: string;
  iosBundleIdentifier: string;
  androidPackage: string;
}

const MOBILE_APP_SLUG = 'kurecal-mobile';

const MOBILE_APP_IDENTITIES: Record<MobileAppEnv, MobileAppIdentity> = {
  development: {
    appEnv: 'development',
    appName: 'KureCal Dev',
    slug: MOBILE_APP_SLUG,
    scheme: 'kurecal-dev',
    iosBundleIdentifier: 'com.kurecal.mobile.dev',
    androidPackage: 'com.kurecal.mobile.dev',
  },
  staging: {
    appEnv: 'staging',
    appName: 'KureCal Staging',
    slug: MOBILE_APP_SLUG,
    scheme: 'kurecal-staging',
    iosBundleIdentifier: 'com.kurecal.mobile.staging',
    androidPackage: 'com.kurecal.mobile.staging',
  },
  production: {
    appEnv: 'production',
    appName: 'KureCal',
    slug: MOBILE_APP_SLUG,
    scheme: 'kurecal',
    iosBundleIdentifier: 'com.kurecal.mobile',
    androidPackage: 'com.kurecal.mobile',
  },
};

function isMobileAppEnv(value: string | null | undefined): value is MobileAppEnv {
  return value === 'development' || value === 'staging' || value === 'production';
}

export function inferMobileAppEnv(options?: {
  explicitValue?: string | null;
  easBuildProfile?: string | null;
}): MobileAppEnv {
  const explicitValue = options?.explicitValue?.trim().toLowerCase();
  if (isMobileAppEnv(explicitValue)) {
    return explicitValue;
  }

  const buildProfile = options?.easBuildProfile?.trim().toLowerCase();
  if (buildProfile === 'preview') {
    return 'staging';
  }
  if (buildProfile === 'production') {
    return 'production';
  }

  return 'development';
}

export function resolveMobileAppEnv(value?: string | null): MobileAppEnv {
  return inferMobileAppEnv({ explicitValue: value });
}

export function getMobileAppIdentity(appEnv: MobileAppEnv): MobileAppIdentity {
  return MOBILE_APP_IDENTITIES[appEnv];
}

export function getDefaultMobileAuthRedirectUri(appEnv: MobileAppEnv): string {
  return `${getMobileAppIdentity(appEnv).scheme}://auth/callback`;
}
