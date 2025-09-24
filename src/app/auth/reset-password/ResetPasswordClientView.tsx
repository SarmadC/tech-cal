// src/app/auth/reset-password/ResetPasswordClientView.tsx
'use client';

import { useEffect, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { SimpleForm } from '@/components/auth';  // Only import what you use
import { updatePasswordAction } from '@/app/auth/actions';
import type { AuthFormState } from '@/app/auth/actions';

const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

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
    const [state, formAction] = useActionState(updatePasswordAction, initialState);

    useEffect(() => {
        if (state.success) {
            toast.success(state.message || 'Password updated successfully!');
            const timer = setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
            return () => clearTimeout(timer);
        } else if (state.message) {
            toast.error(state.errors?._form?.[0] || state.message);
        }
    }, [state, router]);

    return (
        <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center space-x-2">
                        <img src="/logo.svg" alt="KureCal" className="w-12 h-12" />
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