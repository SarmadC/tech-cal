// src/app/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');

    // --- MUTATION for sending the reset email ---
    const { mutate: sendResetEmail, isPending, isSuccess, error, data: successData } = useMutation({
        mutationFn: (emailAddress: string) => AuthService.resetPassword(emailAddress),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'Failed to send reset email');
            }
            setEmail(''); // Clear the form on success
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendResetEmail(email);
    };

    const successMessage = successData?.success ? successData.message : '';

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
                        <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                            {isSuccess ? 'Check your email' : 'Forgot your password?'}
                        </h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            {isSuccess ? "We've sent password reset instructions to your email address." : "No worries! Enter your email and we'll send you a reset link."}
                        </p>
                    </div>

                    {/* Form or Success Message Container */}
                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        {!isSuccess ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                        {error.message}
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address</label>
                                    <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="you@example.com" />
                                </div>
                                <button type="submit" disabled={isPending} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center disabled:opacity-50">
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {isPending ? 'Sending...' : 'Send reset email'}
                                </button>
                                <div className="text-center">
                                    <Link href="/login" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">
                                        ← Back to sign in
                                    </Link>
                                </div>
                            </form>
                        ) : (
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                                    {successMessage}
                                </div>
                                <div className="text-sm text-foreground-secondary space-y-2">
                                    <p>Click the link in the email to reset your password. The link will expire in 1 hour for security reasons.</p>
                                    <p>Don't see the email? Check your spam folder.</p>
                                </div>
                                <div className="space-y-3">
                                    <Link href="/login" className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block text-center">
                                        Back to sign in
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}