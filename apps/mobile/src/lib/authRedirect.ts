import { getMobileRuntimeMetadata } from './env';

export const MOBILE_AUTH_CALLBACK_PATH = '/auth/callback';
export const MOBILE_RESET_PASSWORD_PATH = '/auth/reset-password';

type MobileAuthRedirectFlow = 'oauth' | 'email' | 'recovery';

function normalizeUrlForParams(url: string): URL {
  return new URL(url.includes('#') ? url.replace('#', '?') : url);
}

function getExpectedMobileAuthRedirectUri(): string {
  return `${getMobileRuntimeMetadata().scheme}://auth/callback`;
}

function getConfiguredMobileAuthRedirectUri(): string {
  const envValue = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();
  return envValue || getExpectedMobileAuthRedirectUri();
}

function getPathFromParsedUrl(parsedUrl: URL): string {
  if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
    return parsedUrl.pathname || '/';
  }

  const hostPath = parsedUrl.host ? `/${parsedUrl.host}` : '';
  const pathname = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname;
  const combined = `${hostPath}${pathname}` || '/';

  return combined.startsWith('/') ? combined : `/${combined}`;
}

function validateConfiguredMobileAuthRedirectUri() {
  const configuredUri = getConfiguredMobileAuthRedirectUri();
  const expectedRedirectUri = getExpectedMobileAuthRedirectUri();
  const { scheme } = getMobileRuntimeMetadata();

  let parsedUrl: URL;

  try {
    parsedUrl = normalizeUrlForParams(configuredUri);
  } catch {
    throw new Error(`Invalid mobile auth redirect URI: ${configuredUri}`);
  }

  if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
    throw new Error(
      `Mobile auth redirect URI must use the ${scheme} native scheme. Received ${configuredUri}.`
    );
  }

  if (parsedUrl.protocol !== `${scheme}:`) {
    throw new Error(
      `Mobile auth redirect URI must use the ${scheme} scheme. Received ${configuredUri}.`
    );
  }

  if (getPathFromParsedUrl(parsedUrl) !== MOBILE_AUTH_CALLBACK_PATH) {
    throw new Error(
      `Mobile auth redirect URI must point to ${expectedRedirectUri}. Received ${configuredUri}.`
    );
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error(
      `Mobile auth redirect URI must not include query parameters or fragments. Received ${configuredUri}.`
    );
  }

  return expectedRedirectUri;
}

export function getMobileAuthRedirectUri(
  flow: MobileAuthRedirectFlow = 'oauth'
): string {
  const baseRedirectUri = validateConfiguredMobileAuthRedirectUri();

  if (flow === 'recovery') {
    return `${baseRedirectUri}?type=recovery`;
  }

  return baseRedirectUri;
}

export function getMobileOAuthRedirectUri(): string {
  return getMobileAuthRedirectUri('oauth');
}

export function getMobileEmailRedirectUri(): string {
  return getMobileAuthRedirectUri('email');
}

export function getMobileRecoveryRedirectUri(): string {
  return getMobileAuthRedirectUri('recovery');
}

export function getPathFromUrl(url: string): string | null {
  try {
    return getPathFromParsedUrl(normalizeUrlForParams(url));
  } catch {
    return null;
  }
}

export function isMobileAuthCallbackUrl(url: string): boolean {
  return getPathFromUrl(url) === MOBILE_AUTH_CALLBACK_PATH;
}

export function getAuthCallbackParams(url: string): URLSearchParams {
  return normalizeUrlForParams(url).searchParams;
}
