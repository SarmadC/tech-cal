'use server'

import { createClient } from '@/utils/supabase/server'
import { ProfileService } from '@/services/profileService'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Best Practice: Define schema in a central location for reusability.
// Assuming a file exists at `src/lib/schemas.ts`
// If not, this is where you'd import it from. For this example, we'll define it here.
const ProfileUpdateSchema = z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }).or(z.literal('')),
    // Adding .or(z.literal('')) allows an empty string, which is a common use case for optional fields.
    // If the field MUST have content if present, remove .or(z.literal('')).
    timezone: z.string().optional(),
});

// The FormState type remains the same as it's perfectly structured for useFormState.
export type FormState = {
    message: string;
    errors?: {
        fullName?: string[];
        timezone?: string[];
        _form?: string[]; // For general, non-field-specific errors
    };
    success: boolean;
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
    const validatedFields = ProfileUpdateSchema.safeParse({
        fullName: formData.get('fullName'),
        timezone: formData.get('timezone'),
    });

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
        // The service is called with the *validated* data.
        // We assume `ProfileService.updateProfile` will throw an error on failure.
        // We don't need to destructure `{ error }` from the result anymore.
        await ProfileService.updateProfile(user.id, {
            fullName: validatedFields.data.fullName,
            timezone: validatedFields.data.timezone,
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

    // 4. Revalidation and Success Response: This code only runs if the `try` block succeeds.
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard'); // Revalidate any other page that shows user info.

    return {
        success: true,
        message: "Profile updated successfully!",
    };
}