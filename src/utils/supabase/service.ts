import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export type SupabaseClientType = ReturnType<typeof createSupabaseClient<Database>>;

/**
 * Create a service-role Supabase client with full database access
 * This client bypasses RLS and should only be used server-side
 */
export function createServiceClient(
    supabaseUrl: string,
    supabaseServiceKey: string,
    options?: {
        auth?: {
            autoRefreshToken?: boolean;
            persistSession?: boolean;
        };
    }
): SupabaseClientType {
    return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: options?.auth?.autoRefreshToken ?? false,
            persistSession: options?.auth?.persistSession ?? false
        }
    });
}

export function createUserScopedClient(
    supabaseUrl: string,
    supabaseAnonKey: string,
    accessToken: string
): SupabaseClientType {
    return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
