import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { getSupabaseRuntimeConfig } from './env';
import { sessionStorage } from './sessionStorage';

const { anonKey: supabaseAnonKey, url: supabaseUrl } = getSupabaseRuntimeConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    persistSession: true,
    storage: sessionStorage,
  },
});
