'use client'

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { loginAction, oauthSignInAction } from '@/app/auth/actions';
import { useAuth } from '@/contexts/AuthContext';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import {AuthProviders } from '@/components/auth';
import type { OAuthProvider } from '@/types';


const initialState = {
    message: '',
    errors: {},
    success: false,
};

function LoginButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-accent-primary hover:bg-accent-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary disabled:bg-opacity-50"
        >
            {pending ? 'Signing In...' : 'Sign In'}
        </button>
    );
}


export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, initialized } = useAuth();

    // 1. Setup useFormState to manage the entire form lifecycle
    const [state, formAction] = useFormState(loginAction, initialState);

    // 2. Handle URL-based messages (from OAuth redirects, etc.)
    useEffect(() => {
        const message = searchParams.get('message');
        if (message) {
            toast.error(message);
        }
    }, [searchParams]);

    // 3. Handle form submission results from the Server Action
    useEffect(() => {
        if (state.success === false && (state.errors?._form || state.message)) {
            // Display form-level errors from the server action state
            toast.error(state.errors?._form?.[0] || state.message);
        }
        // No need for a success toast here; the redirect is the success indicator.
    }, [state]);

    // 4. Redirect the user if they are already logged in
    useEffect(() => {
        if (initialized && user) {
            const redirectTo = searchParams.get('redirect') || '/dashboard';
            router.refresh(); // Ensure server components get the new session
            router.replace(redirectTo);
        }
    }, [user, initialized, router, searchParams]);


    // Handler for OAuth providers. This remains a client-side action that calls the server action.
    const handleOAuthSignIn = async (provider: OAuthProvider) => {
        // We don't need useMutation for this, just call the server action directly.
        await oauthSignInAction(provider);
    };

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        {/* ... Header JSX is unchanged ... */}
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
                                Sign up free
                            </Link>
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        <AuthProviders
                            onSelectProvider={handleOAuthSignIn}
                            isPending={false} // Loading is handled by the browser redirect
                        />

                        <div className="relative my-6">
                            {/* ... Separator JSX is unchanged ... */}
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-color"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-background-secondary px-2 text-foreground-tertiary">
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        {/* 5. The form now directly uses the server action */}
                        {/* The LoginForm component will need to be adapted slightly */}
                        <form action={formAction} className="space-y-6">
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-foreground-secondary">Email address</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="block w-full px-3 py-2 border border-border-color rounded-lg shadow-sm placeholder-foreground-muted focus:outline-none focus:ring-accent-primary focus:border-accent-primary sm:text-sm"
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
                                    className="block w-full px-3 py-2 border border-border-color rounded-lg shadow-sm placeholder-foreground-muted focus:outline-none focus:ring-accent-primary focus:border-accent-primary sm:text-sm"
                                />
                                {state.errors?.password && <p className="text-sm text-red-500 mt-1">{state.errors.password[0]}</p>}
                            </div>

                            <LoginButton />
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}