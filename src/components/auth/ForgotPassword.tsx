// src/components/auth/ForgotPasswordForm.tsx
'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 1. IMPORT Zod and React Hook Form
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// 2. DEFINE the Zod schema for validation
const ForgotPasswordSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
});

// Infer the TypeScript type from the schema
type ForgotPasswordFormData = z.infer<typeof ForgotPasswordSchema>;

// The props now expect the validated data object
interface ForgotPasswordFormProps {
    onSubmit: (data: ForgotPasswordFormData) => void;
    isPending: boolean;
    error?: string | null;
}

export default function ForgotPasswordForm({ onSubmit, isPending, error }: ForgotPasswordFormProps) {
    // 3. INITIALIZE React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(ForgotPasswordSchema),
    });

    return (
        // 4. WIRE UP the form with the handleSubmit wrapper
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address</label>
                <input
                    id="email"
                    type="email"
                    {...register('email')}
                    autoComplete="email"
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="you@example.com"
                    aria-invalid={errors.email ? "true" : "false"}
                />
                {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <Button
                type="submit"
                disabled={isPending}
                className="w-full"
            >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Sending...' : 'Send reset email'}
            </Button>

            <div className="text-center">
                <Link href="/login" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">
                    ← Back to sign in
                </Link>
            </div>
        </form>
    );
}