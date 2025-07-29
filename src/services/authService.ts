// src/services/authService.ts (Corrected)
import { supabase } from '@/lib/supabaseClient';
import type {
    AuthResponse,
    OAuthProvider,
    LoginForm,
    SignupForm
} from '@/types';

export class AuthService {
    /**
     * Sign in with email and password
     */
    static async signIn(credentials: LoginForm): Promise<AuthResponse> {
        try {
            // Note: 'data' is used here, so no change is needed.
            const { data, error } = await supabase.auth.signInWithPassword({
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
    static async signUp(data: SignupForm): Promise<AuthResponse> {
        try {
            // ... (validation logic is fine)
            if (data.password !== data.confirmPassword) {
                return { success: false, error: 'Passwords do not match' };
            }
            if (data.password.length < 8) {
                return { success: false, error: 'Password must be at least 8 characters long' };
            }
            if (!data.acceptTerms) {
                return { success: false, error: 'You must accept the terms of service' };
            }

            // Note: 'authData' is used here, so no change is needed.
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.name,
                        avatar_url: '',
                    },
                },
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
    static async signInWithOAuth(provider: OAuthProvider): Promise<AuthResponse> {
        try {
            // FIX #1: Rename 'data' to '_data' since it's not used.
            const { data: _data, error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });

            if (error) {
                return {
                    success: false,
                    error: this.getReadableErrorMessage(error.message)
                };
            }

            return {
                success: true,
                message: `Redirecting to ${provider}...`
            };
        } catch (error) {
            console.error('OAuth sign in error:', error);
            return {
                success: false,
                error: `Failed to sign in with ${provider}`
            };
        }
    }

    /**
     * Sign out current user
     */
    static async signOut(): Promise<AuthResponse> {
        try {
            const { error } = await supabase.auth.signOut();

            if (error) {
                return {
                    success: false,
                    error: this.getReadableErrorMessage(error.message)
                };
            }

            return {
                success: true,
                message: 'Successfully signed out'
            };
        } catch (error) {
            console.error('Sign out error:', error);
            return {
                success: false,
                error: 'An error occurred during sign out'
            };
        }
    }

    /**
     * Send password reset email
     */
    static async resetPassword(email: string): Promise<AuthResponse> {
        try {
            if (!email || !email.includes('@')) {
                return {
                    success: false,
                    error: 'Please enter a valid email address'
                };
            }

            // FIX #2: Rename 'data' to '_data' since it's not used.
            const { data: _data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });

            if (error) {
                return {
                    success: false,
                    error: this.getReadableErrorMessage(error.message)
                };
            }

            return {
                success: true,
                message: 'If an account with that email exists, you will receive a password reset link.'
            };
        } catch (error) {
            console.error('Password reset error:', error);
            return {
                success: false,
                error: 'An error occurred while sending the reset email'
            };
        }
    }

    /**
     * Update user password
     */
    static async updatePassword(newPassword: string): Promise<AuthResponse> {
        try {
            if (newPassword.length < 8) {
                return {
                    success: false,
                    error: 'Password must be at least 8 characters long'
                };
            }

            // FIX #3: Rename 'data' to '_data' since it's not used.
            const { data: _data, error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) {
                return {
                    success: false,
                    error: this.getReadableErrorMessage(error.message)
                };
            }

            return {
                success: true,
                message: 'Password updated successfully'
            };
        } catch (error) {
            console.error('Password update error:', error);
            return {
                success: false,
                error: 'An error occurred while updating your password'
            };
        }
    }

    /**
     * Update user email
     */
    static async updateEmail(newEmail: string): Promise<AuthResponse> {
        try {
            if (!newEmail || !newEmail.includes('@')) {
                return {
                    success: false,
                    error: 'Please enter a valid email address'
                };
            }

            // FIX #4: Rename 'data' to '_data' since it's not used.
            const { data: _data, error } = await supabase.auth.updateUser({
                email: newEmail
            });

            if (error) {
                return {
                    success: false,
                    error: this.getReadableErrorMessage(error.message)
                };
            }

            return {
                success: true,
                message: 'Please check your new email address to confirm the change.'
            };
        } catch (error) {
            console.error('Email update error:', error);
            return {
                success: false,
                error: 'An error occurred while updating your email'
            };
        }
    }
    /**
     * Get current user
     */
    static async getCurrentSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

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
    static async getCurrentUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();

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
    static async isAuthenticated(): Promise<boolean> {
        const session = await this.getCurrentSession();
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