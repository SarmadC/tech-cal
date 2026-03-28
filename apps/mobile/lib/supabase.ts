import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import { getNativeStoredItem, removeNativeStoredItem, setNativeStoredItem } from '@/lib/nativeStorage';

const nativeStorage = {
  getItem: (key: string) => getNativeStoredItem(key),
  setItem: (key: string, value: string) => setNativeStoredItem(key, value),
  removeItem: (key: string) => removeNativeStoredItem(key),
};

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
  },
};

const storage = Platform.OS === 'web' ? webStorage : nativeStorage;

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return supabaseClient;
}
