'use client'

import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { forgotPasswordAction } from '@/app/auth/actions';

// The initial state for our form, matching the AuthFormState type
const initialState = {
    message: '',
    errors: {},
    success: false,
};

// A dedicated component for the submit button to handle pending state
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? 'Sending...' : 'Send reset email'}
        </Button>
    );
}

// --- UI Sub-component for Success State ---
const SuccessDisplay = ({ message }: { message: string }) => (
    <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {message}
        </div>
        <div className="text-sm text-foreground-secondary space-y-2">
            <p>Click the link in the email to reset your password. The link will expire in 1 hour for security reasons.</p>
            <p>Don`&apos;`t see the email? Check your spam folder.</p>
        </div>
        <div className="space-y-3">
            <Link href="/login" className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block text-center">
                Back to sign in
            </Link>
        </div>
    </div>
);


// --- Main Page Component ---
export default function ForgotPasswordPage() {
    // 1. Setup useFormState to manage the entire form lifecycle
    const [state, formAction] = useFormState(forgotPasswordAction, initialState);

    // 2. Use useEffect to show toast notifications from the server's response
    useEffect(() => {
        if (state.success) {
            toast.success(state.message);
        } else if (state.message && (state.errors?._form || state.errors?.email)) {
            // Show a toast for either a general form error or a specific field error
            toast.error(state.errors?._form?.[0] || state.errors?.email?.[0] || state.message);
        }
    }, [state]);
    
    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">{/* SVG Logo */}</div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                            {/* The UI now reacts directly to the form state */}
                            {state.success ? 'Check your email' : 'Forgot your password?'}
                        </h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            {state.success ? "We've sent password reset instructions." : "Enter your email and we'll send a reset link."}
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        {state.success ? (
                            <SuccessDisplay message={state.message} />
                        ) : (
                            // 3. The form now uses the formAction directly
                            <form action={formAction} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                                        placeholder="you@example.com"
                                    />
                                    {/* Display field-specific errors from the state */}
                                    {state.errors?.email && <p className="mt-2 text-sm text-red-500">{state.errors.email[0]}</p>}
                                </div>

                                <SubmitButton />

                                <div className="text-center">
                                    <Link href="/login" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">
                                        ← Back to sign in
                                    </Link>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}