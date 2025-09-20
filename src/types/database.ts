// src/types/database.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './supabase';

// Shared Supabase client type - single source of truth
export type SupabaseClientType = SupabaseClient<Database>;
