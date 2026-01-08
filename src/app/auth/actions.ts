'use server'

import { redirect } from 'next/navigation'


import { createClient } from '@/utils/supabase/server'
import { AuthService } from '@/services/authService'
import { ProfileService } from '@/services/profileService'
import { OAuthProvider } from '@/types'


import {
    LoginSchema,
    SignupSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema
} from '@/lib/schemas'


export type AuthFormState = {
    message: string;
    errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        confirmPassword?: string[];
        acceptTerms?: string[];
        _form?: string[];
    };
    success: boolean;
    // Optional hint to client for immediate navigation after success
    shouldRedirect?: boolean;
}

/**
 * Maps AuthService error messages to field-specific errors in AuthFormState
 */
function mapAuthErrorToFormState(error: string): Partial<AuthFormState['errors']> {
    const errorLower = error.toLowerCase();
    
    // Map recognizable errors to specific fields
    if (errorLower.includes('you must accept the terms') || errorLower.includes('accept the terms')) {
        return { acceptTerms: [error] };
    }
    
    if (errorLower.includes('passwords do not match') || 
        (errorLower.includes('password') && errorLower.includes('match') && !errorLower.includes('at least'))) {
        return { confirmPassword: [error] };
    }
    
    if (errorLower.includes('password must be at least') || errorLower.includes('password should be at least')) {
        return { password: [error] };
    }
    
    if (errorLower.includes('invalid email') || errorLower.includes('please enter a valid email')) {
        return { email: [error] };
    }
    
    // For all other errors, use _form
    return { _form: [error] };
}



export async function loginAction(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const validatedFields = LoginSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid data provided.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const supabase = await createClient();
    try {
        const result = await AuthService.signIn(validatedFields.data, supabase);
        
        if (!result.success) {
            // Map error to appropriate form state
            const errorMapping = mapAuthErrorToFormState(result.error || 'Authentication failed.');
            return {
                success: false,
                message: result.error || 'Authentication failed.',
                errors: errorMapping,
            };
        }
        
        // Successful login - return success state so AuthForm onSuccess callback can handle redirect
        return {
            success: true,
            message: result.message || 'Successfully signed in!',
            shouldRedirect: true,
        };
    } catch (error) {
        console.error("Login Action Error:", error);
        return {
            success: false,
            message: 'Authentication failed.',
            errors: { _form: [(error as Error).message] },
        };
    }
}

export async function signupAction(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const validatedFields = SignupSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid data provided.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { acceptTerms, ...restOfData } = validatedFields.data;
    const serviceData = {
        ...restOfData,
        acceptTerms: acceptTerms === 'on',
    };

    const supabase = await createClient();
    try {
        const result = await AuthService.signUp(serviceData, supabase);
        
        // If signup failed, return error state with mapped errors
        if (!result.success) {
            const errorMapping = mapAuthErrorToFormState(result.error || 'Signup failed.');
            return {
                success: false,
                message: result.error || 'Signup failed.',
                errors: errorMapping,
            };
        }
        
        // Signup succeeded - check if user has a session (email confirmed)
        // If no session, email confirmation is required
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            // Do not silently treat as confirmation pending; surface the error
            return {
                success: false,
                message: 'Failed to verify session after signup. Please try again.',
                errors: { _form: [sessionError.message] },
            };
        }
        
        if (!session) {
            // Email confirmation required - return success state with message, stay on page
            return {
                success: true,
                message: result.message || 'Please check your email to confirm your account.',
                shouldRedirect: false,
            };
        }
        
        // User has session - email is confirmed, create profile
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Check if profile already exists
                try {
                    await ProfileService.getProfile(user.id, supabase);
                    // Profile exists, no need to create
                } catch (profileError) {
                    if (profileError instanceof Error && profileError.name === 'ProfileNotFoundError') {
                        // Create profile
                        await ProfileService.createProfile({
                            id: user.id,
                            fullName: user.user_metadata?.full_name || serviceData.name,
                            avatarUrl: user.user_metadata?.avatar_url || null,
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            preferences: {}
                        }, supabase);
                        console.log('[SignupAction] Profile created for new user:', user.id);
                    }
                }
            }
        } catch (profileError) {
            console.error('[SignupAction] Error creating profile:', profileError);
            // Don't fail signup if profile creation fails - it will be handled by onboarding page
        }
        
        // Fully signed up and confirmed - return success state so AuthForm onSuccess callback can handle redirect
        return {
            success: true,
            message: result.message || 'Account created successfully!',
            shouldRedirect: true,
        };
    } catch (error) {
        console.error("Signup Action Error:", error);
        return {
            success: false,
            message: 'Signup failed.',
            errors: { _form: [(error as Error).message] },
        };
    }
}

export async function forgotPasswordAction(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const validatedFields = ForgotPasswordSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid email provided.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const supabase = await createClient();
    try {
        await AuthService.resetPassword(validatedFields.data.email, supabase);
    } catch (error) {
        console.error("Forgot Password Action Error:", error);
        return {
            success: false,
            message: 'Failed to send reset link.',
            errors: { _form: [(error as Error).message] },
        };
    }

    return {
        success: true,
        message: 'Password reset link has been sent to your email.',
    };
}

export async function updatePasswordAction(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    const validatedFields = ResetPasswordSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Invalid data provided.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const supabase = await createClient();
    try {
        await AuthService.updateUserPassword(validatedFields.data.password, supabase);
    } catch (error) {
        console.error("Update Password Action Error:", error);
        return {
            success: false,
            message: 'Failed to update password.',
            errors: { _form: [(error as Error).message] },
        };
    }

    return {
        success: true,
        message: 'Password updated successfully!',
    };
}




export async function oauthSignInAction(provider: OAuthProvider, nextPath: string = '/discover') {
    const { getOAuthRedirectUrl } = await import('@/utils/authUtils');

    const redirectTo = getOAuthRedirectUrl(nextPath);

    if (!redirectTo || (redirectTo === 'http://localhost:3000/auth/callback' && process.env.NODE_ENV === 'production')) {
        const errorMessage = `Server configuration error: Unable to determine OAuth redirect URL. Got: ${redirectTo}`;
        console.error(errorMessage);
        return redirect(`/login?error=config-error&message=${encodeURIComponent(errorMessage)}`);
    }

    const supabase = await createClient();

    try {
        const oauthOptions: {
            redirectTo: string;
            queryParams?: Record<string, string>;
        } = {
            redirectTo,
        };

        // Google-specific query parameters
        if (provider === 'google') {
            oauthOptions.queryParams = {
                access_type: 'offline',
                prompt: 'consent',
            };
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: oauthOptions,
        });
        
        if (error) {
            console.error("[OAuth Action] Supabase OAuth Error", { provider, error });
            return redirect(`/login?error=oauth-failed&message=${encodeURIComponent(`Failed to authenticate with ${provider}: ${error.message}`)}`);
        }

        if (data?.url) {
            return redirect(data.url);
        }

        console.error(`[OAuth Action] No authentication URL received from ${provider} provider`);
        return redirect(`/login?error=oauth-failed&message=${encodeURIComponent(`No authentication URL received from ${provider} provider.`)}`);
    } catch (error) {

        if (error instanceof Error && (error.message === 'NEXT_REDIRECT' || error.message.includes('NEXT_REDIRECT'))) {

            throw error;
        }


        console.error("[OAuth Action] Unexpected error during OAuth", {
            provider: provider,
            error: error
        });
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return redirect(`/login?error=oauth-failed&message=${encodeURIComponent(`OAuth error: ${errorMessage}`)}`);
    }
}