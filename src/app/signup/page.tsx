// src/app/signup/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import { SignupForm, OAuthProvider } from '@/types';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Loader2 } from 'lucide-react';

// This is the initial state for the form, used for resetting on success
const initialFormData = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
};

export default function SignupPage() {
    const [formData, setFormData] = useState<SignupForm>(initialFormData);

    // --- MUTATION for Email/Password Sign Up ---
    const { mutate: signUp, isPending: isSigningUp, error: signUpError, data: signUpData } = useMutation({
        mutationFn: (formValues: SignupForm) => AuthService.signUp(formValues),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'Sign up failed');
            }
            // On success, reset the form. The success message will be displayed.
            setFormData(initialFormData);
            console.log(result.message);
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        signUp(formData);
    };

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
                        {(combinedError) && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {combinedError}
                            </div>
                        )}
                        {successMessage && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
                                {successMessage}
                            </div>
                        )}

                        <div className="space-y-3">
                            <button type="button" onClick={() => signInWithOAuth('google')} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50">
                                {/* Google SVG */}
                                <span>Sign up with Google</span>
                            </button>
                            <button type="button" onClick={() => signInWithOAuth('github')} disabled={isSubmitting} className="w-full flex items-center justify-center space-x-3 bg-background-main hover:bg-background-tertiary border border-border-color text-foreground-primary font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50">
                                {/* GitHub SVG */}
                                <span>Sign up with GitHub</span>
                            </button>
                        </div>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-color"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="bg-background-secondary px-2 text-foreground-tertiary">Or sign up with email</span></div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-foreground-primary mb-2">Full name *</label>
                                    <input id="name" name="name" type="text" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address *</label>
                                    <input id="email" name="email" type="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="you@example.com" />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">Password *</label>
                                    <input id="password" name="password" type="password" required value={formData.password} onChange={handleChange} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="••••••••" />
                                </div>
                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-primary mb-2">Confirm Password *</label>
                                    <input id="confirmPassword" name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="••••••••" />
                                </div>
                            </div>

                            <div className="flex items-start">
                                <input id="acceptTerms" name="acceptTerms" type="checkbox" checked={formData.acceptTerms} onChange={handleChange} className="h-4 w-4 text-accent-primary focus:ring-accent-primary border-border-color rounded mt-0.5" />
                                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-foreground-secondary">
                                    I agree to the{' '}
                                    <Link href="/terms" className="text-accent-primary hover:underline">Terms of Service</Link>{' '}
                                    and{' '}
                                    <Link href="/privacy" className="text-accent-primary hover:underline">Privacy Policy</Link>
                                </label>
                            </div>

                            <button type="submit" disabled={!formData.acceptTerms || isSubmitting} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center disabled:opacity-50">
                                {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSigningUp ? 'Creating account...' : 'Create account'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}