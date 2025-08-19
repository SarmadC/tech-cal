// src/contexts/AuthContext.tsx
'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback,
    useMemo,
} from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { createClient } from '@/utils/supabase/client';
import { AuthService } from '@/services/authService';
import { ProfileService } from '@/services/profileService';
import type {
    AppProfile,
    AuthResponse,
    OAuthProvider,
    LoginForm,
    SignupForm,
    ProfileUpdateForm
} from '@/types';

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: AppProfile | null;
    loading: boolean;
    initialized: boolean;
}

interface AuthActions {
    signIn: (credentials: LoginForm) => Promise<AuthResponse>;
    signUp: (data: SignupForm) => Promise<AuthResponse>;
    signInWithOAuth: (provider: OAuthProvider) => Promise<AuthResponse>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<AuthResponse>;
    updateProfile: (data: ProfileUpdateForm) => Promise<AuthResponse>;
    refreshProfile: () => Promise<void>;
}

export type AuthContextType = AuthState & AuthActions;

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        session: null,
        profile: null,
        loading: true,
        initialized: false,
    });

    const supabase = createClient();

    // Helper to load profile
    const loadProfile = useCallback(async (userId: string): Promise<AppProfile | null> => {
        try {
            return await ProfileService.getProfile(userId, supabase);
        } catch (error) {
            console.warn('Profile not found, user might be new:', error);
            return null;
        }
    }, [supabase]);

    // Helper to update auth state
    const updateAuthState = useCallback(async (session: Session | null) => {
        console.log('🔄 Updating auth state:', { hasSession: !!session, userId: session?.user?.id });

        const currentUser = session?.user ?? null;
        let profile: AppProfile | null = null;

        if (currentUser) {
            profile = await loadProfile(currentUser.id);
        }

        setAuthState({
            user: currentUser,
            session,
            profile,
            loading: false,
            initialized: true,
        });
    }, [loadProfile]);

    // MAIN FIX: Check for existing session on mount + listen for changes
    useEffect(() => {
        console.log('🚀 AuthContext initializing...');

        // 1. FIRST: Check for existing session immediately
        const checkInitialSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('📋 Initial session check:', {
                    hasSession: !!session,
                    userId: session?.user?.id,
                    error: error?.message
                });

                if (error) {
                    console.error('Session check error:', error);
                }

                await updateAuthState(session);
            } catch (error) {
                console.error('Failed to check initial session:', error);
                setAuthState(prev => ({ ...prev, loading: false, initialized: true }));
            }
        };

        // 2. SECOND: Set up the auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                console.log('🔔 Auth state change:', event, { hasSession: !!session, userId: session?.user?.id });

                if (event === 'SIGNED_IN') {
                    toast.success('Successfully signed in! Welcome back.', { duration: 4000 });
                }
                if (event === 'SIGNED_OUT') {
                    toast.info('You have been signed out.');
                }

                await updateAuthState(session);
            }
        );

        // Check initial session first
        checkInitialSession();

        // Cleanup
        return () => {
            console.log('🧹 Cleaning up auth subscription');
            subscription.unsubscribe();
        };
    }, [supabase, updateAuthState]);

    const signIn = useCallback(async (credentials: LoginForm): Promise<AuthResponse> => {
        try {
            return await AuthService.signIn(credentials, supabase);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sign in error';
            return { success: false, error: errorMessage };
        }
    }, [supabase]);

    const signUp = useCallback(async (data: SignupForm): Promise<AuthResponse> => {
        try {
            return await AuthService.signUp(data, supabase);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sign up error';
            return { success: false, error: errorMessage };
        }
    }, [supabase]);

    const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<AuthResponse> => {
        try {
            return await AuthService.signInWithOAuth(provider, supabase);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown OAuth error';
            return { success: false, error: errorMessage };
        }
    }, [supabase]);

    const signOut = useCallback(async (): Promise<void> => {
        try {
            await AuthService.signOut(supabase);
            // The onAuthStateChange listener will handle updating the state
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sign out error';
            console.error('Sign out error:', errorMessage);
            toast.error('Failed to sign out completely. Please try again.');
        }
    }, [supabase]);

    const resetPassword = useCallback(async (email: string): Promise<AuthResponse> => {
        try {
            return await AuthService.resetPassword(email, supabase);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown reset password error';
            return { success: false, error: errorMessage };
        }
    }, [supabase]);

    const updateProfile = useCallback(async (data: ProfileUpdateForm): Promise<AuthResponse> => {
        try {
            if (!authState.user) {
                return { success: false, error: 'No user logged in' };
            }

            const profile = await ProfileService.updateProfile(authState.user.id, data, supabase);

            setAuthState(prev => ({ ...prev, profile }));
            return { success: true };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown profile update error';
            return { success: false, error: errorMessage };
        }
    }, [authState.user, supabase]);

    const refreshProfile = useCallback(async (): Promise<void> => {
        try {
            if (!authState.user) return;

            const profile = await ProfileService.getProfile(authState.user.id, supabase);
            setAuthState(prev => ({ ...prev, profile }));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown profile refresh error';
            console.error('Failed to refresh profile:', errorMessage);
        }
    }, [authState.user, supabase]);

    // Debug logging for state changes
    useEffect(() => {
        console.log('📊 Auth state updated:', {
            hasUser: !!authState.user,
            userEmail: authState.user?.email,
            hasProfile: !!authState.profile,
            loading: authState.loading,
            initialized: authState.initialized
        });
    }, [authState]);

    // Memoize the context value
    const contextValue = useMemo((): AuthContextType => ({
        ...authState,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
    }), [authState, signIn, signUp, signInWithOAuth, signOut, resetPassword, updateProfile, refreshProfile]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// Convenience hooks (unchanged)
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useUser(): User | null {
    const { user } = useAuth();
    return user;
}

export function useProfile(): AppProfile | null {
    const { profile } = useAuth();
    return profile;
}

export function useIsAuthenticated(): boolean {
    const { user } = useAuth();
    return !!user;
}

export function useUserId(): string | null {
    const { user } = useAuth();
    return user?.id || null;
}

export function useAuthLoading(): boolean {
    const { loading } = useAuth();
    return loading;
}