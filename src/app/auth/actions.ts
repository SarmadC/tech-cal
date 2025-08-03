// src/app/auth/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { AuthService } from '@/services/authService'
import { LoginForm, SignupForm, OAuthProvider } from '@/types'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const LoginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

const SignupSchema = z.object({
    name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, {
        message: "You must accept the Terms of Service."
    })
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});


export async function loginAction(credentials: LoginForm) {
    const validatedFields = LoginSchema.safeParse(credentials);

    if (!validatedFields.success) {
        return {
            success: false,
            error: "Invalid fields provided. Please check your email and password.",
        };
    }

    const supabase = await createClient()
    const result = await AuthService.signIn(validatedFields.data, supabase)
    return result
}

export async function signupAction(formData: SignupForm) {
    const validatedFields = SignupSchema.safeParse(formData);

    if (!validatedFields.success) {
        const firstError = Object.values(validatedFields.error.flatten().fieldErrors).flat()[0];
        return {
            success: false,
            error: firstError || "Invalid fields provided. Please check your inputs.",
        };
    }
    const supabase = await createClient()
    const result = await AuthService.signUp(validatedFields.data, supabase)
    return result
}

// OAuth action is unchanged
export async function oauthSignInAction(provider: OAuthProvider) {
    const headerStore = await headers()
    const origin = headerStore.get('origin')
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        console.error('OAuth Error:', error.message)
        return redirect('/login?error=oauth_failed')
    }

    if (data.url) {
        return redirect(data.url)
    }

    return redirect('/login?error=oauth_provider_error')
}