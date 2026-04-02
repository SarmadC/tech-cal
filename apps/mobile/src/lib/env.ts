import appConfig from '../../app.json';

type RequiredMobileEnvName =
  | 'EXPO_PUBLIC_API_URL'
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY';

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

function getOptionalEnv(name: RequiredMobileEnvName): string | null {
  const value = process.env[name]?.trim();
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

export function getMobileRuntimeMetadata() {
  return {
    appName: mobileAppConfig.expo?.name ?? 'KureCal Dev',
    easProjectId: mobileAppConfig.expo?.extra?.eas?.projectId ?? null,
    slug: mobileAppConfig.expo?.slug ?? 'kurecal-mobile',
  };
}
