// src/app/signup/page.tsx
'use client';

import Link from 'next/link';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { signupAction, oauthSignInAction } from '@/app/auth/actions';
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
    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        // We can show a loading state here if desired
        await oauthSignInAction(provider);
    };

    // The AuthForm component now handles showing the success toast automatically.
    // We don't need an onSuccess redirect here because the user needs to confirm their email.

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Header section remains the same */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
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
                                        <input id="email" name="email" type="email" required className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary" />
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
                                            <input id="acceptTerms" name="acceptTerms" type="checkbox" className="h-4 w-4 text-accent-primary bg-background-tertiary border-border-default rounded focus:ring-accent-primary" />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <label htmlFor="acceptTerms" className="text-foreground-secondary">
                                                I agree to the <Link href="/legal/terms" className="font-medium text-accent-primary hover:underline">Terms of Service</Link>
                                            </label>
                                            {state.errors?.acceptTerms && <p className="text-sm text-red-500">{state.errors.acceptTerms[0]}</p>}
                                        </div>
                                    </div>
                                </>
                            )}
                        </AuthForm>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}