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

// Type for debug details
interface DebugDetails {
    vercelEnv?: string;
    hasSupabaseUrl: boolean;
    hasSupabaseKey: boolean;
    siteUrl?: string;
    vercelUrl?: string;
    error?: string;
    email?: string;
    userId?: string;
    [key: string]: unknown; // Allow additional properties but with typed values
}

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
    debug?: {
        timestamp: string;
        environment: string;
        action: string;
        step: string;
        details?: DebugDetails;
    };
}
// Helper function to get debug info
function getDebugInfo(action: string, step: string, details?: Partial<DebugDetails>): AuthFormState['debug'] {
    return {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'unknown',
        action,
        step,
        details: {
            ...details,
            vercelEnv: process.env.VERCEL_ENV,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
            vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
        }
    };
}

// --- Actions ---

export async function loginAction(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    console.log('🔍 DEBUG: loginAction started', {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });

    const validatedFields = LoginSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        console.log('🔍 DEBUG: Validation failed', validatedFields.error);
        return {
            success: false,
            message: 'Invalid data provided.',
            errors: validatedFields.error.flatten().fieldErrors,
            debug: getDebugInfo('login', 'validation_failed', { 
                errors: validatedFields.error.flatten() 
            })
        };
    }

    console.log('🔍 DEBUG: Creating Supabase client...');
    const supabase = await createClient();
    
    // Check if Supabase client was created successfully
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    console.log('🔍 DEBUG: Current session before login:', {
        hasSession: !!currentSession,
        userId: currentSession?.user?.id
    });

    try {
        console.log('🔍 DEBUG: Calling AuthService.signIn...');
        const result = await AuthService.signIn(validatedFields.data, supabase);
        
        console.log('🔍 DEBUG: AuthService.signIn result:', {
            success: result.success,
            hasError: !!result.error,
            error: result.error
        });

        if (!result.success) {
            return {
                success: false,
                message: result.error || 'Authentication failed.',
                errors: { _form: [result.error || 'Authentication failed'] },
                debug: getDebugInfo('login', 'auth_failed', { 
                    error: result.error 
                })
            };
        }
        
        // Check session after login
        const { data: { session: newSession } } = await supabase.auth.getSession();
        console.log('🔍 DEBUG: Session after login:', {
            hasSession: !!newSession,
            userId: newSession?.user?.id,
            email: newSession?.user?.email
        });

        // Return success state - the client will handle the redirect
        return {
            success: true,
            message: 'Login successful! Redirecting...',
            debug: getDebugInfo('login', 'success', {
                hasNewSession: !!newSession,
                userId: newSession?.user?.id
            })
        };
    } catch (error) {
        console.error("🔍 DEBUG: Login Action Error:", error);
        return {
            success: false,
            message: 'Authentication failed.',
            errors: { _form: [(error as Error).message] },
            debug: getDebugInfo('login', 'exception', {
                error: (error as Error).message,
                stack: (error as Error).stack
            })
        };
    }
}

export async function signupAction(
    prevState: AuthFormState,
    formData: FormData
): Promise<AuthFormState> {
    console.log('🔍 DEBUG: signupAction started', {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });

    const validatedFields = SignupSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        console.log('🔍 DEBUG: Signup validation failed', validatedFields.error);
        return {
            success: false,
            message: 'Invalid data provided.',
            errors: validatedFields.error.flatten().fieldErrors,
            debug: getDebugInfo('signup', 'validation_failed', {
                errors: validatedFields.error.flatten()
            })
        };
    }

    const { acceptTerms, ...restOfData } = validatedFields.data;
    const serviceData = {
        ...restOfData,
        acceptTerms: acceptTerms === 'on',
    };

    console.log('🔍 DEBUG: Creating Supabase client for signup...');
    const supabase = await createClient();
    
    try {
        console.log('🔍 DEBUG: Calling AuthService.signUp...');
        const result = await AuthService.signUp(serviceData, supabase);
        
        console.log('🔍 DEBUG: AuthService.signUp result:', {
            success: result.success,
            hasError: !!result.error,
            message: result.message
        });

        if (!result.success) {
            return {
                success: false,
                message: result.error || 'Signup failed.',
                errors: { _form: [result.error || 'Signup failed'] },
                debug: getDebugInfo('signup', 'signup_failed', {
                    error: result.error
                })
            };
        }
        
        // Return success state for client to handle
        return {
            success: true,
            message: result.message || 'Account created successfully! Please check your email to verify your account.',
            debug: getDebugInfo('signup', 'success')
        };
    } catch (error) {
        console.error("🔍 DEBUG: Signup Action Error:", error);
        return {
            success: false,
            message: 'Signup failed.',
            errors: { _form: [(error as Error).message] },
            debug: getDebugInfo('signup', 'exception', {
                error: (error as Error).message,
                stack: (error as Error).stack
            })
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

// --- OAuth Action (Modified with debugging) ---

export async function oauthSignInAction(provider: OAuthProvider) {
    console.log('🔍 DEBUG: oauthSignInAction started', {
        provider,
        environment: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        timestamp: new Date().toISOString()
    });

    // ROBUST ORIGIN DETECTION LOGIC
    const origin =
        process.env.NODE_ENV === 'development'
            ? process.env.NEXT_PUBLIC_SITE_URL
            : process.env.NEXT_PUBLIC_VERCEL_URL;

    // CONSTRUCT THE FULL REDIRECT URL
    const redirectTo = `${origin}/auth/callback`;

    // CRITICAL DEBUG LOG
    console.log('🔍 DEBUG: OAuth Configuration:', {
        provider,
        origin,
        redirectTo,
        hasOrigin: !!origin,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
        vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL
    });

    if (!origin) {
        const errorMessage = 'Server configuration error: Site URL environment variable is not set.';
        console.error('🔍 DEBUG: OAuth Error - No origin:', {
            nodeEnv: process.env.NODE_ENV,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
            vercelUrl: process.env.NEXT_PUBLIC_VERCEL_URL
        });
        return redirect(`/login?message=${encodeURIComponent(errorMessage)}`);
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: redirectTo,
        },
    });

    console.log('🔍 DEBUG: OAuth result:', {
        hasData: !!data,
        hasUrl: !!data?.url,
        hasError: !!error,
        error: error?.message
    });

    if (error) {
        console.error('🔍 DEBUG: OAuth Error:', error.message);
        return redirect(`/login?message=Could not authenticate with ${provider}.`);
    }

    if (data.url) {
        console.log('🔍 DEBUG: Redirecting to OAuth provider:', data.url);
        return redirect(data.url);
    }

    return redirect('/login?message=An unexpected error occurred.');
}