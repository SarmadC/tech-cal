// src/app/signup/page.tsx
'use client';

import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import { SignupForm as SignupFormType, OAuthProvider } from '@/types';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import SignupForm from '@/components/auth/SignupForm';
import { toast } from 'sonner';

export default function SignupPage() {
    // --- MUTATION for Email/Password Sign Up ---
    const { mutate: signUp, isPending: isSigningUp, error: signUpError, data: signUpData } = useMutation({
        mutationFn: (formValues: SignupFormType) => AuthService.signUp(formValues),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'Sign up failed');
            }
            toast.success(result.message || 'Account created! Please check your email.');
        },
    });

    // --- MUTATION for OAuth Sign Up ---
    const { mutate: signInWithOAuth, isPending: isSigningInWithOAuth, error: oAuthError } = useMutation({
        mutationFn: (provider: OAuthProvider) => AuthService.signInWithOAuth(provider),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'OAuth sign up failed');
            }
        }
    });

    const combinedError = signUpError?.message || oAuthError?.message;
    const isSubmitting = isSigningUp || isSigningInWithOAuth;
    const successMessage = signUpData?.success ? signUpData.message : '';

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
                        {/* We use toasts for success now, but can still show API errors here */}
                        {combinedError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {combinedError}
                            </div>
                        )}
                        {/* Success message can be removed if toasts are sufficient */}
                        {successMessage && !signUpError && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {successMessage}
                            </div>
                        )}

                        <div className="space-y-3">
                            <button type="button" onClick={() => signInWithOAuth('google')} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color ...">
                                <span>Sign up with Google</span>
                            </button>
                            <button type="button" onClick={() => signInWithOAuth('github')} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color ...">
                                <span>Sign up with GitHub</span>
                            </button>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-color"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-background-secondary px-2 text-foreground-tertiary">Or sign up with email</span></div>
                        </div>

                        <SignupForm
                            onSubmit={signUp}
                            isPending={isSigningUp}
                        />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}