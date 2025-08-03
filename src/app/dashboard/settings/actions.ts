// src/app/dashboard/settings/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server'
import { ProfileService } from '@/services/profileService'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// 1. Define a schema for validating the form data using Zod.
// This ensures that the data sent from the client form is in the shape we expect.
const ProfileSchema = z.object({
    fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
    // Add other fields you want to validate here. Let's keep timezone simple for now.
    timezone: z.string().optional(),
});

// 2. Define the state object that our form action will return to the client.
// This allows us to pass back success messages, validation errors, and general errors.
export type FormState = {
    message: string;
    errors?: {
        fullName?: string[];
        timezone?: string[];
        _form?: string[]; // For general form errors
    };
    success: boolean;
}

// 3. Define the Server Action.
// It takes the previous state and the form data as arguments.
export async function updateUserProfileAction(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const supabase = await createClient();

    // Securely get the user on the server.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            message: "Authentication error.",
            errors: { _form: ["You must be logged in to update your profile."] },
            success: false
        };
    }

    // Convert FormData to a plain object and validate it.
    const validatedFields = ProfileSchema.safeParse({
        fullName: formData.get('fullName'),
        timezone: formData.get('timezone'),
    });

    // If validation fails, return the errors to the client form.
    if (!validatedFields.success) {
        return {
            message: "Invalid form data. Please check the fields.",
            errors: validatedFields.error.flatten().fieldErrors,
            success: false,
        };
    }

    // If validation succeeds, call the service to update the profile.
    const { error } = await ProfileService.updateProfile(user.id, {
        fullName: validatedFields.data.fullName,
        timezone: validatedFields.data.timezone,
    }, supabase);

    // Handle potential errors from the database update.
    if (error) {
        return {
            message: "Database error.",
            errors: { _form: [error] },
            success: false
        };
    }

    // On success, revalidate the paths where the user's data is displayed.
    // This tells Next.js to fetch fresh data for these pages.
    revalidatePath('/dashboard/settings');
    revalidatePath('/dashboard'); // If the name is shown on the main dashboard

    // Return a success message.
    return {
        message: "Profile updated successfully!",
        success: true
    };
}