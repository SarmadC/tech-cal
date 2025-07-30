// src/components/auth/ForgotPassword.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface ForgotPasswordFormProps {
    onSubmit: (email: string) => void;
    isPending: boolean;
    error?: string | null;
}

export default function ForgotPasswordForm({ onSubmit, isPending, error }: ForgotPasswordFormProps) {
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(email);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="you@example.com"
                />
            </div>
            <button
                type="submit"
                disabled={isPending}
                className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center disabled:opacity-50"
            >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Sending...' : 'Send reset email'}
            </button>
            <div className="text-center">
                <Link href="/login" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">
                    ← Back to sign in
                </Link>
            </div>
        </form>
    );
}