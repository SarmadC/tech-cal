// src/components/auth/LoginForm.tsx
'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Define the Zod validation schema for the login form
const LoginSchema = z.object({
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormData = z.infer<typeof LoginSchema>;

// The props interface now uses the locally defined LoginFormData type
interface LoginFormProps {
    onSubmit: (data: LoginFormData) => void;
    isPending: boolean;
    error?: string | null;
}

export default function LoginForm({ onSubmit, isPending, error }: LoginFormProps) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(LoginSchema),
        mode: 'onBlur',
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        {...register('email')}
                        className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        placeholder="you@example.com"
                        aria-invalid={errors.email ? "true" : "false"}
                    />
                    {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">Password</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        {...register('password')}
                        className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        placeholder="••••••••"
                        aria-invalid={errors.password ? "true" : "false"}
                    />
                    {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password.message}</p>}
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {/* Remember me can be added to the Zod schema if needed */}
                </div>
                <Link href="/forgot-password" className="text-sm font-medium text-accent-primary hover:text-accent-primary-hover">Forgot password?</Link>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Signing in...' : 'Sign in'}
            </Button>
        </form>
    );
}