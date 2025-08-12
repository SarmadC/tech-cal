// src/app/login/page.tsx (Refactored)
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { loginAction, oauthSignInAction } from '@/app/auth/actions';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthProviders } from '@/components/auth';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
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

    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        await oauthSignInAction(provider);
    };

    const handleLoginSuccess = () => {
        const redirectTo = searchParams.get('redirect') || '/dashboard';
        router.refresh(); // Important to refresh server-side state
        router.replace(redirectTo);
    };

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
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Welcome back</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Don&apos;t have an account?{' '}
                            <Link href="/signup" className="font-medium text-accent-primary hover:text-accent-primary-hover">
                                Sign up free
                            </Link>
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        <AuthProviders onSelectProvider={handleOAuthSignIn} isPending={false} />

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

                        {/* --- THIS IS THE REFACTORED FORM --- */}
                        <AuthForm
                            action={loginAction}
                            initialState={initialState}
                            submitButtonText="Sign In"
                            onSuccess={handleLoginSuccess}
                        >
                            {(state) => (
                                <>
                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-foreground-secondary">Email address</label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="block w-full px-3 py-2 border border-border-default rounded-lg shadow-sm bg-background-tertiary placeholder-foreground-muted focus:outline-none focus:ring-accent-primary focus:border-accent-primary sm:text-sm"
                                        />
                                        {state.errors?.email && <p className="text-sm text-red-500 mt-1">{state.errors.email[0]}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-foreground-secondary">Password</label>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            className="block w-full px-3 py-2 border border-border-default rounded-lg shadow-sm bg-background-tertiary placeholder-foreground-muted focus:outline-none focus:ring-accent-primary focus:border-accent-primary sm:text-sm"
                                        />
                                        {state.errors?.password && <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>}
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