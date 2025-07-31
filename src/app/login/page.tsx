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

export default function LoginPage() {
    const [urlError, setUrlError] = useState('');
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, initialized } = useAuth();

    // Handle URL-based errors
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

    // Handle successful authentication
    useEffect(() => {
        if (initialized && user) {
            const redirectTo = searchParams.get('redirect') || '/dashboard';
            toast.success('Successfully signed in!');

            // Use setTimeout to ensure the redirect happens after the current render
            setTimeout(() => {
                router.replace(redirectTo);
            }, 100);
        }
    }, [user, initialized, router, searchParams]);

    const { mutate: signIn, isPending: isSigningIn, error: signInError } = useMutation({
        mutationFn: (credentials: LoginFormType) => AuthService.signIn(credentials),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'Sign in failed');
            }
            // Don't navigate here - let the useEffect handle it
            toast.success('Sign in successful!');
        },
        onError: (error) => {
            toast.error(error.message || 'Sign in failed');
        }
    });

    const { mutate: signInWithOAuth, isPending: isSigningInWithOAuth, error: oAuthError } = useMutation({
        mutationFn: (provider: OAuthProvider) => AuthService.signInWithOAuth(provider),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'OAuth sign in failed');
            }
            // OAuth will redirect automatically
            toast.success('Redirecting...');
        },
        onError: (error) => {
            toast.error(error.message || 'OAuth sign in failed');
        }
    });

    const combinedError = urlError || signInError?.message || oAuthError?.message;

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
                            Don&apos;t have an account?{' '}
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
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border-color"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-background-secondary px-2 text-foreground-tertiary">
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        <LoginForm
                            onSubmit={signIn}
                            isPending={isSigningIn}
                            error={combinedError}
                        />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}