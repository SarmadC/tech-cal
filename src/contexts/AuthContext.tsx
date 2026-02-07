
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
    useRef,
} from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
// import { useSnackbar } from '@/contexts/SnackbarContext';

import { useSupabaseSafe } from '@/components/providers/SupabaseProvider';
import { AuthService } from '@/services/authService';
import { ProfileService } from '@/services/profileService';
import { MemoizedProfileService } from '@/services/memoizedProfileService';
import { clearAllSubscriptionCache } from '@/hooks/useSubscription';
import type {
    AppProfile,
    AuthResponse,
    OAuthProvider,
    LoginForm,
    SignupForm,
    ProfileUpdateForm
} from '@/types';

// Consolidated error messages for consistency
const AUTH_ERRORS = {
  SERVICE_UNAVAILABLE: 'Authentication service not available',
  NO_USER: 'No user logged in',
  CONTEXT_MISSING: 'useAuth must be used within an AuthProvider',
} as const;

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

    const { supabase, isReady } = useSupabaseSafe();

    // Helper to load profile
    const loadProfile = useCallback(async (userId: string): Promise<AppProfile | null> => {
        if (!supabase) {
            console.warn('[AuthContext] Supabase client not available for profile loading');
            return null;
        }
        try {
            return await ProfileService.getProfile(userId, supabase);
        } catch (error) {
            if (error instanceof Error && error.name === 'ProfileNotFoundError') {
                console.warn('[AuthContext] Profile not found, user might be new:', error);
            } else {
                console.error('[AuthContext] Error loading profile:', error);
            }
            return null;
        }
    }, [supabase]);

    // Track previous user to avoid showing toast on session refresh
    const previousUserRef = useRef<User | null>(null);

    // Unified auth state management - handles both initial load and subsequent changes
    useEffect(() => {
        // Don't initialize if Supabase client isn't ready yet
        if (!isReady) {
            return;
        }

        // If Supabase client failed to initialize, set initialized state without user
        if (!supabase) {
            console.warn('[AuthContext] Supabase client not available - initializing auth context without user');
            setAuthState({
                user: null,
                session: null,
                profile: null,
                loading: false,
                initialized: true,
            });
            return;
        }

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

            // Dispatch custom events for auth notifications (but not on initial load or session refreshes)
            if (hasInitialized && event !== 'INITIAL') {
                if (event === 'SIGNED_IN') {
                    // Only show success notification if there was no previous user (actual sign-in, not session refresh)
                    const hadPreviousUser = previousUserRef.current !== null;
                    if (!hadPreviousUser) {
                        window.dispatchEvent(new CustomEvent('auth-notification', {
                            detail: { type: 'SIGNED_IN', message: 'Successfully signed in! Welcome back.' }
                        }));
                    }
                } else if (event === 'SIGNED_OUT') {
                    window.dispatchEvent(new CustomEvent('auth-notification', {
                        detail: { type: 'SIGNED_OUT', message: 'You have been signed out.' }
                    }));
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

            // Update the ref with the current user for next comparison
            previousUserRef.current = currentUser;

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
    }, [isReady, supabase, loadProfile]);


    const signIn = useCallback(async (credentials: LoginForm): Promise<AuthResponse> => {
        if (!supabase) {
            return { success: false, error: AUTH_ERRORS.SERVICE_UNAVAILABLE };
        }
        try {
            return await AuthService.signIn(credentials, supabase);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sign in error';
            return { success: false, error: errorMessage };
        }
    }, [supabase]);

    const signUp = useCallback(async (data: SignupForm): Promise<AuthResponse> => {
        if (!supabase) {
            return { success: false, error: AUTH_ERRORS.SERVICE_UNAVAILABLE };
        }
        try {
            return await AuthService.signUp(data, supabase);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sign up error';
            return { success: false, error: errorMessage };
        }
    }, [supabase]);

    const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<AuthResponse> => {
        if (!supabase) {
            return { success: false, error: AUTH_ERRORS.SERVICE_UNAVAILABLE };
        }
        try {
            return await AuthService.signInWithOAuth(provider, supabase);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown OAuth error';
            return { success: false, error: errorMessage };
        }
    }, [supabase]);

    const signOut = useCallback(async (): Promise<void> => {
        if (!supabase) {
            console.error(AUTH_ERRORS.SERVICE_UNAVAILABLE + ' for sign out');
            return;
        }
        try {
            // Clear subscription cache to prevent memory leaks
            clearAllSubscriptionCache();
            await AuthService.signOut(supabase);
            // Redirect to home page after successful signout
            window.location.href = '/';
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown sign out error';
            console.error('Sign out error:', errorMessage);
            window.dispatchEvent(new CustomEvent('auth-notification', {
                detail: { type: 'AUTH_ERROR', message: 'Failed to sign out completely. Please try again.' }
            }));
        }
    }, [supabase]);

    const resetPassword = useCallback(async (email: string): Promise<AuthResponse> => {
        if (!supabase) {
            return { success: false, error: AUTH_ERRORS.SERVICE_UNAVAILABLE };
        }
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
                return { success: false, error: AUTH_ERRORS.NO_USER };
            }
            if (!supabase) {
                return { success: false, error: AUTH_ERRORS.SERVICE_UNAVAILABLE };
            }

            const profile = await ProfileService.updateProfile(authState.user.id, data, supabase);

            // Invalidate memoized profile calculations to ensure consistency
            MemoizedProfileService.invalidateUser(authState.user.id);

            setAuthState(prev => ({ ...prev, profile }));
            return { success: true };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown profile update error';
            return { success: false, error: errorMessage };
        }
    }, [authState.user, supabase]);

    const refreshProfile = useCallback(async (): Promise<void> => {
        try {
            if (!authState.user || !supabase) return;
            
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
        throw new Error(AUTH_ERRORS.CONTEXT_MISSING);
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