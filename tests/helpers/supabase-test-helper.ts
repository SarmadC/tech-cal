/**
 * Supabase Test Helper
 * 
 * Helper functions for E2E tests to bypass email confirmation
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase admin client for test operations
 * This requires SUPABASE_SERVICE_ROLE_KEY environment variable
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase credentials for admin client. Set SUPABASE_SERVICE_ROLE_KEY in .env.local');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Auto-confirm a user's email for testing purposes
 * @param email - The email address to confirm
 */
export async function confirmUserEmail(email: string) {
    const admin = createAdminClient();
    
    // Get user by email
    const { data: userData, error: getUserError } = await admin.auth.admin.listUsers();
    
    if (getUserError) {
        throw new Error(`Failed to list users: ${getUserError.message}`);
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
        throw new Error(`User not found: ${email}`);
    }

    // Update user to confirm email
    const { error: updateError } = await admin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (updateError) {
        throw new Error(`Failed to confirm email: ${updateError.message}`);
    }

    return user;
}

/**
 * Delete a test user by email
 * @param email - The email address to delete
 */
export async function deleteTestUser(email: string) {
    const admin = createAdminClient();
    
    const { data: userData, error: getUserError } = await admin.auth.admin.listUsers();
    
    if (getUserError) {
        console.error('Failed to list users:', getUserError);
        return;
    }

    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
        console.log(`User not found: ${email}`);
        return;
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
        console.error('Failed to delete user:', deleteError);
        return;
    }

    console.log(`Deleted test user: ${email}`);
}

