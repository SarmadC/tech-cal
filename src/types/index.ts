// src/types/index.ts

import { User, Session } from '@supabase/supabase-js';
import type { Json } from './supabase';
export type { Json };

// ============================================
// RE-EXPORT ALL EVENT-RELATED TYPES
// ============================================
export * from './events';
export * from './career';
export * from './careerImpact';
export * from './supabaseCareerImpact';
export * from './database';
export * from './eventImport';
export * from './componentProps';
export * from './telemetry';

// ============================================
// NON-EVENT-RELATED TYPES
// ============================================

// --- Supabase Types (Non-Event) ---
export type SupabaseEvent = {
    id: string;
    created_at: string;
    updated_at: string | null;
    title: string | null;
    description: string | null;
    start_time: string;
    end_time: string | null;
    organizer_id: string | null;
    location: string | null;
    status: string | null;
    source_url: string | null;
    livestream_url: string | null;
    event_type_id: string | null;
    agenda_url: string | null;
};

export type SupabaseEventType = {
    id: string;
    name: string | null;
    color: string | null;
    description: string | null;
};

export type SupabaseTrackedEvent = {
    id: string;
    user_id: string;
    event_id: string;
    status: 'attending' | 'attended' | 'cancelled' | null;  // bookmarked removed - use is_bookmarked instead
    notes: string | null;
    created_at: string;
    is_bookmarked: boolean;
    bookmarked_at: string | null;
    events: SupabaseEvent[] | null;
};

export type SupabaseEventWithDetails = Omit<SupabaseEvent, 'organizer'> & {
    event_type: SupabaseEventType | null;
    // Support both 'organizer' (from named joins) and 'organizers' (from FK joins)
    organizer?: { id: string, name: string, logo_url?: string | null } | null;
    organizers?: { id: string, name: string, logo_url?: string | null } | null;
    tags?: Array<{
        id: string;
        name: string;
        color: string;
        category: string;
    }>;
    agenda_url?: string | null;
    speaker_lineup?: Json | null;
};

export type SupabaseTrackedEventWithDetails = Omit<SupabaseTrackedEvent, 'events'> & {
    events: SupabaseEventWithDetails | null;
};

export type SupabaseProfile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    timezone: string | null;
    // The `Json` type is now correctly recognized here
    preferences: Json | null;
    created_at: string | null;
    updated_at: string | null;
};

// --- Application Types (Non-Event) ---
export type AppProfile = {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    timezone: string | null;
    // And here
    preferences: Json | null;
    createdAt: string | null;
    updatedAt: string | null;
};

export const CALENDAR_VIEWS = { MONTH: 'month', WEEK: 'week', DAY: 'day' } as const;
export type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];

export const OAUTH_PROVIDERS = { GOOGLE: 'google', GITHUB: 'github' } as const;
export type OAuthProvider = typeof OAUTH_PROVIDERS[keyof typeof OAUTH_PROVIDERS];

export type EventFilters = { 
  categories?: string[]; 
  startDate?: Date; 
  endDate?: Date; 
  searchTerm?: string; 
  collection?: string; 
  status?: string[]; 
  eventIds?: string[];
  locations?: string[];
  // Enhanced filtering options
  budget?: 'all' | 'free-only' | 'low' | 'moderate' | 'high' | 'unlimited';
  format?: 'all' | 'virtual' | 'in-person' | 'hybrid';
  cost?: 'all' | 'free' | 'paid';
  difficulty?: 'all' | 'beginner' | 'intermediate' | 'advanced';
  availability?: 'all' | 'available' | 'no-conflicts';
  popularity?: 'all' | 'trending' | 'high-attendance' | 'niche';
  duration?: 'all' | 'short' | 'medium' | 'long' | 'multi-day';
  myTracked?: boolean;
  myNetwork?: boolean;
  recommended?: boolean;
  sortBy?: 'date' | 'popularity' | 'career-impact' | 'title' | 'location';
  sortDirection?: 'asc' | 'desc';
};
export type SearchSuggestion = { id: string; title: string; organizer: string; startTime: string; type: 'event' | 'organizer' | 'category'; };
export type LoginForm = { email: string; password: string; rememberMe?: boolean; };
export type SignupForm = { name: string; email: string; password: string; confirmPassword: string; acceptTerms: boolean; };
export type ProfileUpdateForm = { fullName?: string | null; avatarUrl?: string | null; timezone?: string | null; preferences?: Json | null; };
export type ApiResponse<T = unknown> = { success: boolean; data?: T; error?: string; message?: string; };
export type AuthState = { user: User | null; session: Session | null; profile: AppProfile | null; loading: boolean; };
export type AuthResponse = { success: boolean; error?: string; message?: string; };

// --- Type Transformers ---
import type { Event } from './events';

export type EventTransformer = {
    toApp: (supabaseEvent: SupabaseEvent | SupabaseEventWithDetails) => Event;
    toSupabase: (appEvent: Partial<Event>) => Partial<SupabaseEvent>;
};

export type ProfileTransformer = {
    toApp: (supabaseProfile: SupabaseProfile) => AppProfile;
    toSupabase: (appProfile: Partial<AppProfile>) => Partial<SupabaseProfile>;
};
