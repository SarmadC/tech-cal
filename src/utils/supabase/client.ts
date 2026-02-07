// src/utils/supabase/client.ts

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
    if (!browserClient) {
        browserClient = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return browserClient;
}

export type SupabaseClient = ReturnType<typeof createClient>
