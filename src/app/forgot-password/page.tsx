// src/app/forgot-password/page.tsx (Corrected)
'use client';

import { useEffect, useActionState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSnackbar } from '@/contexts/SnackbarContext';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { SimpleForm } from '@/components/auth/index';
import { forgotPasswordAction } from '@/app/auth/actions';
import type { AuthFormState } from '@/app/auth/actions';

const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

const SuccessDisplay = ({ message }: { message: string }) => (
    <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="bg-background-elevated border border-border-default text-foreground-secondary px-4 py-3 rounded-lg text-sm">
            {message}
        </div>
        <div className="text-sm text-foreground-secondary space-y-2">
            <p>Click the link in the email to reset your password. The link will expire in 1 hour for security reasons.</p>
            <p>Don&apos;t see the email? Check your spam folder.</p>
        </div>
        <div>
            <Link href="/login" className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block text-center">
                Back to sign in
            </Link>
        </div>
    </div>
);


export default function ForgotPasswordPage() {
    const { showError } = useSnackbar();
    const [state, formAction] = useActionState(forgotPasswordAction, initialState);

    useEffect(() => {
        if (state.success) {
            // Success UI is shown, no toast needed.
        } else if (state.message) {
            // Show snackbar for any error message that comes back.
            showError(state.errors?._form?.[0] || state.errors?.email?.[0] || state.message);
        }
    }, [state, showError]);

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Header section is unchanged */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <Image src="/logo.svg" alt="KureCal" width={48} height={48} />
                            <span className="text-2xl font-bold text-foreground-primary">KureCal</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                            {state.success ? 'Check your email' : 'Forgot your password?'}
                        </h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            {state.success ? "We've sent password reset instructions." : "Enter your email and we'll send a reset link."}
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-default">
                        {state.success ? (
                            <SuccessDisplay message={state.message} />
                        ) : (
                            <SimpleForm action={formAction} submitButtonText="Send reset email">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground-secondary mb-2">Email address</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                        placeholder="Enter your email"
                                    />
                                    {state.errors?.email && <p className="mt-2 text-sm text-red-500">{state.errors.email[0]}</p>}
                                </div>
                                <div className="text-center !mt-8">
                                    <Link href="/login" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">
                                        ← Back to sign in
                                    </Link>
                                </div>
                            </SimpleForm>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
