// src/app/forgot-password/page.tsx
'use client';

import Link from 'next/link';
// 1. IMPORT useState to hold the client instance
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import ForgotPasswordForm from '@/components/auth/ForgotPassword';
// 2. IMPORT the client creator
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

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
    // 3. CREATE the Supabase client instance
    const [supabase] = useState(() => createClient());

    const { mutate: sendResetEmail, isPending, isSuccess, error, data: mutationData } = useMutation({
        // 4. PASS the client to the service method
        mutationFn: (emailAddress: string) => AuthService.resetPassword(emailAddress, supabase),
        onSuccess: (result) => {
            if (!result.success) {
                throw new Error(result.error || 'Failed to send reset email');
            }
            toast.success(result.message || 'Password reset email sent!');
        },
    });

    const handleSubmit = (email: string) => {
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            toast.error('Please enter a valid email address.');
            return;
        }
        sendResetEmail(email);
    };

    const successMessage = mutationData?.success ? mutationData.message : '';

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
                            {isSuccess ? 'Check your email' : 'Forgot your password?'}
                        </h2>
                        <p className="mt-2 text-sm text-foreground-secondary">
                            {isSuccess ? "We've sent password reset instructions." : "Enter your email and we'll send a reset link."}
                        </p>
                    </div>

                    <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                        {isSuccess ? (
                            <SuccessDisplay message={successMessage || ''} />
                        ) : (
                            <ForgotPasswordForm
                                onSubmit={handleSubmit}
                                isPending={isPending}
                                error={error?.message}
                            />
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}