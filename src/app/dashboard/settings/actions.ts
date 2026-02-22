'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { ProfileService } from '@/services/profileService';
import { SocialProfileService } from '@/services/socialProfileService';
import { ProfileUpdateSchema } from '@/lib/schemas';

// ... (schema remains the same)

export interface FormState {
    message: string;
    errors?: Record<string, string[]>;
    success?: boolean;
}

export async function updateUserProfileAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const supabase = await createClient();

    // 1. Authentication Check: Ensure a user is logged in.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            success: false,
            message: "Authentication error.",
            errors: { _form: ["You must be logged in to update your profile."] },
        };
    }

    // 2. Input Validation: Use Zod's safeParse to validate form data.
    const rawData = {
        fullName: formData.get('fullName'),
        timezone: formData.get('timezone'),
        username: formData.get('username'),
        headline: formData.get('headline'),
        profileVisibility: formData.get('profileVisibility'),
        showAttendance: formData.get('showAttendance') === 'true' ? true : formData.get('showAttendance') === 'false' ? false : undefined,
    };

    const validatedFields = ProfileUpdateSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Invalid data submitted. Please check the form for errors.",
            // Flatten errors to match the structure expected by the form state.
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    // 3. Business Logic / Service Call: Use a try...catch block for robust error handling.
    try {
        // Update generic profile data
        await ProfileService.updateProfile(user.id, {
            fullName: validatedFields.data.fullName,
            timezone: validatedFields.data.timezone,
        }, supabase);

        // Update social profile data
        await SocialProfileService.updateSocialProfile(user.id, {
            username: validatedFields.data.username || null,
            headline: validatedFields.data.headline || null,
            profileVisibility: validatedFields.data.profileVisibility as any, // Cast if necessary, or ensure schema matches
            showAttendance: validatedFields.data.showAttendance,
        }, supabase);

    } catch (error) {
        // This block catches any errors thrown from the service layer (e.g., database failures).
        console.error("Profile update failed in action:", error);
        
        // Return a generic error to the user to avoid leaking implementation details.
        return {
            success: false,
            message: "A server error occurred.",
            errors: { _form: ["Failed to update profile. Please try again later."] },
        };
    }

    // 4. Revalidation and Success Response
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard'); 

    return {
        success: true,
        message: "Profile updated successfully!",
    };
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export async function uploadAvatarAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return {
            success: false,
            message: "Authentication error.",
            errors: { _form: ["You must be logged in to upload an avatar."] },
        };
    }

    const file = formData.get('avatar') as File;

    if (!file || file.size === 0) {
        return {
            success: false,
            message: "No file selected.",
            errors: { _form: ["Please select an image to upload."] },
        };
    }

    // Server-side validation
    if (file.size > MAX_FILE_SIZE) {
        return {
            success: false,
            message: "File too large.",
            errors: { _form: ["Image size must be less than 2MB."] },
        };
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return {
            success: false,
            message: "Invalid file type.",
            errors: { _form: ["Only JPG, PNG, GIF, and WebP images are allowed."] },
        };
    }

    try {
        await ProfileService.updateAvatar(user.id, file, supabase);
    } catch (error) {
        console.error("Avatar upload failed:", error);
        return {
            success: false,
            message: error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed.",
            errors: { _form: ["Failed to upload avatar. Please try again."] },
        };
    }

    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard');

    return {
        success: true,
        message: "Avatar updated successfully!",
    };
}