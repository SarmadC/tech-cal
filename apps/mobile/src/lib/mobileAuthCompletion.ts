import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js';

import { getAuthCallbackParams } from './authRedirect';

type MobileAuthClient = Pick<
  SupabaseClient['auth'],
  'exchangeCodeForSession' | 'setSession' | 'verifyOtp'
>;

export async function completeMobileAuthCallback(
  auth: MobileAuthClient,
  url: string
): Promise<{ isRecovery: boolean }> {
  const params = getAuthCallbackParams(url);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const tokenHash = params.get('token_hash');
  const authType = params.get('type');
  const authError =
    params.get('error_description') ??
    params.get('error') ??
    params.get('error_code');

  if (authError) {
    throw new Error(authError);
  }

  if (accessToken && refreshToken) {
    const { error } = await auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return { isRecovery: authType === 'recovery' };
  }

  if (code) {
    const { error } = await auth.exchangeCodeForSession(code);
    if (error) throw error;
    return { isRecovery: authType === 'recovery' };
  }

  if (tokenHash && isSupportedOtpType(authType)) {
    const { error } = await auth.verifyOtp({
      token_hash: tokenHash,
      type: authType,
    });
    if (error) throw error;
    return { isRecovery: authType === 'recovery' };
  }

  throw new Error(
    'This mobile auth link is missing the data needed to complete sign in.'
  );
}

function isSupportedOtpType(type: string | null): type is EmailOtpType {
  return (
    type === 'signup' ||
    type === 'recovery' ||
    type === 'magiclink' ||
    type === 'invite' ||
    type === 'email' ||
    type === 'email_change'
  );
}
