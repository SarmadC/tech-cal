// src/components/auth/EmailConfirmationSent.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSnackbar } from '@/contexts/SnackbarContext';
import { resendVerificationAction } from '@/app/auth/actions';

interface EmailConfirmationSentProps {
    email: string;
}

export default function EmailConfirmationSent({ email }: EmailConfirmationSentProps) {
    const { showSuccess, showError } = useSnackbar();
    const [isResending, setIsResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    // Cooldown timer effect
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleResend = useCallback(async () => {
        if (isResending || cooldown > 0) return;

        setIsResending(true);
        try {
            const result = await resendVerificationAction(email);
            if (result.success) {
                showSuccess('Verification email sent! Check your inbox.');
                setCooldown(60); // 60 second cooldown
            } else {
                showError(result.message || 'Failed to resend email. Please try again.');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            showError('An error occurred. Please try again.');
        } finally {
            setIsResending(false);
        }
    }, [email, isResending, cooldown, showSuccess, showError]);

    return (
        <div className="text-center space-y-6">
            {/* Email icon */}
            <div className="w-20 h-20 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto">
                <svg
                    className="w-10 h-10 text-accent-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                </svg>
            </div>

            {/* Heading */}
            <div>
                <h2 className="text-2xl font-bold text-foreground-primary">
                    Check your email
                </h2>
                <p className="mt-2 text-foreground-secondary">
                    We sent a confirmation link to:
                </p>
                <p className="mt-1 font-medium text-foreground-primary">
                    {email}
                </p>
            </div>

            {/* Instructions */}
            <div className="bg-background-elevated border border-border-default text-foreground-secondary px-4 py-4 rounded-lg text-sm space-y-2">
                <p>Click the link in the email to verify your account and get started.</p>
                <p className="text-foreground-tertiary">The link will expire in 24 hours.</p>
            </div>

            {/* Resend section */}
            <div className="pt-2">
                <p className="text-sm text-foreground-tertiary mb-3">
                    Didn&apos;t receive the email? Check your spam folder or
                </p>
                <button
                    onClick={handleResend}
                    disabled={isResending || cooldown > 0}
                    className="text-accent-primary hover:text-accent-primary-hover font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isResending ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Sending...
                        </span>
                    ) : cooldown > 0 ? (
                        `Resend available in ${cooldown}s`
                    ) : (
                        'Resend verification email'
                    )}
                </button>
            </div>

            {/* Sign in link */}
            <div className="pt-4 border-t border-border-default">
                <p className="text-sm text-foreground-secondary">
                    Already verified?{' '}
                    <Link
                        href="/login"
                        className="font-medium text-accent-primary hover:text-accent-primary-hover"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
