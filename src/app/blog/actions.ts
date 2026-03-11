// src/app/blog/actions.ts
'use server';

import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Define the shape of the form state
export type SubscribeFormState = {
    message: string;
    status: 'success' | 'error' | 'idle';
};

// 1. Define a schema for validation using Zod
const SubscribeSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email address.' }),
});

export async function subscribeToAction(
    prevState: SubscribeFormState,
    formData: FormData
): Promise<SubscribeFormState> {
    const supabase = await createAdminClient();

    // 2. Validate the form data
    const validatedFields = SubscribeSchema.safeParse({
        email: formData.get('email'),
    });

    // If validation fails, return the error message
    if (!validatedFields.success) {
        return {
            message: validatedFields.error.flatten().fieldErrors.email?.[0] || 'Validation failed.',
            status: 'error',
        };
    }

    const { email } = validatedFields.data;

    // 3. Insert the email into the Supabase table
    try {
        const { error } = await supabase.from('subscribers' as any).insert({ email });

        // Handle potential errors, like a duplicate email
        if (error) {
            if (error.code === '23505') { // 23505 is the code for unique constraint violation
                return {
                    message: 'This email is already subscribed. Thank you!',
                    status: 'error',
                };
            }
            // For other database errors
            throw error;
        }

        // On success, revalidate the path and return a success message
        revalidatePath('/blog');
        return {
            message: "You're subscribed! Thanks for joining.",
            status: 'success',
        };

    } catch (error) {
        console.error('Subscription error:', error);
        return {
            message: 'Something went wrong. Please try again later.',
            status: 'error',
        };
    }
}