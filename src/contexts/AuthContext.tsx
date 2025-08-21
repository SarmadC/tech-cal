
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
            console.warn('[AuthContext] Profile not found, user might be new:', error);
            return null;
        }
    }, [supabase]);

    // Unified auth state management - handles both initial load and subsequent changes
    useEffect(() => {
        let isActive = true;
        let hasInitialized = false;
        let initializationPromise: Promise<void> | null = null;

        // Function to update auth state consistently
        const updateAuthState = async (event: AuthChangeEvent | 'INITIAL', session: Session | null) => {
            if (!isActive) return;

            // Don't process auth changes until initial load is complete
            if (event !== 'INITIAL' && !hasInitialized) {
                return;
            }

            // Show appropriate toasts for auth events (but not on initial load)
            if (hasInitialized && event !== 'INITIAL') {
                if (event === 'SIGNED_IN') {
                    toast.success('Successfully signed in! Welcome back.', { duration: 4000 });
                } else if (event === 'SIGNED_OUT') {
                    toast.info('You have been signed out.');
                }
            }

            const currentUser = session?.user ?? null;
            let profile: AppProfile | null = null;

            // Load profile if user exists
            if (currentUser) {
                try {
                    profile = await loadProfile(currentUser.id);
                } catch (profileError) {
                    console.error('[AuthContext] Error loading profile:', profileError);
                }
            }

            if (!isActive) return;

            setAuthState({
                user: currentUser,
                session,
                profile,
                loading: false,
                initialized: true,
            });

            if (event === 'INITIAL') {
                hasInitialized = true;
            }
        };

        // Load initial session
        const initializeAuth = async () => {
            if (initializationPromise) return initializationPromise;
            
            initializationPromise = (async () => {
                try {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (error) {
                        console.error('[AuthContext] Error getting initial session:', error);
                    }
                    
                    await updateAuthState('INITIAL', session);
                } catch (error) {
                    console.error('[AuthContext] Exception during initial session fetch:', error);
                    if (!isActive) return;
                    
                    // Ensure we always initialize, even on error
                    setAuthState(prev => ({ 
                        ...prev, 
                        loading: false, 
                        initialized: true 
                    }));
                    hasInitialized = true;
                }
            })();

            return initializationPromise;
        };

        // Set up auth state change listener - but only process after initialization
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (hasInitialized) {
                updateAuthState(event, session);
            }
        });

        // Initialize immediately
        initializeAuth();

        return () => {
            isActive = false;
            subscription.unsubscribe();
        };
    }, [supabase, loadProfile]);


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
            setAuthState((prev: AuthState) => ({ ...prev, profile }));
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown profile refresh error';
            console.error('Failed to refresh profile:', errorMessage);
        }
    }, [authState.user, supabase]);

    // Memoize the context value to prevent unnecessary re-renders
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