import type { EmailOtpType, Session } from '@supabase/supabase-js';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { MobileProfileState } from '@kurecal/domain';
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  MOBILE_RESET_PASSWORD_PATH,
  getAuthCallbackParams,
  getMobileEmailRedirectUri,
  getMobileOAuthRedirectUri,
  getMobileRecoveryRedirectUri,
  isMobileAuthCallbackUrl,
} from '../lib/authRedirect';
import { loadMobileProfileState } from '../lib/mobileApi';
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from '../lib/pushNotifications';
import { syncRevenueCatIdentity } from '../lib/revenuecat';
import { supabase } from '../lib/supabase';
import { AppStartupOverlay } from '../components/brand/AppStartupOverlay';

WebBrowser.maybeCompleteAuthSession();

type PendingPostAuthRoute = typeof MOBILE_RESET_PASSWORD_PATH | null;
type OAuthProvider = 'apple' | 'google';

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpInput {
  confirmPassword: string;
  email: string;
  name: string;
  password: string;
}

interface AuthContextValue {
  authCompletionError: string | null;
  clearAuthCompletionState: () => void;
  hasCompletedOnboarding: boolean;
  hasPendingAuthCallbackUrl: boolean;
  isCompletingAuth: boolean;
  loading: boolean;
  pendingPostAuthRoute: PendingPostAuthRoute;
  profile: MobileProfileState | null;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  retryLastAuthCallback: () => Promise<void>;
  session: Session | null;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const incomingUrl = ExpoLinking.useURL();
  const oauthRedirectUrl = useMemo(() => getMobileOAuthRedirectUri(), []);
  const signupRedirectUrl = useMemo(() => getMobileEmailRedirectUri(), []);
  const recoveryRedirectUrl = useMemo(() => getMobileRecoveryRedirectUri(), []);

  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MobileProfileState | null>(null);
  const [isCompletingAuth, setIsCompletingAuth] = useState(
    () => Boolean(incomingUrl && isMobileAuthCallbackUrl(incomingUrl))
  );
  const [authCompletionError, setAuthCompletionError] = useState<string | null>(
    null
  );
  const [pendingPostAuthRoute, setPendingPostAuthRoute] =
    useState<PendingPostAuthRoute>(null);
  const lastAuthCallbackUrlRef = useRef<string | null>(null);
  const lastHandledIncomingUrlRef = useRef<string | null>(null);

  const clearAuthCompletionState = useCallback(() => {
    startTransition(() => {
      setAuthCompletionError(null);
      setPendingPostAuthRoute(null);
    });
  }, []);

  const refreshProfile = useCallback(async () => {
    const {
      data: { session: nextSession },
    } = await supabase.auth.getSession();

    if (!nextSession) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const nextProfile = await loadMobileProfileState();
      setProfile(nextProfile);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const hydrateSessionState = useCallback(
    async (nextSession: Session | null) => {
      startTransition(() => {
        setSession(nextSession);
      });

      if (!nextSession?.user) {
        startTransition(() => {
          setProfile(null);
          setProfileLoading(false);
        });
        void syncRevenueCatIdentity(null).catch((error) => {
          console.error('Failed to clear RevenueCat identity.', error);
        });
        return;
      }

      startTransition(() => {
        setProfileLoading(true);
      });

      try {
        const nextProfile = await loadMobileProfileState();
        startTransition(() => {
          setProfile(nextProfile);
        });
      } catch (error) {
        console.error('Failed to hydrate mobile auth profile.', error);
        startTransition(() => {
          setProfile(null);
        });
      } finally {
        startTransition(() => {
          setProfileLoading(false);
        });
      }

      void syncRevenueCatIdentity(nextSession.user.id).catch((error) => {
        console.error('Failed to sync RevenueCat identity.', error);
      });

      void registerForPushNotificationsAsync().catch((error) => {
        console.warn('Failed to register push notifications.', error);
      });
    },
    []
  );

  const syncSessionFromSupabase = useCallback(async () => {
    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession();

    await hydrateSessionState(existingSession);
  }, [hydrateSessionState]);

  const completeAuthFromUrl = useCallback(
    async (url: string) => {
      lastAuthCallbackUrlRef.current = url;
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
            setPendingPostAuthRoute(
              authType === 'recovery' ? MOBILE_RESET_PASSWORD_PATH : null
            );
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
            setPendingPostAuthRoute(
              authType === 'recovery' ? MOBILE_RESET_PASSWORD_PATH : null
            );
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
            setPendingPostAuthRoute(
              authType === 'recovery' ? MOBILE_RESET_PASSWORD_PATH : null
            );
          });
          return;
        }

        throw new Error(
          'This mobile auth link is missing the data needed to complete sign in.'
        );
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
    },
    [syncSessionFromSupabase]
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) {
          return;
        }

        await hydrateSessionState(data.session);
        setAuthLoading(false);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setSession(null);
        setProfile(null);
        setAuthLoading(false);
        setProfileLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }

      setAuthLoading(false);
      void hydrateSessionState(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateSessionState]);

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
  }, [completeAuthFromUrl, incomingUrl]);

  const retryLastAuthCallback = useCallback(async () => {
    if (!lastAuthCallbackUrlRef.current) {
      throw new Error('There is no auth callback to retry.');
    }

    await completeAuthFromUrl(lastAuthCallbackUrlRef.current);
  }, [completeAuthFromUrl]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authCompletionError,
      clearAuthCompletionState,
      hasCompletedOnboarding: profile?.onboarding.onboarded ?? false,
      hasPendingAuthCallbackUrl: Boolean(
        incomingUrl && isMobileAuthCallbackUrl(incomingUrl)
      ),
      isCompletingAuth,
      loading: authLoading || (session ? profileLoading : false),
      pendingPostAuthRoute,
      profile,
      refreshProfile,
      requestPasswordReset: async (email: string) => {
        clearAuthCompletionState();

        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
          throw new Error('Enter your email to request a reset link.');
        }

        const { error } = await supabase.auth.resetPasswordForEmail(
          trimmedEmail,
          {
            redirectTo: recoveryRedirectUrl,
          }
        );

        if (error) {
          throw error;
        }
      },
      retryLastAuthCallback,
      session,
      signIn: async ({ email, password }) => {
        clearAuthCompletionState();

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }
      },
      signInWithOAuth: async (provider: OAuthProvider) => {
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

        if (!data.url) {
          throw new Error('Unable to start the mobile OAuth flow.');
        }

        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          oauthRedirectUrl
        );

        if (result.type === 'success' && isMobileAuthCallbackUrl(result.url)) {
          await completeAuthFromUrl(result.url);
        }
      },
      signOut: async () => {
        clearAuthCompletionState();
        lastAuthCallbackUrlRef.current = null;
        lastHandledIncomingUrlRef.current = null;

        await unregisterPushNotificationsAsync().catch((error) => {
          console.warn('Failed to unregister push notifications.', error);
        });

        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }

        setProfile(null);
      },
      signUp: async ({
        confirmPassword,
        email,
        name,
        password,
      }: SignUpInput) => {
        clearAuthCompletionState();

        if (password !== confirmPassword) {
          throw new Error('Passwords must match.');
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
            emailRedirectTo: signupRedirectUrl,
          },
        });

        if (error) {
          throw error;
        }
      },
      updatePassword: async (newPassword: string) => {
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
      },
    }),
    [
      authCompletionError,
      authLoading,
      clearAuthCompletionState,
      completeAuthFromUrl,
      incomingUrl,
      isCompletingAuth,
      oauthRedirectUrl,
      pendingPostAuthRoute,
      profile,
      profileLoading,
      recoveryRedirectUrl,
      refreshProfile,
      retryLastAuthCallback,
      session,
      signupRedirectUrl,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AppStartupOverlay visible={value.loading || value.isCompletingAuth} />
    </AuthContext.Provider>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to complete authentication.';
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
