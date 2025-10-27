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
        await AuthService.signIn(validatedFields.data, supabase);
    } catch (error) {
        console.error("Login Action Error:", error);
        return {
            success: false,
            message: 'Authentication failed.',
            errors: { _form: [(error as Error).message] },
        };
    }

    return redirect('/discover');
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
        
        // If signup was successful and user was created, create a profile
        if (result.success) {
            try {
                // Get the current user to create profile
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
        }
    } catch (error) {
        console.error("Signup Action Error:", error);
        return {
            success: false,
            message: 'Signup failed.',
            errors: { _form: [(error as Error).message] },
        };
    }

    return redirect('/discover');
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
        // I've also updated this line for consistency and security
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            },
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