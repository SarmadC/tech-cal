import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
  getMobileEmailRedirectUri,
  getMobileOAuthRedirectUri,
  getMobileRecoveryRedirectUri,
  isMobileAuthCallbackUrl,
} from '../lib/authRedirect';
import { getMobileApiBaseUrl } from '../lib/env';
import { completeMobileAuthCallback } from '../lib/mobileAuthCompletion';
import { deleteMobileAccount, loadMobileProfileState } from '../lib/mobileApi';
import {
  registerForPushNotificationsAsync,
  unregisterPushNotificationsAsync,
} from '../lib/pushNotifications';
import { syncRevenueCatIdentity } from '../lib/revenuecat';
import { clearUserScopedSessionStorage } from '../lib/sessionStorage';
import { supabase } from '../lib/supabase';
import { AppStartupOverlay } from '../components/brand/AppStartupOverlay';

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

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
  deleteAccount: () => Promise<void>;
  hasCompletedOnboarding: boolean;
  hasPendingAuthCallbackUrl: boolean;
  isCompletingAuth: boolean;
  loading: boolean;
  pendingPostAuthRoute: PendingPostAuthRoute;
  profile: MobileProfileState | null;
  profileLoadFailed: boolean;
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
  const signupRedirectUrl = useMemo(() => getMobileEmailRedirectUri(), []);
  const recoveryRedirectUrl = useMemo(() => getMobileRecoveryRedirectUri(), []);

  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
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
          setProfileLoadFailed(false);
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
          setProfileLoadFailed(false);
        });
      } catch (error) {
        console.error('Failed to hydrate mobile auth profile.', error);
        startTransition(() => {
          setProfile(null);
          setProfileLoadFailed(true);
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

      startTransition(() => {
        setIsCompletingAuth(true);
        setAuthCompletionError(null);
        setPendingPostAuthRoute(null);
      });

      try {
        const result = await completeMobileAuthCallback(supabase.auth, url);
        await syncSessionFromSupabase();
        startTransition(() => {
          setPendingPostAuthRoute(
            result.isRecovery ? MOBILE_RESET_PASSWORD_PATH : null
          );
        });
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
      deleteAccount: async () => {
        clearAuthCompletionState();
        await deleteMobileAccount();

        startTransition(() => {
          setSession(null);
          setProfile(null);
          setProfileLoadFailed(false);
        });

        await Promise.allSettled([
          clearUserScopedSessionStorage(),
          syncRevenueCatIdentity(null),
          GoogleSignin.signOut(),
          supabase.auth.signOut({ scope: 'local' }),
        ]);
      },
      hasCompletedOnboarding: profile?.onboarding.onboarded ?? false,
      hasPendingAuthCallbackUrl: Boolean(
        incomingUrl && isMobileAuthCallbackUrl(incomingUrl)
      ),
      isCompletingAuth,
      loading: authLoading || (session ? profileLoading : false),
      pendingPostAuthRoute,
      profile,
      profileLoadFailed,
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

        if (provider === 'apple') {
          const rawNonce = Crypto.randomUUID();
          const hashedNonce = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            rawNonce
          );

          let credential: AppleAuthentication.AppleAuthenticationCredential;
          try {
            credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
              nonce: hashedNonce,
            });
          } catch (err: unknown) {
            if (
              err instanceof Error &&
              'code' in err &&
              err.code === 'ERR_REQUEST_CANCELED'
            ) {
              return;
            }
            throw err;
          }

          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'apple',
            token: credential.identityToken!,
            nonce: rawNonce,
          });

          if (error) throw error;
          return;
        }

        // Google: browser-based OAuth via Supabase.
        // GIDSignIn v9 (used by @react-native-google-signin v16) auto-embeds
        // nonces in id_tokens that the JS layer cannot access, making native
        // signInWithIdToken impossible. The browser OAuth flow avoids this.
        const redirectTo = getMobileOAuthRedirectUri();

        const { data: oauthData, error: oauthError } =
          await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo, skipBrowserRedirect: true },
          });

        if (oauthError) throw oauthError;
        if (!oauthData.url) throw new Error('Unable to start Google sign in.');

        const proxyUrl = new URL(
          `${getMobileApiBaseUrl()}/api/mobile/auth/google/start`
        );
        proxyUrl.searchParams.set('url', oauthData.url);

        const browserResult = await WebBrowser.openAuthSessionAsync(
          proxyUrl.toString(),
          redirectTo
        );

        if (browserResult.type !== 'success') return;

        // Guard against double-processing if the deep-link useEffect fires first.
        if (lastHandledIncomingUrlRef.current !== browserResult.url) {
          lastHandledIncomingUrlRef.current = browserResult.url;
          await completeAuthFromUrl(browserResult.url);
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
      pendingPostAuthRoute,
      profile,
      profileLoadFailed,
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
