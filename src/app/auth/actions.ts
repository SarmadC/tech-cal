'use server'

import { redirect } from 'next/navigation'
// 1. REMOVED the 'headers' import as it's unreliable for this purpose
// import { headers } from 'next/headers' 
import { createClient } from '@/utils/supabase/server'
import { AuthService } from '@/services/authService'
import { OAuthProvider } from '@/types'

// Correctly import all schemas from the new central location
import {
    LoginSchema,
    SignupSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema
} from '@/lib/schemas'

// A reusable FormState type for all auth actions
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

// --- Actions ---

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


// --- OAuth Action (Modified) ---

export async function oauthSignInAction(provider: OAuthProvider) {
    // 2. ROBUST ORIGIN DETECTION LOGIC
    // This reliably determines the correct URL for local dev vs. production.
    const rawOrigin =
        process.env.NODE_ENV === 'development'
            ? process.env.NEXT_PUBLIC_SITE_URL // From your .env.local file
            : process.env.NEXT_PUBLIC_VERCEL_URL; // Automatically set by Vercel in production

    // Ensure we have a full URL with protocol
    const origin = rawOrigin && /^https?:\/\//.test(rawOrigin) ? rawOrigin : (rawOrigin ? `https://${rawOrigin}` : '');

    // 3. CONSTRUCT THE FULL REDIRECT URL
    const redirectTo = `${origin}/auth/callback`;

    // 4. (Optional but Recommended) DEBUGGING LOG
    // Check your terminal where `npm run dev` is running to see this output.
    console.log('Constructed Redirect URL for OAuth:', redirectTo);
    console.log('OAuth action - rawOrigin:', rawOrigin, 'origin:', origin, 'redirectTo:', redirectTo);

    // 5. ADD A CHECK to ensure the environment variable is set.
    if (!origin) {
        const errorMessage = 'Server configuration error: Site URL environment variable is not set.';
        console.error(errorMessage);
        return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            // 6. USE THE NEW, RELIABLE URL
            redirectTo: redirectTo,
        },
    });

    if (error) {
        console.error('OAuth Error:', error.message);
        return redirect(`/login?message=Could not authenticate with ${provider}.`);
    }

    if (data.url) {
        return redirect(data.url);
    }

    return redirect('/login?message=An unexpected error occurred.');
}