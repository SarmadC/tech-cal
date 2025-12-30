import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import * as Sentry from '@sentry/nextjs';

type AppSupabaseClient = SupabaseClient<Database>;

interface ProfileAdminCheck {
    is_admin?: boolean | null;
}

export async function isAdminUser(
    userId: string,
    supabase: AppSupabaseClient
): Promise<boolean> {
    if (!userId) {
        return false;
    }

    try {
        const { data, error } = await supabase
            .from('profiles' as never)
            .select('is_admin')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.warn('Failed to verify admin status: Operation failed');
            Sentry.captureException(error, { extra: { function: 'isAdminUser', userId } });
            return false;
        }

        const profile = data as ProfileAdminCheck | null;

        return profile?.is_admin === true;
    } catch (error) {
        console.error('Unexpected admin check error: Operation failed');
        Sentry.captureException(error, { extra: { function: 'isAdminUser', userId } });
        return false;
    }
}

export async function requireAdmin(
    userId: string,
    supabase: AppSupabaseClient
): Promise<void> {
    const isAdmin = await isAdminUser(userId, supabase);
    if (!isAdmin) {
        throw new Error('Admin access required');
    }
}

