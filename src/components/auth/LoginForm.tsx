// src/components/auth/LoginForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { LoginForm as LoginFormType } from '@/types'; // Use the type from your types file

interface LoginFormProps {
    onSubmit: (credentials: LoginFormType) => void;
    isPending: boolean;
    error?: string | null;
}

export default function LoginForm({ onSubmit, isPending, error }: LoginFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ email, password });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address</label>
                    <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="you@example.com" />
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">Password</label>
                    <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary" placeholder="••••••••" />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {/* Remember me logic can stay here or be passed up if needed */}
                </div>
                <Link href="/forgot-password" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">Forgot password?</Link>
            </div>

            <button type="submit" disabled={isPending} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center disabled:opacity-50">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Signing in...' : 'Sign in'}
            </button>
        </form>
    );
}