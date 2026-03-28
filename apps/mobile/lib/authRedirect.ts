import { getMobileEnv } from '@/lib/env';

export const MOBILE_AUTH_CALLBACK_PATH = '/auth/callback';
export const MOBILE_RESET_PASSWORD_PATH = '/auth/reset-password';

type MobileAuthRedirectFlow = 'oauth' | 'email' | 'recovery';

function normalizeUrlForParams(url: string): URL {
  return new URL(url.includes('#') ? url.replace('#', '?') : url);
}

function getExpectedMobileAuthRedirectUri(): string {
  return `${getMobileEnv().appIdentity.scheme}://auth/callback`;
}

function validateConfiguredMobileAuthRedirectUri() {
  const { appIdentity, authRedirectUri } = getMobileEnv();
  const expectedRedirectUri = getExpectedMobileAuthRedirectUri();

  let parsedUrl: URL;

  try {
    parsedUrl = normalizeUrlForParams(authRedirectUri);
  } catch {
    throw new Error(`Invalid mobile auth redirect URI: ${authRedirectUri}`);
  }

  if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
    throw new Error(
      `Mobile auth redirect URI must use the ${appIdentity.scheme} native app scheme. Received ${authRedirectUri}.`
    );
  }

  if (parsedUrl.protocol !== `${appIdentity.scheme}:`) {
    throw new Error(
      `Mobile auth redirect URI must use the ${appIdentity.scheme} scheme for ${getMobileEnv().appEnv}. Received ${authRedirectUri}.`
    );
  }

  if (getPathFromUrl(authRedirectUri) !== MOBILE_AUTH_CALLBACK_PATH) {
    throw new Error(
      `Mobile auth redirect URI must point to ${expectedRedirectUri}. Received ${authRedirectUri}.`
    );
  }

  if (parsedUrl.search || parsedUrl.hash) {
    throw new Error(
      `Mobile auth redirect URI must not include query parameters or fragments. Received ${authRedirectUri}.`
    );
  }

  return expectedRedirectUri;
}

export function getMobileAuthRedirectUri(flow: MobileAuthRedirectFlow = 'oauth'): string {
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
    const parsed = normalizeUrlForParams(url);

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.pathname || '/';
    }

    const hostPath = parsed.host ? `/${parsed.host}` : '';
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname;
    const combined = `${hostPath}${pathname}` || '/';

    return combined.startsWith('/') ? combined : `/${combined}`;
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
