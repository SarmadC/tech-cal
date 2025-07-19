// src/contexts/AuthContext.tsx (Fixed Version)

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';

// --- Type Definitions ---
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
  const pathname = usePathname();

  // Simplified user profile creation - only for public.users table
  const ensureUserProfile = async (user: User) => {
    try {
      console.log('Checking/creating user profile for:', user.email);
      
      // ✅ FIX: Removed the unused 'existingUser' variable.
      const { error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      // If user doesn't exist in public.users, create them
      if (fetchError && fetchError.code === 'PGRST116') {
        console.log('Creating new user profile in public.users');
        
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
        
        if (insertError) {
          console.error('Error creating user profile:', insertError);
        } else {
          console.log('User profile created successfully');
        }
      } else if (fetchError) {
        console.error('Error checking user profile:', fetchError);
      } else {
        console.log('User profile already exists');
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // If we have a user, ensure their profile exists
        if (session?.user) {
          await ensureUserProfile(session.user);
        }
        
      } catch (error) {
        console.error('Error in getInitialSession:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          await ensureUserProfile(session.user);
          
          // Redirect after successful sign in
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
  }, [router, pathname]);

  // --- Auth Actions ---
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Sign in error:', error);
        return { success: false, error: error.message };
      }
      return { success: true, message: 'Successfully signed in!' };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { success: false, error: error.message };
      }
      
      if (data.user && !data.user.email_confirmed_at) {
        return { success: true, message: 'Please check your email to confirm your account.' };
      }
      
      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signInWithOAuth = async (provider: 'google' | 'github'): Promise<AuthResponse> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      
      if (error) {
        console.error('OAuth error:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, message: `Redirecting to ${provider}...` };
    } catch (error) {
      console.error('Unexpected OAuth error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Unexpected sign out error:', error);
    }
  };

  const resetPassword = async (email: string): Promise<AuthResponse> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) {
        console.error('Reset password error:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, message: 'Password reset email sent!' };
    } catch (error) {
      console.error('Unexpected reset password error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  };
  
  const updateProfile = async (data: ProfileUpdateData): Promise<AuthResponse> => {
    if (!user) return { success: false, error: 'No authenticated user' };
    
    try {
      // Update auth.users metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: data.full_name, avatar_url: data.avatar_url }
      });
      
      if (authError) {
        console.error('Auth update error:', authError);
        return { success: false, error: authError.message };
      }
      
      // Update public.users profile
      const { error: publicError } = await supabase
        .from('users')
        .update({
          name: data.full_name,
          timezone: data.timezone,
          preferences: data.preferences,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (publicError) {
        console.error('Public profile update error:', publicError);
        return { success: false, error: publicError.message };
      }

      return { success: true, message: 'Profile updated successfully!' };
    } catch (error) {
      console.error('Unexpected profile update error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
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
  }), [user, session, loading, updateProfile]);


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Custom Hooks ---
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