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
    useRef
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
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

// --- Context Types ---
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

// --- Context Creation ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider ---
interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    // --- State ---
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        session: null,
        profile: null,
        loading: true,
        initialized: false,
    });

    // Use ref to track if we're currently updating auth state to prevent race conditions
    const isUpdatingRef = useRef(false);

    // --- Profile Management ---
    const loadUserProfile = useCallback(async (user: User): Promise<AppProfile | null> => {
        try {
            const result = await ProfileService.getProfile(user.id);
            if (result.success && result.data) {
                return result.data;
            }

            // If no profile exists, create one
            const createResult = await ProfileService.createProfile({
                id: user.id,
                fullName: user.user_metadata?.full_name || null,
                avatarUrl: user.user_metadata?.avatar_url || null,
            });

            return createResult.success ? createResult.data || null : null;
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    }, []);

    const refreshProfile = useCallback(async () => {
        if (!authState.user || isUpdatingRef.current) return;

        try {
            const profile = await loadUserProfile(authState.user);
            setAuthState(prev => ({ ...prev, profile }));
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    }, [authState.user, loadUserProfile]);

    // --- Auth State Management ---
    const updateAuthState = useCallback(async (session: Session | null) => {
        // Prevent multiple simultaneous updates
        if (isUpdatingRef.current) return;
        isUpdatingRef.current = true;

        try {
            const user = session?.user || null;

            // First update with user/session
            setAuthState(prev => ({
                ...prev,
                user,
                session,
                loading: true
            }));

            // Load profile if user exists
            const profile = user ? await loadUserProfile(user) : null;

            // Final update with all data
            setAuthState(prev => ({
                ...prev,
                profile,
                loading: false,
                initialized: true
            }));
        } catch (error) {
            console.error('Error updating auth state:', error);
            setAuthState(prev => ({
                ...prev,
                loading: false,
                initialized: true
            }));
        } finally {
            isUpdatingRef.current = false;
        }
    }, [loadUserProfile]);

    // --- Initialize Auth State ---
    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (mounted) {
                    await updateAuthState(session);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                if (mounted) {
                    setAuthState(prev => ({
                        ...prev,
                        loading: false,
                        initialized: true
                    }));
                }
            }
        };

        initializeAuth();

        return () => {
            mounted = false;
        };
    }, [updateAuthState]);

    // --- Auth State Listener ---
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event);

                // Don't update during sign out to prevent race conditions
                if (event === 'SIGNED_OUT') {
                    setAuthState({
                        user: null,
                        session: null,
                        profile: null,
                        loading: false,
                        initialized: true,
                    });
                } else {
                    await updateAuthState(session);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [updateAuthState]);

    // --- Auth Actions ---
    const signIn = useCallback(async (credentials: LoginForm): Promise<AuthResponse> => {
        try {
            const result = await AuthService.signIn(credentials);
            // Don't manually update state - let the auth listener handle it
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Sign in failed'
            };
        }
    }, []);

    const signUp = useCallback(async (data: SignupForm): Promise<AuthResponse> => {
        try {
            const result = await AuthService.signUp(data);
            // Don't manually update state - let the auth listener handle it
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Sign up failed'
            };
        }
    }, []);

    const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<AuthResponse> => {
        try {
            return await AuthService.signInWithOAuth(provider);
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'OAuth sign in failed'
            };
        }
    }, []);

    const signOut = useCallback(async (): Promise<void> => {
        try {
            await AuthService.signOut();
            // State will be updated by the auth listener
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }, []);

    const resetPassword = useCallback(async (email: string): Promise<AuthResponse> => {
        return await AuthService.resetPassword(email);
    }, []);

    const updateProfile = useCallback(async (data: ProfileUpdateForm): Promise<AuthResponse> => {
        if (!authState.user) {
            return { success: false, error: 'No authenticated user' };
        }

        try {
            const result = await ProfileService.updateProfile(authState.user.id, data);
            if (result.success) {
                await refreshProfile();
            }
            return result;
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Profile update failed'
            };
        }
    }, [authState.user, refreshProfile]);

    // --- Memoized Context Value ---
    const contextValue = useMemo((): AuthContextType => ({
        // State
        ...authState,
        // Actions
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
    }), [
        authState,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
    ]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

// --- Hook ---
export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// --- Utility Hooks ---
export function useUser(): User | null {
    const { user } = useAuth();
    return user;
}

export function useProfile(): AppProfile | null {
    const { profile } = useAuth();
    return profile;
}

export function useIsAuthenticated(): boolean {
    const { user, initialized } = useAuth();
    return initialized && !!user;
}

export function useUserId(): string | null {
    const { user } = useAuth();
    return user?.id || null;
}

export function useAuthLoading(): boolean {
    const { loading, initialized } = useAuth();
    return loading || !initialized;
}