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

// --- Context Types (No change here) ---
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

// --- Auth Provider ---
interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [supabase] = useState(() => createClient());

    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        session: null,
        profile: null,
        loading: true,
        initialized: false,
    });

    const loadUserProfile = useCallback(async (user: User): Promise<AppProfile | null> => {
        try {
            const result = await ProfileService.getProfile(user.id, supabase);
            if (result.success && result.data) {
                return result.data;
            }
            const createResult = await ProfileService.createProfile({
                id: user.id,
                fullName: user.user_metadata?.full_name || null,
                avatarUrl: user.user_metadata?.avatar_url || null,
            }, supabase);
            return createResult.success ? createResult.data || null : null;
        } catch (error) {
            console.error('Error loading user profile:', error);
            return null;
        }
    }, [supabase]);

    const refreshProfile = useCallback(async () => {
        if (!authState.user) return;
        try {
            const profile = await loadUserProfile(authState.user);
            setAuthState(prev => ({ ...prev, profile }));
        } catch (error) {
            console.error('Error refreshing profile:', error);
        }
    }, [authState.user, loadUserProfile]);

    const updateAuthState = useCallback(async (session: Session | null) => {
        const user = session?.user || null;
        setAuthState(prev => ({
            ...prev,
            user,
            session,
            loading: true
        }));
        const profile = user ? await loadUserProfile(user) : null;
        setAuthState(prev => ({
            ...prev,
            profile,
            loading: false,
            initialized: true
        }));
    }, [loadUserProfile]);

    useEffect(() => {
        const initializeAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            await updateAuthState(session);
        };
        initializeAuth();
    }, [supabase, updateAuthState]);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            // ✅ FIX: Add explicit types for the callback parameters
            async (event: AuthChangeEvent, session: Session | null) => {
                console.log('Auth state changed:', event);
                await updateAuthState(session);
            }
        );
        return () => subscription.unsubscribe();
    }, [supabase, updateAuthState]);

    const signIn = useCallback(async (credentials: LoginForm): Promise<AuthResponse> => {
        return await AuthService.signIn(credentials, supabase);
    }, [supabase]);

    const signUp = useCallback(async (data: SignupForm): Promise<AuthResponse> => {
        return await AuthService.signUp(data, supabase);
    }, [supabase]);

    const signInWithOAuth = useCallback(async (provider: OAuthProvider): Promise<AuthResponse> => {
        return await AuthService.signInWithOAuth(provider, supabase);
    }, [supabase]);

    const signOut = useCallback(async (): Promise<void> => {
        await AuthService.signOut(supabase);
    }, [supabase]);

    const resetPassword = useCallback(async (email: string): Promise<AuthResponse> => {
        return await AuthService.resetPassword(email, supabase);
    }, [supabase]);

    const updateProfile = useCallback(async (data: ProfileUpdateForm): Promise<AuthResponse> => {
        if (!authState.user) {
            return { success: false, error: 'No authenticated user' };
        }
        const result = await ProfileService.updateProfile(authState.user.id, data, supabase);
        if (result.success) {
            await refreshProfile();
        }
        return result;
    }, [authState.user, refreshProfile, supabase]);

    const contextValue = useMemo((): AuthContextType => ({
        ...authState,
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

// --- Hooks (No change here) ---
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