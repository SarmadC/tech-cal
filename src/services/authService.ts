// src/services/authService.ts
// Removed unused import - using SupabaseClientType from types
import type { AuthResponse, OAuthProvider, LoginForm, SignupForm, SupabaseClientType } from '@/types';
import * as Sentry from "@sentry/nextjs";

// Database type now included in SupabaseClientType

// 2. USE THE 'Database' TYPE INSTEAD OF 'any'
// This makes the client fully aware of your tables, columns, and RPC functions.
// All ESLint errors will now be fixed.
// SupabaseClientType now imported from types

export class AuthService {
    /**
     * Sign in with email and password
     */
    static async signIn(
        credentials: LoginForm,
        supabaseClient: SupabaseClientType
    ): Promise<AuthResponse> {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,
            });

            if (error) {
                return { success: false, error: this.getReadableErrorMessage(error.message) };
            }
            if (!data.user) {
                return { success: false, error: 'Authentication failed - no user returned' };
            }
            return { success: true, message: 'Successfully signed in!' };
        } catch (error) {
            console.error('Sign in error:', error);
            Sentry.captureException(error);
            return { success: false, error: 'An unexpected error occurred during sign in' };
        }
    }

    /**
     * Sign up with email and password
     */
    static async signUp(
        data: SignupForm,
        supabaseClient: SupabaseClientType
    ): Promise<AuthResponse> {
        try {
            if (data.password !== data.confirmPassword) {
                return { success: false, error: 'Passwords do not match' };
            }
            if (data.password.length < 8) {
                return { success: false, error: 'Password must be at least 8 characters long' };
            }
            if (!data.acceptTerms) {
                return { success: false, error: 'You must accept the terms of service' };
            }

            const { data: authData, error } = await supabaseClient.auth.signUp({
                email: data.email,
                password: data.password,
                options: { data: { full_name: data.name } },
            });

            if (error) {
                return { success: false, error: this.getReadableErrorMessage(error.message) };
            }
            if (!authData.user) {
                return { success: false, error: 'Account creation failed - no user returned' };
            }
            if (authData.user && !authData.user.email_confirmed_at) {
                return { success: true, message: 'Please check your email to confirm your account.' };
            }
            return { success: true, message: 'Account created successfully!' };
        } catch (error) {
            console.error('Sign up error:', error);
            Sentry.captureException(error);
            return { success: false, error: 'An unexpected error occurred during account creation' };
        }
    }

    /**
     * Sign in with OAuth provider
     */
    static async signInWithOAuth(
        provider: OAuthProvider,
        supabaseClient: SupabaseClientType
    ): Promise<AuthResponse> {
        try {
            // Use the consistent redirect URL utility
            const { getOAuthRedirectUrl, logAuthUrls } = await import('@/utils/authUtils');
            
            logAuthUrls(`signInWithOAuth-${provider}`);
            
            const redirectTo = getOAuthRedirectUrl();
            
            const { error } = await supabaseClient.auth.signInWithOAuth({ 
                provider, 
                options: { 
                    redirectTo,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                } 
            });
            
            if (error) {
                console.error('[AuthService] OAuth error:', error);
                return { success: false, error: this.getReadableErrorMessage(error.message) };
            }
            
            return { success: true, message: `Redirecting to ${provider}...` };
        } catch (error) {
            console.error('[AuthService] OAuth exception:', error);
            Sentry.captureException(error, { extra: { function: 'signInWithOAuth', provider } });
            return { success: false, error: `Failed to sign in with ${provider}` };
        }
    }

    /**
     * Sign out current user
     */
    static async signOut(supabaseClient: SupabaseClientType): Promise<AuthResponse> {
        try {
            const { error } = await supabaseClient.auth.signOut();
            if (error) return { success: false, error: this.getReadableErrorMessage(error.message) };
            return { success: true, message: 'Successfully signed out' };
        } catch (error) {
            console.error('Sign out error:', error);
            Sentry.captureException(error, { extra: { function: 'signOut' } });
            return { success: false, error: 'An error occurred during sign out' };
        }
    }

    /**
     * Send password reset email
     */
    static async resetPassword(
        email: string,
        supabaseClient: SupabaseClientType
    ): Promise<AuthResponse> {
        try {
            const { getPasswordResetUrl } = await import('@/utils/authUtils');
            const redirectTo = getPasswordResetUrl();
            
            const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) return { success: false, error: this.getReadableErrorMessage(error.message) };
            return { success: true, message: 'If an account with that email exists, a reset link has been sent.' };
        } catch (error) {
            console.error('Password reset error:', error);
            Sentry.captureException(error);
            return { success: false, error: 'An error occurred while sending the reset email' };
        }
    }

    /**
     * Set the session from tokens, typically used in an auth callback or reset flow.
     */
    static async setSessionFromTokens(
        accessToken: string,
        refreshToken: string,
        supabaseClient: SupabaseClientType
    ): Promise<AuthResponse> {
        try {
            const { data, error } = await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
            if (error) throw error;
            if (!data.session) throw new Error('Unable to verify reset link.');
            return { success: true };
        } catch (err) {
            Sentry.captureException(err);
            const message = err instanceof Error ? err.message : 'Invalid or expired reset link.';
            return { success: false, error: message };
        }
    }

    /**
     * Update user password
     */
    static async updateUserPassword(
        newPassword: string,
        supabaseClient: SupabaseClientType
    ): Promise<AuthResponse> {
        try {
            if (newPassword.length < 8) {
                return { success: false, error: 'Password must be at least 8 characters long.' };
            }
            const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { success: true, message: 'Password updated successfully!' };
        } catch (err) {
            Sentry.captureException(err);
            const friendlyError = this.getReadableErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
            return { success: false, error: friendlyError };
        }
    }

    /**
     * Update user email
     */
    static async updateEmail(
        newEmail: string,
        supabaseClient: SupabaseClientType
    ): Promise<AuthResponse> {
        try {
            if (!newEmail || !newEmail.includes('@')) {
                return { success: false, error: 'Please enter a valid email address' };
            }
            const { error } = await supabaseClient.auth.updateUser({ email: newEmail });
            if (error) return { success: false, error: this.getReadableErrorMessage(error.message) };
            return { success: true, message: 'Please check your new email address to confirm the change.' };
        } catch (error) {
            console.error('Email update error:', error);
            Sentry.captureException(error);
            return { success: false, error: 'An error occurred while updating your email' };
        }
    }

    /**
     * Get current user
     */
    static async getCurrentUser(supabaseClient: SupabaseClientType) {
        try {
            const { data: { user }, error } = await supabaseClient.auth.getUser();
            if (error) {
                console.error('Error getting user:', error.message);
                return null;
            }
            return user;
        } catch (error) {
            console.error('Exception getting current user:', error);
            Sentry.captureException(error);
            return null;
        }
    }

    /**
     * Convert Supabase error messages to user-friendly messages
     */
    private static getReadableErrorMessage(errorMessage: string): string {
        const errorMap: Record<string, string> = {
            'Invalid login credentials': 'Invalid email or password. Please check your credentials and try again.',
            'Email not confirmed': 'Please check your email and click the confirmation link before signing in.',
            'User already registered': 'An account with this email already exists. Try signing in instead.',
            'Password should be at least 6 characters': 'Password must be at least 6 characters long.',
            'User not found': 'No account found with this email address.',
            'Invalid email': 'Please enter a valid email address.',
            'Signup disabled': 'New account registration is currently disabled.',
            'Too many requests': 'Too many attempts. Please wait a moment before trying again.',
        };

        for (const [key, value] of Object.entries(errorMap)) {
            if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }
        return errorMessage; // Return original message if no match found
    }
}