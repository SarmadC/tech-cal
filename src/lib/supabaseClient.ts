// src/lib/supabaseClient.ts

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';


export type SupabaseClientType = ReturnType<typeof createClient<Database>>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables (URL and Anon Key) are not defined. Please check your .env.local file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);