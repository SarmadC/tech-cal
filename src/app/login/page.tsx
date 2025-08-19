// src/app/login/page.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { loginAction, oauthSignInAction } from '@/app/auth/actions';
import { AuthForm, AuthProviders } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import type { OAuthProvider } from '@/types';
import type { AuthFormState } from '@/app/auth/actions';

const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, initialized } = useAuth();
    const [isRedirecting, setIsRedirecting] = useState(false);

    // Get the redirect parameter from URL (if any)
    const redirectTo = searchParams.get('redirect') || '/dashboard';

    // Effect to handle redirect when user is authenticated
    useEffect(() => {
        // Only redirect if:
        // 1. Auth is initialized (we know the auth state)
        // 2. User is logged in
        // 3. We're not already redirecting (prevent multiple redirects)
        if (initialized && user && !isRedirecting) {
            console.log('User authenticated, redirecting to:', redirectTo);
            setIsRedirecting(true);

            // Small delay to ensure auth state is fully propagated
            setTimeout(() => {
                router.push(redirectTo);
            }, 100);
        }
    }, [initialized, user, redirectTo, router, isRedirecting]);

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        // OAuth handles its own redirects, so just call the action
        await oauthSignInAction(provider);
    };

    // Handle successful login
    const handleLoginSuccess = () => {
        console.log('Login successful, waiting for auth context to update...');
        // Don't redirect here - let the useEffect above handle it
        // when the auth context updates with the new user
    };

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Welcome back</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Don`&apos;`t have an account?{' '}
                            <Link href="/signup" className="font-medium text-accent-primary hover:text-accent-primary-hover">
                                Sign up
                            </Link>
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        <AuthProviders
                            onSelectProvider={handleOAuthSignIn}
                            isPending={false}
                            actionText="Continue"
                        />

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-default"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-background-secondary px-2 text-foreground-tertiary">
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        <AuthForm
                            action={loginAction}
                            initialState={initialState}
                            submitButtonText="Sign In"
                            onSuccess={handleLoginSuccess}
                        >
                            {(state) => (
                                <>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-foreground-secondary">
                                            Email address
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
                                            placeholder="you@example.com"
                                        />
                                        {state.errors?.email && (
                                            <p className="text-sm text-red-500 mt-1">{state.errors.email[0]}</p>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-foreground-secondary">
                                            Password
                                        </label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            className="mt-1 block w-full px-3 py-2 bg-background-tertiary border border-border-default rounded-lg focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
                                            placeholder="••••••••"
                                        />
                                        {state.errors?.password && (
                                            <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm">
                                            <Link
                                                href="/auth/forgot-password"
                                                className="font-medium text-accent-primary hover:text-accent-primary-hover"
                                            >
                                                Forgot your password?
                                            </Link>
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