import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import type { MobileProfileState } from '@kurecal/domain';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
  getMobileEmailConfirmationRedirectUrl,
  getMobileAppScheme,
  getMobilePasswordResetRedirectUrl,
} from '../lib/env';
import { loadMobileProfileState } from '../lib/mobileApi';
import { syncRevenueCatIdentity } from '../lib/revenuecat';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends SignInCredentials {
  name: string;
}

interface SignInResult {
  error?: string;
}

type OAuthProvider = 'apple' | 'google';

interface AuthContextValue {
  hasCompletedOnboarding: boolean;
  loading: boolean;
  profile: MobileProfileState | null;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<SignInResult>;
  session: Session | null;
  signIn: (credentials: SignInCredentials) => Promise<SignInResult>;
  signUp: (credentials: SignUpCredentials) => Promise<SignInResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

function normalizeUrlForParams(url: string): URL {
  return new URL(url.includes('#') ? url.replace('#', '?') : url);
}

function getOAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }

  return `${getMobileAppScheme()}://auth/callback`;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<MobileProfileState | null>(null);

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

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) {
          return;
        }

        setSession(data.session);
        setAuthLoading(false);
        void syncRevenueCatIdentity(data.session?.user.id ?? null).catch(
          (error) => {
            console.error('Failed to sync RevenueCat identity.', error);
          }
        );

        if (data.session) {
          await refreshProfile();
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
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

      setSession(nextSession);
      setAuthLoading(false);
      void syncRevenueCatIdentity(nextSession?.user.id ?? null).catch((error) => {
        console.error('Failed to sync RevenueCat identity.', error);
      });

      if (nextSession) {
        void refreshProfile();
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      hasCompletedOnboarding: profile?.onboarding.onboarded ?? false,
      loading: authLoading || (session ? profileLoading : false),
      profile,
      refreshProfile,
      resetPassword: async (email) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(
            email.trim(),
            {
              redirectTo: getMobilePasswordResetRedirectUrl(),
            }
          );

          if (error) {
            return { error: error.message };
          }

          return {};
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : 'Unable to send reset email.',
          };
        }
      },
      session,
      signIn: async ({ email, password }) => {
        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { error: error.message };
          }

          return {};
        } catch (error) {
          return {
            error:
              error instanceof Error ? error.message : 'Unable to sign in.',
          };
        }
      },
      signUp: async ({ email, name, password }) => {
        try {
          const { error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                full_name: name.trim(),
              },
              emailRedirectTo: getMobileEmailConfirmationRedirectUrl(),
            },
          });

          if (error) {
            return { error: error.message };
          }

          return {};
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : 'Unable to create account.',
          };
        }
      },
      signInWithOAuth: async (provider) => {
        try {
          const redirectTo = getOAuthRedirectUrl();
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
              redirectTo,
              skipBrowserRedirect: Platform.OS !== 'web',
            },
          });

          if (error) {
            return { error: error.message };
          }

          if (Platform.OS === 'web') {
            return {};
          }

          if (!data.url) {
            return { error: 'Unable to start the mobile OAuth flow.' };
          }

          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectTo
          );
          if (result.type !== 'success') {
            return {};
          }

          const params = normalizeUrlForParams(result.url).searchParams;
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const code = params.get('code');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              return { error: sessionError.message };
            }

            return {};
          }

          if (code) {
            const { error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              return { error: exchangeError.message };
            }

            return {};
          }

          return { error: 'The OAuth callback did not include a session.' };
        } catch (error) {
          return {
            error:
              error instanceof Error
                ? error.message
                : 'Unable to start the OAuth flow.',
          };
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [authLoading, profile, profileLoading, refreshProfile, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
