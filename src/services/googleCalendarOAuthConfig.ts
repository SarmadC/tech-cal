function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getGoogleOAuthClientId() {
  return getRequiredEnv('GOOGLE_OAUTH_CLIENT_ID');
}

export function getGoogleOAuthClientSecret() {
  return getRequiredEnv('GOOGLE_OAUTH_CLIENT_SECRET');
}

export function getGoogleOAuthStateSecret() {
  return (
    process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    getGoogleOAuthClientSecret()
  );
}
