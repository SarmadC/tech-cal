'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// Types
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

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Unexpected error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            // Create or update user profile
            if (session?.user) {
              await ensureUserProfile(session.user);
              router.push('/dashboard');
            }
            break;
          case 'SIGNED_OUT':
            router.push('/');
            break;
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed');
            break;
          case 'USER_UPDATED':
            console.log('User updated');
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Ensure user profile exists in database
  const ensureUserProfile = async (user: User) => {
    try {
      // Check if user profile exists
      const { error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // User doesn't exist, create profile
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
              preferences: {
                notifications: true,
                theme: 'system',
                categories: []
              }
            }
          ]);

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        } else {
          console.log('User profile created successfully');
        }
      } else if (fetchError) {
        console.error('Error checking user profile:', fetchError);
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
    }
  };

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: 'Successfully signed in!' };
    } catch (_err) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && !data.user.email_confirmed_at) {
        return { 
          success: true, 
          message: 'Please check your email to confirm your account before signing in.' 
        };
      }

      return { success: true, message: 'Account created successfully!' };
    } catch (_err) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  // Sign in with OAuth
  const signInWithOAuth = async (provider: 'google' | 'github'): Promise<AuthResponse> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: `Redirecting to ${provider}...` };
    } catch (_err) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (err) {
      console.error('Unexpected error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<AuthResponse> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        message: 'Password reset email sent! Check your inbox.' 
      };
    } catch (_err) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  };

  // Update user profile
  const updateProfile = async (data: ProfileUpdateData): Promise<AuthResponse> => {
    try {
      if (!user) {
        return { success: false, error: 'No authenticated user' };
      }

      setLoading(true);

      // Update auth metadata if needed
      if (data.full_name) {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: data.full_name }
        });

        if (error) {
          return { success: false, error: error.message };
        }
      }

      // Update user profile in database
      const updateData: Record<string, unknown> = {};
      if (data.full_name) updateData.name = data.full_name;
      if (data.timezone) updateData.timezone = data.timezone;
      if (data.preferences) updateData.preferences = data.preferences;

      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', user.id);

        if (error) {
          return { success: false, error: error.message };
        }
      }

      return { success: true, message: 'Profile updated successfully!' };
    } catch (_err) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    resetPassword,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to get current user ID (useful for database queries)
export function useUserId(): string | null {
  const { user } = useAuth();
  return user?.id || null;
}

// Hook to check if user is authenticated
export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && !!user;
}