'use server'

import { redirect } from 'next/navigation'


import { createClient } from '@/utils/supabase/server'
import { AuthService } from '@/services/authService'
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

    return redirect('/dashboard');
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
        await AuthService.signUp(serviceData, supabase);
    } catch (error) {
        console.error("Signup Action Error:", error);
        return {
            success: false,
            message: 'Signup failed.',
            errors: { _form: [(error as Error).message] },
        };
    }

    return redirect('/dashboard');
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




export async function oauthSignInAction(provider: OAuthProvider) {
    const { getOAuthRedirectUrl } = await import('@/utils/authUtils');

    const redirectTo = getOAuthRedirectUrl();
    // --- FIX 3: USE STRUCTURED LOGGING ---
    console.log("[OAuth Action] Starting OAuth", { provider, redirectTo });

    if (!redirectTo || (redirectTo === 'http://localhost:3000/auth/callback' && process.env.NODE_ENV === 'production')) {
        const errorMessage = `Server configuration error: Unable to determine OAuth redirect URL. Got: ${redirectTo}`;
        console.error(errorMessage);
        return redirect(`/login?error=config-error&message=${encodeURIComponent(errorMessage)}`);
    }

    const supabase = await createClient();

    try {
        // I've also updated this line for consistency and security
        console.log("[OAuth Action] Calling Supabase auth.signInWithOAuth", { provider });
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

        console.log(`[OAuth Action] Supabase response:`, {
            hasData: !!data,
            hasUrl: !!data?.url,
            hasError: !!error,
            errorMessage: error?.message
        });

        if (error) {
            // --- FIX 2: USE STRUCTURED LOGGING ---
            console.error("[OAuth Action] Supabase OAuth Error", { provider, error });
            return redirect(`/login?error=oauth-failed&message=${encodeURIComponent(`Failed to authenticate with ${provider}: ${error.message}`)}`);
        }

        if (data?.url) {
            // --- FIX 1: USE STRUCTURED LOGGING ---
            console.log("[OAuth Action] Redirecting to OAuth provider", { provider, url: data.url });
            return redirect(data.url);
        }

        console.error(`[OAuth Action] No authentication URL received from ${provider} provider`);
        return redirect(`/login?error=oauth-failed&message=${encodeURIComponent(`No authentication URL received from ${provider} provider.`)}`);
    } catch (error) {

        if (error instanceof Error && (error.message === 'NEXT_REDIRECT' || error.message.includes('NEXT_REDIRECT'))) {

            console.log(`[OAuth Action] NEXT_REDIRECT caught - redirect to ${provider} OAuth provider is working correctly`);
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