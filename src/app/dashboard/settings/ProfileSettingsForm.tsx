// src/app/dashboard/settings/ProfileSettingsForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { updateUserProfileAction } from './actions'
import type { AppProfile } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner';
import { useRouter } from 'next/navigation'

const ProfileSchema = z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    timezone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof ProfileSchema>;

interface ProfileSettingsFormProps {
    profile: AppProfile | null;
}

export default function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(ProfileSchema),
        defaultValues: {
            fullName: profile?.fullName || '',
            timezone: profile?.timezone || '',
        },
    });

    const onSubmit = async (data: ProfileFormData) => {
        const formData = new FormData();
        formData.append('fullName', data.fullName);
        if (data.timezone) {
            formData.append('timezone', data.timezone);
        }

        const result = await updateUserProfileAction({ message: '', success: false }, formData);

        if (result.success) {
            toast.success(result.message);
            router.refresh();
        } else {
            toast.error("Update failed", { description: result.errors?._form?.[0] || result.message });
        }
    };

    return (
        // ✅ FIX: Cleaned up spacing in onSubmit
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-foreground-primary mb-2">
                    Full Name
                </label>
                {/* ✅ FIX: Cleaned up spacing and attributes */}
                <input
                    id="fullName"
                    {...register('fullName')}
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    aria-invalid={errors.fullName ? "true" : "false"}
                />
                {errors.fullName && (
                    <p className="mt-2 text-sm text-red-500" role="alert">
                        {errors.fullName.message}
                    </p>
                )}
            </div>

            <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-foreground-primary mb-2">
                    Timezone
                </label>
                {/* ✅ FIX: Cleaned up spacing */}
                <input
                    id="timezone"
                    {...register('timezone')}
                    placeholder="e.g., America/New_York"
                    className="w-full px-4 py-2.5 bg-background-main border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    aria-invalid={errors.timezone ? "true" : "false"}
                />
                {errors.timezone && (
                    <p className="mt-2 text-sm text-red-500" role="alert">
                        {errors.timezone.message}
                    </p>
                )}
            </div>

            <div className="flex justify-end">
                {/* ✅ FIX: Cleaned up spacing */}
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
}