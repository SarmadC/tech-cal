// src/app/auth/reset-password/ResetPasswordClientView.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { AuthService } from '@/services/authService';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// 1. IMPORT Zod and React Hook Form libraries
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

// 2. DEFINE the Zod validation schema
const ResetPasswordSchema = z.object({
    password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
    confirmPassword: z.string().min(8, { message: "Please confirm your password." }),
})
    // Use refine to add a custom validation rule for matching passwords
    .refine(data => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"], // Show the error on the confirmPassword field
    });

// Infer the TypeScript type from the schema
type ResetPasswordFormData = z.infer<typeof ResetPasswordSchema>;

// The SuccessDisplay component can remain the same
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

// --- The Main Client Component (Now includes the form logic) ---
export default function ResetPasswordClientView() {
    const router = useRouter();
    const [supabase] = useState(() => createClient());

    // 3. INITIALIZE React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(ResetPasswordSchema),
    });

    // The useMutation hook remains, as it's great for this
    const { mutate: updatePassword, isSuccess } = useMutation({
        mutationFn: (newPassword: string) => AuthService.updateUserPassword(newPassword, supabase),
        onSuccess: (result) => {
            if (result.success) {
                toast.success("Password updated successfully!");
                setTimeout(() => {
                    router.push('/dashboard');
                }, 3000);
            } else {
                // If the service returns an error, show it
                toast.error("Update Failed", { description: result.error });
            }
        },
        onError: (error) => {
            toast.error("Update Failed", { description: error.message });
        }
    });

    // 4. CREATE the onSubmit handler
    const onSubmit = (data: ResetPasswordFormData) => {
        // The data is already validated by Zod at this point
        updatePassword(data.password);
    };

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
                        // 5. WIRE UP the form with the handleSubmit wrapper
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-foreground-primary mb-2">New Password</label>
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
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-primary mb-2">Confirm New Password</label>
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
                            <button type="submit" disabled={isSubmitting} className="w-full bg-accent-primary hover:bg-accent-primary-hover text-white font-semibold py-3 px-4 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Updating...' : 'Update password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}