// src/app/signup/page.tsx
'use client';

import Link from 'next/link';
// ✅ REMOVED useTransition from the import
import { useState } from 'react';
import { SignupForm as SignupFormType } from '@/types';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import SignupForm from '@/components/auth/SignupForm';
import { toast } from 'sonner';

// Import the new server actions
import { signupAction, oauthSignInAction } from '@/app/auth/actions';

export default function SignupPage() {
    // Local state for handling the form submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // This handler function now calls the signupAction server action
    const handleSignUp = async (formData: SignupFormType) => {
        setIsSubmitting(true);
        setFormError(null);
        setSuccessMessage(null);

        const result = await signupAction(formData);

        if (result.success) {
            toast.success(result.message || 'Account created! Please check your email.');
            setSuccessMessage(result.message || 'Account created! Please check your email.');
        } else {
            toast.error(result.error || 'Sign up failed.');
            setFormError(result.error || 'An unknown error occurred.');
        }

        setIsSubmitting(false);
    };

    return (
        <ProtectedRoute allowUnauthenticated>
            <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <Link href="/" className="inline-flex items-center space-x-2">
                            <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">{/* SVG Logo */}</div>
                            <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                        </Link>
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">Create your account</h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-accent-primary hover:text-accent-primary-hover">Sign in</Link>
                        </p>
                    </div>

                    {/* Form Container */}
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        {formError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {formError}
                            </div>
                        )}
                        {successMessage && !formError && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {successMessage}
                            </div>
                        )}

                        {/* Use the formAction prop to call the server action directly */}
                        <div className="space-y-3">
                            <form action={() => oauthSignInAction('google')}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all"
                                >
                                    <span>Sign up with Google</span>
                                </button>
                            </form>
                            <form action={() => oauthSignInAction('github')}>
                                <button
                                    type="submit"
                                    className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all"
                                >
                                    <span>Sign up with GitHub</span>
                                </button>
                            </form>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-color"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-background-secondary px-2 text-foreground-tertiary">Or sign up with email</span></div>
                        </div>

                        <SignupForm
                            onSubmit={handleSignUp}
                            isPending={isSubmitting}
                        />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}