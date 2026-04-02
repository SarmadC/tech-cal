import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { getSupabaseRuntimeConfig } from './env';
import { sessionStorage } from './sessionStorage';

const { anonKey: supabaseAnonKey, url: supabaseUrl } = getSupabaseRuntimeConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: sessionStorage,
  },
});
