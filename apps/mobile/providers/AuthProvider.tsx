import { createContext, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import type { EmailOtpType, Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { OAuthProvider, AppProfile, SignInInput, SignUpInput } from '@kurecal/domain';
import {
  getAuthCallbackParams,
  getMobileEmailRedirectUri,
  getMobileOAuthRedirectUri,
  getMobileRecoveryRedirectUri,
  isMobileAuthCallbackUrl,
  MOBILE_RESET_PASSWORD_PATH,
} from '@/lib/authRedirect';
import { getMobileApiClient } from '@/lib/mobileApi';
import { getSupabaseClient } from '@/lib/supabase';
import { syncRevenueCatIdentity } from '@/lib/revenuecat';

WebBrowser.maybeCompleteAuthSession();

type PendingPostAuthRoute = typeof MOBILE_RESET_PASSWORD_PATH | null;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AppProfile | null;
  isLoading: boolean;
  isHydratingProfile: boolean;
  isCompletingAuth: boolean;
  hasPendingAuthCallbackUrl: boolean;
  authCompletionError: string | null;
  pendingPostAuthRoute: PendingPostAuthRoute;
  refreshProfile: () => Promise<void>;
  clearAuthCompletionState: () => void;
  retryLastAuthCallback: () => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const apiClient = useMemo(() => getMobileApiClient(), []);
  const incomingUrl = Linking.useURL();
  const oauthRedirectUrl = useMemo(() => getMobileOAuthRedirectUri(), []);
  const signupRedirectUrl = useMemo(() => getMobileEmailRedirectUri(), []);
  const recoveryRedirectUrl = useMemo(() => getMobileRecoveryRedirectUri(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydratingProfile, setIsHydratingProfile] = useState(false);
  const [isCompletingAuth, setIsCompletingAuth] = useState(
    () => Boolean(incomingUrl && isMobileAuthCallbackUrl(incomingUrl))
  );
  const [authCompletionError, setAuthCompletionError] = useState<string | null>(null);
  const [pendingPostAuthRoute, setPendingPostAuthRoute] = useState<PendingPostAuthRoute>(null);
  const lastAuthCallbackUrlRef = useRef<string | null>(null);
  const lastHandledIncomingUrlRef = useRef<string | null>(null);

  function clearAuthCompletionState() {
    startTransition(() => {
      setAuthCompletionError(null);
      setPendingPostAuthRoute(null);
    });
  }

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return 'Unable to complete authentication.';
  }

  function resolvePendingPostAuthRoute(type: string | null): PendingPostAuthRoute {
    return type === 'recovery' ? MOBILE_RESET_PASSWORD_PATH : null;
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

  async function syncSessionFromSupabase() {
    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession();

    await hydrateSessionState(existingSession);
  }

  async function completeAuthFromUrl(url: string) {
    lastAuthCallbackUrlRef.current = url;
    const params = getAuthCallbackParams(url);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const tokenHash = params.get('token_hash');
    const authType = params.get('type');
    const authError =
      params.get('error_description') ?? params.get('error') ?? params.get('error_code');

    startTransition(() => {
      setIsCompletingAuth(true);
      setAuthCompletionError(null);
      setPendingPostAuthRoute(null);
    });

    try {
      if (authError) {
        throw new Error(authError);
      }

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          throw error;
        }

        await syncSessionFromSupabase();
        startTransition(() => {
          setPendingPostAuthRoute(resolvePendingPostAuthRoute(authType));
        });
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          throw error;
        }

        await syncSessionFromSupabase();
        startTransition(() => {
          setPendingPostAuthRoute(resolvePendingPostAuthRoute(authType));
        });
        return;
      }

      if (tokenHash && isSupportedOtpType(authType)) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: authType,
        });

        if (error) {
          throw error;
        }

        await syncSessionFromSupabase();
        startTransition(() => {
          setPendingPostAuthRoute(resolvePendingPostAuthRoute(authType));
        });
        return;
      }

      throw new Error('This mobile auth link is missing the data needed to complete sign in.');
    } catch (error) {
      const message = getErrorMessage(error);
      startTransition(() => {
        setAuthCompletionError(message);
        setPendingPostAuthRoute(null);
      });
      throw error;
    } finally {
      startTransition(() => {
        setIsCompletingAuth(false);
      });
    }
  }

  async function refreshProfile(): Promise<void> {
    try {
      const profileResult = await apiClient.getProfile();
      startTransition(() => {
        setProfile(profileResult.success ? profileResult.data ?? null : null);
      });
    } catch (error) {
      console.error('Failed to hydrate mobile auth profile.', error);
      startTransition(() => {
        setProfile(null);
      });
    }
  }

  async function hydrateSessionState(nextSession: Session | null) {
    startTransition(() => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    if (!nextSession?.user) {
      startTransition(() => {
        setProfile(null);
        setIsHydratingProfile(false);
      });
      void syncRevenueCatIdentity(null).catch((error) => {
        console.error('Failed to clear RevenueCat identity.', error);
      });
      return;
    }

    startTransition(() => {
      setIsHydratingProfile(true);
    });

    try {
      await refreshProfile();
    } finally {
      startTransition(() => {
        setIsHydratingProfile(false);
      });
    }

    void syncRevenueCatIdentity(nextSession.user.id).catch((error) => {
      console.error('Failed to sync RevenueCat identity.', error);
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        await hydrateSessionState(existingSession);
      } catch (error) {
        console.error('Failed to bootstrap mobile auth state.', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void hydrateSessionState(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!incomingUrl || !isMobileAuthCallbackUrl(incomingUrl)) {
      return;
    }

    if (lastHandledIncomingUrlRef.current === incomingUrl) {
      return;
    }

    lastHandledIncomingUrlRef.current = incomingUrl;

    void completeAuthFromUrl(incomingUrl).catch((error) => {
      console.error('Failed to restore auth session from deep link.', error);
    });
  }, [incomingUrl, supabase]);

  async function retryLastAuthCallback() {
    if (!lastAuthCallbackUrlRef.current) {
      throw new Error('There is no auth callback to retry.');
    }

    await completeAuthFromUrl(lastAuthCallbackUrlRef.current);
  }

  async function signIn(input: SignInInput) {
    clearAuthCompletionState();

    const { error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw error;
    }
  }

  async function signUp(input: SignUpInput) {
    clearAuthCompletionState();

    if (input.password !== input.confirmPassword) {
      throw new Error('Passwords must match.');
    }

    if (!input.acceptTerms) {
      throw new Error('Accept the terms to create an account.');
    }

    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { full_name: input.name },
        emailRedirectTo: signupRedirectUrl,
      },
    });

    if (error) {
      throw error;
    }
  }

  async function requestPasswordReset(email: string) {
    clearAuthCompletionState();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      throw new Error('Enter your email to request a reset link.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: recoveryRedirectUrl,
    });

    if (error) {
      throw error;
    }
  }

  async function updatePassword(newPassword: string) {
    const trimmedPassword = newPassword.trim();

    if (!trimmedPassword) {
      throw new Error('Enter a new password.');
    }

    const { error } = await supabase.auth.updateUser({
      password: trimmedPassword,
    });

    if (error) {
      throw error;
    }

    startTransition(() => {
      setPendingPostAuthRoute(null);
    });
  }

  async function signInWithOAuth(provider: OAuthProvider) {
    clearAuthCompletionState();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: oauthRedirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      throw error;
    }

    if (data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, oauthRedirectUrl);
      if (result.type === 'success' && isMobileAuthCallbackUrl(result.url)) {
        await completeAuthFromUrl(result.url);
      }
    }
  }

  async function signOut() {
    clearAuthCompletionState();
    lastAuthCallbackUrlRef.current = null;
    lastHandledIncomingUrlRef.current = null;

    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        isHydratingProfile,
        isCompletingAuth,
        hasPendingAuthCallbackUrl: Boolean(incomingUrl && isMobileAuthCallbackUrl(incomingUrl)),
        authCompletionError,
        pendingPostAuthRoute,
        refreshProfile,
        clearAuthCompletionState,
        retryLastAuthCallback,
        signIn,
        signUp,
        signInWithOAuth,
        requestPasswordReset,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
