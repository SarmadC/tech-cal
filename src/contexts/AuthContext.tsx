// src/contexts/AuthContext.tsx (Refactored and Corrected)

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, usePathname } from 'next/navigation';

// --- Type Definitions ---
interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  timezone?: string;
  preferences?: Record<string, unknown>;
};

type ProfileUpdateData = Partial<Omit<UserProfile, 'id'>>;

interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResponse>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  updateProfile: (data: ProfileUpdateData) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const ensureUserProfile = useCallback(async (userToProcess: User) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userToProcess.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setProfile(data);
      } else {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: userToProcess.id,
            full_name: userToProcess.user_metadata?.full_name || 'New User',
            avatar_url: userToProcess.user_metadata?.avatar_url,
          }).select().single();
        if (insertError) throw insertError;
        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Error ensuring user profile:', err);
    }
  }, []);
  
  useEffect(() => {
    // 1. Immediately fetch the initial session to prevent screen flicker
    const getInitialSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await ensureUserProfile(currentSession.user);
      }
      // Set loading to false only after the initial check is complete
      setLoading(false); 
    };
    
    getInitialSession();

    // 2. Set up the single, authoritative auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setLoading(true);
        setSession(newSession);
        const currentUser = newSession?.user ?? null;
        setUser(currentUser);

        if (event === 'SIGNED_IN' && currentUser) {
          await ensureUserProfile(currentUser);
          // Redirect only if they land on an auth page after signing in
          const isAuthPage = pathname === '/login' || pathname === '/signup';
          if (isAuthPage) {
            router.push('/calendar');
          }
        }
        
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          // Only redirect if they are not already on a public page
          const isProtectedPage = pathname.startsWith('/dashboard') || pathname.startsWith('/calendar');
          if (isProtectedPage) {
            router.push('/login');
          }
        }
        
        setLoading(false);
      }
    );

    // 3. Clean up the listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [ensureUserProfile, pathname, router]);


  // --- Auth Actions  ---
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Successfully signed in!' };
  };

  const signUp = async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, avatar_url: '' } }, // Ensure avatar_url exists
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
    // No need for a message, the browser will redirect immediately
    return { success: true };
  };

  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<AuthResponse> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, message: 'Password reset email sent!' };
  };
  
  const updateProfile = useCallback(async (data: ProfileUpdateData): Promise<AuthResponse> => {
    if (!user) return { success: false, error: 'No authenticated user' };
    
    try {
      // Update the public profiles table first
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          timezone: data.timezone,
          preferences: data.preferences,
          // avatar_url is usually handled separately with storage
        })
        .eq('id', user.id);
      if (profileError) return { success: false, error: profileError.message };

      // Then, update the auth user's metadata
      const { data: updatedUser, error: authError } = await supabase.auth.updateUser({
        data: { full_name: data.full_name, avatar_url: data.avatar_url }
      });
      if (authError) return { success: false, error: authError.message };
      
      // Manually update the profile state to reflect changes immediately
      if (updatedUser.user) {
        await ensureUserProfile(updatedUser.user);
      }

      return { success: true, message: 'Profile updated successfully!' };
    } catch (err) {
      return { success: false, error: (err as Error).message || 'An unexpected error occurred' };
    }
  }, [user, ensureUserProfile]);

  const value = useMemo(() => ({
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    resetPassword,
    updateProfile,
  }), [user, session, profile, loading, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
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