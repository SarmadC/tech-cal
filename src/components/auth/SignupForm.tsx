// src/components/auth/SignupForm.tsx
'use client';

import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const SignupSchema = z.object({
    name: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Please confirm your password." }),
    acceptTerms: z.boolean().refine(val => val === true, {
        message: "You must accept the terms of service.",
    }),
})
    .refine(data => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

type SignupFormData = z.infer<typeof SignupSchema>;

interface SignupFormProps {
    onSubmit: (formData: SignupFormData) => void;
    isPending: boolean;
}

export default function SignupForm({ onSubmit, isPending }: SignupFormProps) {
    const {
        register,
        handleSubmit,
        // 2. REMOVE the unused 'isValid' variable
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(SignupSchema),
        mode: 'onBlur',
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground-primary mb-2">Full name *</label>
                    <input
                        id="name"
                        type="text"
                        {...register('name')}
                        className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        placeholder="John Doe"
                        aria-invalid={errors.name ? "true" : "false"}
                    />
                    {errors.name && <p className="mt-2 text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground-primary mb-2">Email address *</label>
                    <input
                        id="email"
                        type="email"
                        {...register('email')}
                        className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        placeholder="you@example.com"
                        aria-invalid={errors.email ? "true" : "false"}
                    />
                    {errors.email && <p className="mt-2 text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">Password *</label>
                    <input
                        id="password"
                        type="password"
                        {...register('password')}
                        className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        placeholder="••••••••"
                        aria-invalid={errors.password ? "true" : "false"}
                    />
                    {errors.password && <p className="mt-2 text-sm text-red-500">{errors.password.message}</p>}
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-primary mb-2">Confirm Password *</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        {...register('confirmPassword')}
                        className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        placeholder="••••••••"
                        aria-invalid={errors.confirmPassword ? "true" : "false"}
                    />
                    {errors.confirmPassword && <p className="mt-2 text-sm text-red-500">{errors.confirmPassword.message}</p>}
                </div>
            </div>

            <div className="flex items-start">
                <input
                    id="acceptTerms"
                    type="checkbox"
                    {...register('acceptTerms')}
                    className="h-4 w-4 text-accent-primary focus:ring-accent-primary border-border-color rounded mt-0.5"
                    aria-invalid={errors.acceptTerms ? "true" : "false"}
                />
                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-foreground-secondary">
                    I agree to the{' '}
                    <Link href="/legal/terms" className="text-accent-primary hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link href="/legal/privacy" className="text-accent-primary hover:underline">Privacy Policy</Link>
                </label>
            </div>
            {errors.acceptTerms && <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>}

            <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? 'Creating account...' : 'Create account'}
            </Button>
        </form>
    );
}