// src/components/auth/SignupForm.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { SignupForm as SignupFormType } from '@/types';

interface SignupFormProps {
    onSubmit: (formData: SignupFormType) => void;
    isPending: boolean;
}

const initialFormData: SignupFormType = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
};

export default function SignupForm({ onSubmit, isPending }: SignupFormProps) {
    const [formData, setFormData] = useState<SignupFormType>(initialFormData);
    const [formError, setFormError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        // Client-side validation before submitting
        if (!formData.name.trim()) {
            setFormError('Full name is required');
            return;
        }
        if (formData.password.length < 8) {
            setFormError('Password must be at least 8 characters long');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setFormError('Passwords do not match');
            return;
        }
        if (!formData.acceptTerms) {
            setFormError('You must accept the terms of service');
            return;
        }

        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {formError}
                </div>
            )}

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
                    <Link href="/terms" className="text-accent-primary hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/privacy" className="text-accent-primary hover:underline">Privacy Policy</Link>
                </label>
            </div>

            <button type="submit" disabled={!formData.acceptTerms || isPending} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center disabled:opacity-50">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Creating account...' : 'Create account'}
            </button>
        </form>
    );
}