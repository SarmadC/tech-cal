// src/services/authService.ts
import { supabase as browserSupabaseClient, SupabaseClientType } from '@/lib/supabaseClient';
import type { AuthResponse, OAuthProvider, LoginForm, SignupForm } from '@/types';

export class AuthService {
    // Helper to make all methods use the correct client
    private static getClient(supabaseClient?: SupabaseClientType): SupabaseClientType {
        return supabaseClient || browserSupabaseClient;
    }

    /**
     * Sign in with email and password
     */
    static async signIn(
        credentials: LoginForm,
        supabaseClient?: SupabaseClientType
    ): Promise<AuthResponse> {
        const client = this.getClient(supabaseClient);
        try {
            const { data, error } = await client.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password,

            });

            if (error) {
                return {
                    success: false,
                    error: this.getReadableErrorMessage(error.message)
                };
            }

            if (!data.user) {
                return {
                    success: false,
                    error: 'Authentication failed - no user returned'
                };
            }

            return {
                success: true,
                message: 'Successfully signed in!'
            };
        } catch (error) {
            console.error('Sign in error:', error);
            return {
                success: false,
                error: 'An unexpected error occurred during sign in'
            };
        }
    }


    /**
     * Sign up with email and password
     */
    static async signUp(
        data: SignupForm,
        supabaseClient?: SupabaseClientType
    ): Promise<AuthResponse> {
        const client = this.getClient(supabaseClient);
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

            const { data: authData, error } = await client.auth.signUp({
                email: data.email,
                password: data.password,
                options: { data: { full_name: data.name } },
            });

            if (error) {
                return {
                    success: false,
                    error: this.getReadableErrorMessage(error.message)
                };
            }

            if (!authData.user) {
                return {
                    success: false,
                    error: 'Account creation failed - no user returned'
                };
            }

            if (authData.user && !authData.user.email_confirmed_at) {
                return {
                    success: true,
                    message: 'Please check your email to confirm your account before signing in.'
                };
            }

            return {
                success: true,
                message: 'Account created successfully!'
            };
        } catch (error) {
            console.error('Sign up error:', error);
            return {
                success: false,
                error: 'An unexpected error occurred during account creation'
            };
        }
    }


    /**
     * Sign in with OAuth provider
     */
    static async signInWithOAuth(
        provider: OAuthProvider,
        supabaseClient?: SupabaseClientType
    ): Promise<AuthResponse> {
        const client = this.getClient(supabaseClient);
        try {
            const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
            const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo } });
            if (error) return { success: false, error: this.getReadableErrorMessage(error.message) };
            return { success: true, message: `Redirecting to ${provider}...` };
        } catch (error) {
            console.error('OAuth sign in error:', error);
            return { success: false, error: `Failed to sign in with ${provider}` };
        }
    }


    /**
     * Sign out current user
     */
    static async signOut(supabaseClient?: SupabaseClientType): Promise<AuthResponse> {
        const client = this.getClient(supabaseClient);
        try {
            const { error } = await client.auth.signOut();
            if (error) return { success: false, error: this.getReadableErrorMessage(error.message) };
            return { success: true, message: 'Successfully signed out' };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: 'An error occurred during sign out' };
        }
    }

    /**
     * Send password reset email
     */
    static async resetPassword(
        email: string,
        supabaseClient?: SupabaseClientType
    ): Promise<AuthResponse> {
        const client = this.getClient(supabaseClient);
        try {
            const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`;
            const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) return { success: false, error: this.getReadableErrorMessage(error.message) };
            return { success: true, message: 'If an account with that email exists, a reset link will be sent.' };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: 'An error occurred while sending the reset email' };
        }
    }

    static async setSessionFromTokens(accessToken: string, refreshToken: string, supabaseClient?: SupabaseClientType): Promise<AuthResponse> {
        const client = this.getClient(supabaseClient);
        try {
            const { data, error } = await client.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
            if (error) throw error;
            if (!data.session) throw new Error('Unable to verify reset link.');
            return { success: true };
        } catch (err) {
            throw new Error(err instanceof Error ? err.message : 'Invalid or expired reset link.');
        }
    }

    /**
     * Update user password
     */
    static async updateUserPassword(newPassword: string, supabaseClient?: SupabaseClientType): Promise<AuthResponse> {
        const client = this.getClient(supabaseClient);
        try {
            if (newPassword.length < 8) {
                throw new Error('Password must be at least 8 characters long.');
            }
            const { error } = await client.auth.updateUser({ password: newPassword });
            if (error) throw error;
            return { success: true, message: 'Password updated successfully!' };
        } catch (err) {
            const friendlyError = this.getReadableErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
            throw new Error(friendlyError);
        }
    }


    /**
     * Update user email
     */
    static async updateEmail(newEmail: string, supabaseClient?: SupabaseClientType): Promise<AuthResponse> {
        // CORRECTED: Uses the getClient() helper instead of the direct import
        const client = this.getClient(supabaseClient);
        try {
            if (!newEmail || !newEmail.includes('@')) {
                return { success: false, error: 'Please enter a valid email address' };
            }
            const { error } = await client.auth.updateUser({ email: newEmail });
            if (error) return { success: false, error: this.getReadableErrorMessage(error.message) };
            return { success: true, message: 'Please check your new email address to confirm the change.' };
        } catch (error) {
            console.error('Email update error:', error);
            return { success: false, error: 'An error occurred while updating your email' };
        }
    }


    /**
     * Get current user
     */
    static async getCurrentSession(supabaseClient?: SupabaseClientType) {
        const client = this.getClient(supabaseClient);
        try {
            const { data: { session }, error } = await client.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                return null;
            }
            return session;
        } catch (error) {
            console.error('Error getting current session:', error);
            return null;
        }
    }

    /**
     * Get current user
     */
    static async getCurrentUser(supabaseClient?: SupabaseClientType) {
        const client = this.getClient(supabaseClient);
        try {
            const { data: { user }, error } = await client.auth.getUser();
            if (error) {
                console.error('Error getting user:', error);
                return null;
            }
            return user;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    static async isAuthenticated(supabaseClient?: SupabaseClientType): Promise<boolean> {
        const session = await this.getCurrentSession(supabaseClient);
        return !!session?.user;
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

        // Check for exact matches first
        if (errorMap[errorMessage]) {
            return errorMap[errorMessage];
        }

        // Check for partial matches
        for (const [key, value] of Object.entries(errorMap)) {
            if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
                return value;
            }
        }

        // Return original message if no match found
        return errorMessage;
    }
}