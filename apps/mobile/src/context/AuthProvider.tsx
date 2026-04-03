import type { Session } from '@supabase/supabase-js';
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

import { loadMobileProfileState } from '../lib/mobileApi';
import { supabase } from '../lib/supabase';

interface SignInCredentials {
  email: string;
  password: string;
}

interface SignInResult {
  error?: string;
}

interface AuthContextValue {
  hasCompletedOnboarding: boolean;
  loading: boolean;
  profile: MobileProfileState | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  signIn: (credentials: SignInCredentials) => Promise<SignInResult>;
  signOut: () => Promise<void>;
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
      session,
      signIn: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        return {};
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
