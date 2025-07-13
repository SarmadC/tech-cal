// src/lib/supabaseClient.ts (Recommended Version)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// This check provides a clear, helpful error message if your .env.local is misconfigured.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables (URL and Anon Key) are not defined. Please check your .env.local file.');
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)