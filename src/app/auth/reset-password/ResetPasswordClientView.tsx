// src/app/auth/reset-password/ResetPasswordClientView.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import { Loader2 } from 'lucide-react';

// Import the client creator
import { createClient } from '@/utils/supabase/client';

// NOTE: ResetPasswordForm and SuccessDisplay UI components can stay in this file
// or be moved to their own files for better organization. For simplicity, we'll keep them here.

const ResetPasswordForm = ({ onFormSubmit, isPending, mutationError }: {
    onFormSubmit: (password: string) => void;
    isPending: boolean;
    mutationError: Error | null;
}) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [formError, setFormError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        if (password.length < 8) {
            setFormError('Password must be at least 8 characters long');
            return;
        }
        if (password !== confirmPassword) {
            setFormError('Passwords do not match');
            return;
        }
        onFormSubmit(password);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {(formError || mutationError) && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {formError || mutationError?.message}
                </div>
            )}
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">New Password</label>
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="••••••••" />
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-primary mb-2">Confirm New Password</label>
                <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={isPending} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Updating...' : 'Update password'}
            </button>
        </form>
    );
};

const SuccessDisplay = () => (
    <div className="text-center space-y-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            Your password has been successfully updated! You are now signed in.
        </div>
        <p className="text-sm text-foreground-secondary">Redirecting to your dashboard...</p>
        <Link href="/dashboard" className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all inline-block">
            Go to Dashboard
        </Link>
    </div>
);


// --- The Main Client Component ---
export default function ResetPasswordClientView() {
    const router = useRouter();
    // Create a client instance for the mutation
    const [supabase] = useState(() => createClient());

    // MUTATION: Update the user's password.
    const { mutate: updatePassword, isPending, isSuccess, error: mutationError } = useMutation({
        mutationFn: (newPassword: string) => AuthService.updateUserPassword(newPassword, supabase),
        onSuccess: () => {
            setTimeout(() => {
                router.push('/dashboard');
            }, 3000);
        },
    });

    return (
        <div className="min-h-screen bg-background-main flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center space-x-2">
                        <div className="w-12 h-12 bg-accent-primary rounded-xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <span className="text-2xl font-bold text-foreground-primary">TechCalendar</span>
                    </Link>
                    <h2 className="mt-6 text-3xl font-bold text-foreground-primary">
                        {isSuccess ? 'Password updated!' : 'Set your new password'}
                    </h2>
                    <p className="mt-2 text-sm text-foreground-secondary">
                        {isSuccess ? "Your password has been successfully changed" : "Choose a strong password for your account"}
                    </p>
                </div>

                <div className="bg-background-secondary rounded-2xl p-8 border border-border-color">
                    {isSuccess ? (
                        <SuccessDisplay />
                    ) : (
                        <ResetPasswordForm
                            onFormSubmit={updatePassword}
                            isPending={isPending}
                            mutationError={mutationError as Error | null}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}