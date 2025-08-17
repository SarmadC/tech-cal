// src/app/forgot-password/page.tsx (Corrected)
'use client';

import { useEffect, useActionState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

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
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="bg-success-light border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
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
    const [state, formAction] = useActionState(forgotPasswordAction, initialState);

    useEffect(() => {
        if (state.success) {
            // Success UI is shown, no toast needed.
        } else if (state.message) {
            // Show toast for any error message that comes back.
            toast.error(state.errors?._form?.[0] || state.errors?.email?.[0] || state.message);
        }
    }, [state]);

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Header section is unchanged */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
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
                                        placeholder="you@example.com"
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