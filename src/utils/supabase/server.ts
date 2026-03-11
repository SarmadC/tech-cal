// src/utils/supabase/server.ts
'use server'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

// The function is now async
export const createClient = async () => {
    // We now await the cookies() function
    const cookieStore = await cookies()

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (_error) {
                        // The `set` method was called from a Server Component. This can be ignored.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (_error) {
                        // The `delete` method was called from a Server Component. This can be ignored.
                    }
                },
            },
        }
    )
}

// Function with Admin (Service Role) privileges, bypassing RLS.
// Use EXCLUSIVELY in secure server contexts (Server Actions or API Routes).
export const createAdminClient = async () => {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                get(name: string) {
                    return undefined // Cookies aren't typically needed or reliable for admin operations
                },
                set(name: string, value: string, options: CookieOptions) {},
                remove(name: string, options: CookieOptions) {},
            },
        }
    )
}