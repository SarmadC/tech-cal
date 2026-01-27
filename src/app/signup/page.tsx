// src/app/signup/page.tsx
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { signupAction } from '@/app/auth/actions';
import { AuthForm, AuthProviders } from '@/components/auth';
import type { OAuthProvider } from '@/types';
import type { AuthFormState } from '@/app/auth/actions';

// The initial state for our form, matching the AuthFormState type
const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

export default function SignupPage() {
    const router = useRouter();
    const emailInputRef = useRef<HTMLInputElement>(null);

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        // Track OAuth signup initiated
        posthog.capture('oauth_signup_initiated', {
            provider: provider,
            page: 'signup',
        });

        try {
            // Use route handler instead of server action for proper cookie handling
            const oauthUrl = new URL(`/api/auth/oauth/${provider}`, window.location.origin);
            oauthUrl.searchParams.set('next', '/discover');

            // Navigate to route handler which will handle OAuth initiation and redirect
            window.location.href = oauthUrl.toString();
        } catch (error) {
            // This is an actual error
            console.error('[SignupPage] OAuth sign-in error:', error);
            posthog.captureException(error);
        }
    };

    // Handle successful signup
    // If email confirmation is needed (no session), show the confirmation UI
    // If already confirmed (rare), redirect to discover
    const handleSignupSuccess = (state: AuthFormState) => {
        if (state?.shouldRedirect) {
            router.push('/discover');
            return;
        }

        const email = emailInputRef.current?.value?.trim() || '';
        const params = new URLSearchParams({ verify: '1' });
        if (email) {
            params.set('email', email);
        }
        router.push(`/login?${params.toString()}`);
    };

    return (
        <ProtectedRoute allowUnauthenticated>
            <main className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <h1 className="sr-only">Create your Kure-Cal account</h1>
                    {/* Header section remains the same */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <Image src="/logo.svg" alt="KureCal" width={48} height={48} />
                            <span className="text-2xl font-bold text-foreground-primary">KureCal</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Create your account</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-accent-primary hover:text-accent-primary-hover">Sign in</Link>
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        {/* Replaced separate OAuth forms with the AuthProviders component */}
                        <AuthProviders
                            onSelectProvider={handleOAuthSignIn}
                            isPending={false} // You can connect this to a state if you add one
                            actionText="Sign up"
                        />

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-default"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-background-secondary px-2 text-foreground-tertiary">Or sign up with email</span></div>
                        </div>

                        {/* --- THIS IS THE REFACTORED FORM --- */}
                        <AuthForm
                            action={signupAction}
                            initialState={initialState}
                            submitButtonText="Create Account"
                            onSuccess={handleSignupSuccess}
                        >
                            {(state) => (
                                <>
                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-foreground-secondary">Full Name</label>
                                        <input id="name" name="name" type="text" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
                                        {state.errors?.name && <p className="text-sm text-red-500 mt-1">{state.errors.name[0]}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-foreground-secondary">Email address</label>
                                        <input
                                            ref={emailInputRef}
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
                                        />
                                        {state.errors?.email && <p className="text-sm text-red-500 mt-1">{state.errors.email[0]}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-foreground-secondary">Password</label>
                                        <input id="password" name="password" type="password" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
                                        {state.errors?.password && <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground-secondary">Confirm Password</label>
                                        <input id="confirmPassword" name="confirmPassword" type="password" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
                                        {state.errors?.confirmPassword && <p className="text-sm text-red-500 mt-1">{state.errors.confirmPassword[0]}</p>}
                                    </div>
                                    <div className="flex items-start">
                                        <div className="flex items-center h-5">
                                            <input id="acceptTerms" name="acceptTerms" type="checkbox" className="h-4 w-4 text-accent-primary bg-background-tertiary border-border-default rounded focus:ring-accent-primary" required />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor="acceptTerms" className="text-foreground-secondary">
                                                I agree to the <Link href="/legal/terms" className="font-medium text-accent-primary hover:underline">Terms of Service</Link> and <Link href="/legal/privacy" className="font-medium text-accent-primary hover:underline">Privacy Policy</Link>
                                            </label>
                                            {state.errors?.acceptTerms && <p className="text-sm text-red-500">{state.errors.acceptTerms[0]}</p>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </AuthForm>
                    </div>
                </div>
            </main>
        </ProtectedRoute>
    );
}
