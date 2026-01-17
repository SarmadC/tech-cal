// src/app/auth/reset-password/ResetPasswordClientView.tsx
'use client';

import { useEffect, useActionState, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { createClient } from '@/utils/supabase/client';

import { SimpleForm } from '@/components/auth';
import { updatePasswordAction } from '@/app/auth/actions';
import type { AuthFormState } from '@/app/auth/actions';

const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

type SessionStatus = 'loading' | 'ready' | 'error' | 'exchanging';

const SuccessDisplay = () => (
    <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
        </div>
        <div className="bg-background-elevated border border-border-default text-foreground-secondary px-4 py-3 rounded-lg text-sm">
            Your password has been successfully updated!
        </div>
        <p className="text-sm text-foreground-secondary">Redirecting to your dashboard...</p>
        <Link href="/dashboard" className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block text-center">
            Go to Dashboard Now
        </Link>
    </div>
);

export default function ResetPasswordClientView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showSuccess, showError } = useSnackbar();
    const [state, formAction] = useActionState(updatePasswordAction, initialState);
    const [sessionStatus, setSessionStatus] = useState<SessionStatus>('loading');
    const [sessionError, setSessionError] = useState<string | null>(null);

    // Check for session or exchange code on mount
    useEffect(() => {
        const checkSessionOrExchangeCode = async () => {
            const supabase = createClient();
            const code = searchParams.get('code');

            // If there's a code in the URL, exchange it for a session
            // This handles the case where user lands directly on this page with a code
            if (code) {
                setSessionStatus('exchanging');
                try {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        console.error('[ResetPassword] Code exchange error:', error);
                        setSessionError('Your reset link has expired or is invalid. Please request a new one.');
                        setSessionStatus('error');
                        return;
                    }
                    // Code exchanged successfully, session is now active
                    setSessionStatus('ready');
                    // Clean up URL by removing the code parameter
                    router.replace('/auth/reset-password', { scroll: false });
                } catch (err) {
                    console.error('[ResetPassword] Code exchange exception:', err);
                    setSessionError('An error occurred. Please try requesting a new reset link.');
                    setSessionStatus('error');
                }
                return;
            }

            // No code - check if there's already an active session (user refreshed page or came from callback)
            try {
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error || !user) {
                    console.warn('[ResetPassword] No active session found');
                    setSessionError('Your session has expired. Please request a new password reset link.');
                    setSessionStatus('error');
                    return;
                }
                setSessionStatus('ready');
            } catch (err) {
                console.error('[ResetPassword] Session check exception:', err);
                setSessionError('Unable to verify your session. Please try again.');
                setSessionStatus('error');
            }
        };

        checkSessionOrExchangeCode();
    }, [searchParams, router]);

    // Handle form submission result
    useEffect(() => {
        if (state.success) {
            showSuccess(state.message || 'Password updated successfully!');
            const timer = setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
            return () => clearTimeout(timer);
        } else if (state.message && !state.success) {
            showError(state.errors?._form?.[0] || state.message);
        }
    }, [state, router, showSuccess, showError]);

    // Loading state
    if (sessionStatus === 'loading' || sessionStatus === 'exchanging') {
        return (
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full text-center">
                    <Link href="/" className="inline-flex items-center space-x-2">
                        <Image src="/logo.svg" alt="KureCal" width={48} height={48} />
                        <span className="text-2xl font-bold text-foreground-primary">KureCal</span>
                    </Link>
                    <div className="mt-8 bg-background-secondary rounded-2xl p-8 border border-border-default">
                        <div className="animate-pulse flex flex-col items-center space-y-4">
                            <div className="w-12 h-12 bg-background-tertiary rounded-full"></div>
                            <p className="text-foreground-secondary">
                                {sessionStatus === 'exchanging' ? 'Verifying your reset link...' : 'Loading...'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (sessionStatus === 'error') {
        return (
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <Image src="/logo.svg" alt="KureCal" width={48} height={48} />
                            <span className="text-2xl font-bold text-foreground-primary">KureCal</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                            Unable to reset password
                        </h2>
                    </div>
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <p className="text-foreground-secondary">{sessionError}</p>
                            <Link
                                href="/forgot-password"
                                className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block text-center"
                            >
                                Request New Reset Link
                            </Link>
                            <Link
                                href="/login"
                                className="block text-sm text-accent-primary hover:underline"
                            >
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center space-x-2">
                        <Image src="/logo.svg" alt="KureCal" width={48} height={48} />
                        <span className="text-2xl font-bold text-foreground-primary">KureCal</span>
                    </Link>
                    <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                        {state.success ? 'Password updated!' : 'Set your new password'}
                    </h2>
                    <p className="mt-2 text-sm text-foreground-secondary">
                        {state.success ? "You will be redirected shortly." : "Choose a strong password for your account"}
                    </p>
                </div>

                <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                    {state.success ? (
                        <SuccessDisplay />
                    ) : (
                        <SimpleForm action={formAction} submitButtonText="Update password">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-foreground-secondary mb-2">
                                    New Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                    placeholder="••••••••"
                                />
                                {state.errors?.password && (
                                    <p className="mt-2 text-sm text-red-500">{state.errors.password[0]}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-secondary mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                    placeholder="••••••••"
                                />
                                {state.errors?.confirmPassword && (
                                    <p className="mt-2 text-sm text-red-500">{state.errors.confirmPassword[0]}</p>
                                )}
                            </div>
                        </SimpleForm>
                    )}
                </div>
            </div>
        </div>
    );
}