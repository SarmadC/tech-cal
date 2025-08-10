'use server'

import { createClient } from '@/utils/supabase/server'
import { ProfileService } from '@/services/profileService'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const ProfileSchema = z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    timezone: z.string().optional(),
});

export type FormState = {
    message: string;
    errors?: {
        fullName?: string[];
        timezone?: string[];
        _form?: string[];
    };
    success: boolean;
}

export async function updateUserProfileAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            message: "Authentication error.",
            errors: { _form: ["You must be logged in to update your profile."] },
            success: false
        };
    }

    const validatedFields = ProfileSchema.safeParse({
        fullName: formData.get('fullName'),
        timezone: formData.get('timezone'),
    });

    if (!validatedFields.success) {
        return {
            message: "Invalid form data. Please check the fields.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    // --- CHANGED SECTION START ---
    try {
        // If validation succeeds, call the service to update the profile.
        // We no longer destructure `{ error }` because the service throws on failure.
        await ProfileService.updateProfile(user.id, {
            fullName: validatedFields.data.fullName,
            timezone: validatedFields.data.timezone,
        }, supabase);

    } catch (error) {
        // If the service throws an error, we catch it here.
        console.error("Profile update error:", error);
        // Return a generic error message to the client form.
        return {
            message: "Database error.",
            errors: { _form: ["Failed to update profile. Please try again."] },
            success: false
        };
    }
    // --- CHANGED SECTION END ---

    // On success, revalidate the paths where the user's data is displayed.
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');

    // Return a success message.
    return {
        message: "Profile updated successfully!",
        success: true
    };
}