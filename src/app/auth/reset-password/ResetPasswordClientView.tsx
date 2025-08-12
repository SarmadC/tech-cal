// src/app/auth/reset-password/ResetPasswordClientView.tsx
'use client'

// 1. CORRECTED IMPORTS
import { useEffect, useActionState } from 'react';      // Core hooks from 'react'
import { useFormStatus } from 'react-dom';              // DOM-specific hooks from 'react-dom'

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { updatePasswordAction } from '@/app/auth/actions';
import { AuthFormState } from '@/app/auth/actions'; // Import the state type

// The initial state for our form
const initialState: AuthFormState = {
    message: '',
    errors: {},
    success: false,
};

// A dedicated component for the submit button to access form status
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Updating...' : 'Update password'}
        </button>
    );
}

// SuccessDisplay can remain mostly the same
const SuccessDisplay = () => (
    <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="bg-success-light border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Your password has been successfully updated!
        </div>
        <p className="text-sm text-foreground-secondary">Redirecting to your dashboard...</p>
        <Link href="/dashboard" className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block">
            Go to Dashboard
        </Link>
    </div>
);


export default function ResetPasswordClientView() {
    const router = useRouter();

    // 2. RENAME useFormState to useActionState
    const [state, formAction] = useActionState(updatePasswordAction, initialState);

    // Use useEffect to react to state changes from the server action
    useEffect(() => {
        if (state.success) {
            toast.success(state.message);
            // Redirect after a short delay to allow the user to see the success message
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        } else if (state.message && (state.errors?._form || state.errors?.password)) {
            // Handle form-level or password-specific errors
            toast.error(state.errors?._form?.[0] || state.message);
        }
    }, [state, router]);


    return (
        <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center space-x-2">
                        <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
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
                        <form action={formAction} className="space-y-6">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-foreground-secondary mb-2">New Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                    placeholder="••••••••"
                                />
                                {state.errors?.password && <p className="mt-2 text-sm text-red-500">{state.errors.password[0]}</p>}
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-secondary mb-2">Confirm New Password</label>
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    className="w-full px-4 py-2.5 bg-background-main border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                    placeholder="••••••••"
                                />
                                {state.errors?.confirmPassword && <p className="mt-2 text-sm text-red-500">{state.errors.confirmPassword[0]}</p>}
                            </div>

                            <SubmitButton />
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}