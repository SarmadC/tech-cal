// src/contexts/AuthContext.tsx (Fully Fixed)

'use client';

// Import useMemo, usePathname
import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation'; // Import usePathname

// --- Type Definitions (No Changes) ---
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  updateProfile: (data: ProfileUpdateData) => Promise<AuthResponse>;
}

interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
}

interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider Component ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // ✅ FIX: Get pathname using the usePathname hook

  const ensureUserProfile = async (user: User) => {
    try {
      const { error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('Creating new user profile for:', user.email);
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            preferences: { notifications: true, theme: 'system', categories: [] },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        if (insertError) console.error('Error creating user profile:', insertError);
      } else if (fetchError) {
        console.error('Error checking user profile:', fetchError);
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          await ensureUserProfile(session.user);
          // ✅ FIX: Use the pathname variable here
          const redirectTo = pathname.includes('login') || pathname.includes('signup')
            ? '/dashboard'
            : pathname;
          router.push(redirectTo);
        }

        if (event === 'SIGNED_OUT') {
          router.push('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, pathname]); // Add pathname to the dependency array


  // --- Auth Actions (Concise Version) ---
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Successfully signed in!' };
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { success: false, error: error.message };
    if (data.user && !data.user.email_confirmed_at) {
      return { success: true, message: 'Please check your email to confirm your account.' };
    }
    return { success: true, message: 'Account created successfully!' };
  };

  const signInWithOAuth = async (provider: 'google' | 'github'): Promise<AuthResponse> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, message: `Redirecting to ${provider}...` };
  };

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  const resetPassword = async (email: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Password reset email sent!' };
  };
  
  const updateProfile = async (data: ProfileUpdateData): Promise<AuthResponse> => {
    if (!user) return { success: false, error: 'No authenticated user' };
    
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: data.full_name, avatar_url: data.avatar_url }
    });
    if (authError) return { success: false, error: authError.message };
    
    const { error: publicError } = await supabase
      .from('users')
      .update({
        name: data.full_name,
        timezone: data.timezone,
        preferences: data.preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    if (publicError) return { success: false, error: publicError.message };

    return { success: true, message: 'Profile updated successfully!' };
  };

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    resetPassword,
    updateProfile
  }), [user, session, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Custom Hooks (No Changes) ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useUserId(): string | null {
  const { user } = useAuth();
  return user?.id || null;
}

export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && !!user;
}