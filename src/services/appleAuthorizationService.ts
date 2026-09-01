import { createPrivateKey, sign } from 'node:crypto';

import type { SupabaseClientType } from '@/utils/supabase/service';
import { decryptToken, encryptToken } from '@/utils/tokenEncryption';

const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke';

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function getAppleConfiguration(clientId: string) {
  const allowedClientIds = [
    process.env.APPLE_CLIENT_ID?.trim() || 'com.kurecal.mobile',
    process.env.APPLE_DEVELOPMENT_CLIENT_ID?.trim(),
  ].filter((value): value is string => Boolean(value));
  if (!allowedClientIds.includes(clientId)) {
    throw new Error('Apple client identifier is not allowed.');
  }

  const teamId = process.env.APPLE_TEAM_ID?.trim();
  const keyId = process.env.APPLE_SIGN_IN_KEY_ID?.trim();
  const privateKey = process.env.APPLE_SIGN_IN_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!teamId || !keyId || !privateKey) {
    throw new Error('Sign in with Apple token management is not configured.');
  }
  return { clientId, keyId, privateKey, teamId };
}

function createAppleClientSecret(clientId: string): string {
  const { keyId, privateKey, teamId } = getAppleConfiguration(clientId);
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    aud: 'https://appleid.apple.com',
    exp: issuedAt + 300,
    iat: issuedAt,
    iss: teamId,
    sub: clientId,
  }));
  const signingInput = `${header}.${payload}`;
  const signature = sign('sha256', Buffer.from(signingInput), {
    dsaEncoding: 'ieee-p1363',
    key: createPrivateKey(privateKey),
  });
  return `${signingInput}.${base64Url(signature)}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Apple returned an invalid identity token.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
}

export async function retainAppleAuthorization(
  supabase: SupabaseClientType,
  input: {
    authorizationCode: string;
    clientId: string;
    expectedSubject: string;
    userId: string;
  },
): Promise<void> {
  const clientSecret = createAppleClientSecret(input.clientId);
  const body = new URLSearchParams({
    client_id: input.clientId,
    client_secret: clientSecret,
    code: input.authorizationCode,
    grant_type: 'authorization_code',
  });
  const response = await fetch(APPLE_TOKEN_URL, {
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const tokens = await response.json() as {
    error?: string;
    id_token?: string;
    refresh_token?: string;
  };
  if (!response.ok || !tokens.refresh_token || !tokens.id_token) {
    throw new Error(`Apple authorization could not be retained${tokens.error ? `: ${tokens.error}` : '.'}`);
  }

  const subject = decodeJwtPayload(tokens.id_token).sub;
  if (subject !== input.expectedSubject) {
    throw new Error('Apple authorization does not match the signed-in account.');
  }

  const { error } = await supabase
    .from('apple_auth_credentials' as never)
    .upsert({
      apple_subject: input.expectedSubject,
      client_id: input.clientId,
      refresh_token: encryptToken(tokens.refresh_token),
      updated_at: new Date().toISOString(),
      user_id: input.userId,
    } as never, { onConflict: 'user_id' } as never);
  if (error) throw new Error('Unable to store Apple account authorization.');
}

export async function revokeRetainedAppleAuthorization(
  supabase: SupabaseClientType,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('apple_auth_credentials' as never)
    .select('client_id,refresh_token')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error('Unable to load Apple account authorization.');
  if (!data) return false;

  const credential = data as unknown as { client_id: string; refresh_token: string };
  const body = new URLSearchParams({
    client_id: credential.client_id,
    client_secret: createAppleClientSecret(credential.client_id),
    token: decryptToken(credential.refresh_token),
    token_type_hint: 'refresh_token',
  });
  const response = await fetch(APPLE_REVOKE_URL, {
    body,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Unable to revoke Sign in with Apple authorization. Please try again.');
  }
  return true;
}
