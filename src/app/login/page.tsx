// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import { LoginForm as LoginFormType, OAuthProvider } from '@/types';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { LoginForm, AuthProviders } from '@/components/auth';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

import { createClient } from '@/utils/supabase/client';
// 1. IMPORT THE NEW SERVER ACTION
import { loginAction } from '@/app/auth/actions';

export default function LoginPage() {
    const [supabase] = useState(() => createClient());
    const [urlError, setUrlError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // Local loading state for the form
    const [formError, setFormError] = useState<string | null>(null); // Local error state for the form
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, initialized } = useAuth();

    // This useEffect for handling URL errors is still useful
    useEffect(() => {
        const errorParam = searchParams.get('error');
        if (errorParam) {
            switch (errorParam) {
                case 'auth_callback_failed':
                    setUrlError('Authentication failed. Please try again.');
                    break;
                case 'access_denied':
                    setUrlError('Access was denied. Please try again.');
                    break;
                default:
                    setUrlError('An unknown error occurred during authentication.');
            }
        }
    }, [searchParams]);

    // This useEffect for redirecting after the user object is available is still the best approach
    useEffect(() => {
        if (initialized && user) {
            const redirectTo = searchParams.get('redirect') || '/dashboard';
            // router.refresh() is important to ensure server components get the new session
            router.refresh();
            router.replace(redirectTo);
        }
    }, [user, initialized, router, searchParams]);


    // 3. CREATE a new handler function that calls the Server Action.
    const handleSignIn = async (credentials: LoginFormType) => {
        setIsSubmitting(true);
        setFormError(null);

        const result = await loginAction(credentials);

        if (result.success) {
            toast.success('Sign in successful!');
            // The useEffect above will handle the redirect once the user object is updated.
        } else {
            setFormError(result.error || 'Sign in failed. Please check your credentials.');
            toast.error(result.error || 'Sign in failed.');
        }

        setIsSubmitting(false);
    };

    const { mutate: signInWithOAuth, isPending: isSigningInWithOAuth, error: oAuthError } = useMutation({
        mutationFn: (provider: OAuthProvider) => AuthService.signInWithOAuth(provider, supabase),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'OAuth sign in failed');
            }
            toast.success('Redirecting...');
        },
        onError: (error) => {
            toast.error(error.message || 'OAuth sign in failed');
        }
    });

    // The combined error now uses the local formError state
    const combinedError = urlError || formError || oAuthError?.message;

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
                            onSelectProvider={signInWithOAuth}
                            isPending={isSigningInWithOAuth}
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

                        {/* 4. PASS the new handler and state to the LoginForm component */}
                        <LoginForm
                            onSubmit={handleSignIn}
                            isPending={isSubmitting}
                            error={combinedError}
                        />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}