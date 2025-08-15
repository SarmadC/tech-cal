// src/types/index.ts
// --- Database Types (snake_case) ---
// These types match the shape of data coming directly from Supabase.

// Add this line at the top of src/types/index.ts
import { User, Session } from '@supabase/supabase-js';
export type { Json } from './supabase';
import { Json } from './supabase';

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
};

// Also update SupabaseEventType to match your schema
export type SupabaseEventType = {
    id: string;
    name: string | null; // Your schema allows null
    color: string | null; // Your schema allows null
    description: string | null;
};

export type SupabaseTrackedEvent = {
    id: string;
    user_id: string;
    event_id: string;
    status: 'bookmarked' | 'attending' | 'attended' | 'cancelled';
    notes: string | null;
    created_at: string;
    events: SupabaseEvent[] | null;
};

export type SupabaseProfile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    timezone: string | null;
    preferences: Json | null;
    created_at: string | null;
    updated_at: string | null;
};



// --- Application Types (camelCase) ---
// These are the clean, idiomatic types we will use throughout the React app.
export type AppEvent = {
    id: string;
    createdAt: string;
    title: string;
    description: string;
    startTime: string;
    endTime: string | null;
    organizer: string;
    location: string;
    status: string;
    tags?: EventTag[]
    sourceUrl: string;
    livestreamUrl: string | null;
    eventTypeId: string;
    color?: string; // Enriched data
    isTracked?: boolean; // Enriched data
    category?: AppEventType; // Enriched data
};

// This represents an AppEvent after it has been enriched with
// client-side information like tracking status.
export type EnrichedAppEvent = AppEvent & {
    isTracked: boolean;
};

export type AppEventType = {
    id: string;
    name: string;
    color: string;
    description: string | null;
    eventCount?: number;
};

export type AppTrackedEvent = {
    trackingId: string;
    userId: string;
    eventId: string;
    status: 'bookmarked' | 'attending' | 'attended' | 'cancelled';
    notes: string | null;
    trackedAt: string;
    event: AppEvent | null;
};

export type AppProfile = {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    timezone: string | null;
    preferences: Json | null;
    createdAt: string | null;
    updatedAt: string | null;
};

// --- Enums & Constants ---
export const EVENT_STATUS = {
    BOOKMARKED: 'bookmarked',
    ATTENDING: 'attending',
    ATTENDED: 'attended',
    CANCELLED: 'cancelled'
} as const;

export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS];

export const CALENDAR_VIEWS = {
    MONTH: 'month',
    WEEK: 'week',
    DAY: 'day'
} as const;

export type CalendarView = typeof CALENDAR_VIEWS[keyof typeof CALENDAR_VIEWS];

export const OAUTH_PROVIDERS = {
    GOOGLE: 'google',
    GITHUB: 'github'
} as const;

export type OAuthProvider = typeof OAUTH_PROVIDERS[keyof typeof OAUTH_PROVIDERS];

// --- Filter & Search Types ---
export type EventFilters = {
    categories?: string[];
    startDate?: Date;
    endDate?: Date;
    searchTerm?: string;
    collection?: string;
    status?: string[];
    eventIds?: string[];
};


export type SearchSuggestion = {
    id: string;
    title: string;
    organizer: string;
    startTime: string;
    type: 'event' | 'organizer' | 'category';
};

// --- Form Types ---
export type LoginForm = {
    email: string;
    password: string;
    rememberMe?: boolean;
};

export type SignupForm = {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: boolean;
};

export type ProfileUpdateForm = {
    fullName?: string | null;
    avatarUrl?: string | null;
    timezone?: string | null;
    preferences?: Json | null;
};

export type EventTrackingForm = {
    status: EventStatus;
    notes?: string;
};

// --- API Response Types ---
export type ApiResponse<T = unknown> = {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
};

export type PaginatedResponse<T> = ApiResponse<T[]> & {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
};

// --- Component Props Types ---
export type CalendarEventProps = {
    id: string;
    title: string;
    start: string;
    end?: string;
    color: string;
    extendedProps?: Record<string, unknown>;
};

export type EventCardProps = {
    event: AppEvent;
    isSelected?: boolean;
    onSelect?: (event: AppEvent) => void;
    onTrack?: (eventId: string, status: EventStatus) => void;
    showActions?: boolean;
};

export type CategoryFilterProps = {
    categories: AppEventType[];
    selectedCategories: Set<string>;
    onToggleCategory: (categoryId: string) => void;
};

// --- State Types ---
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type AsyncState<T> = {
    state: LoadingState;
    data: T | null;
    error: string | null;
};

export type BulkSelectionState = {
    selectedEvents: Set<string>;
    isSelecting: boolean;
};

// --- Authentication Types ---
export type AuthState = {
    user: User | null;
    session: Session | null;
    profile: AppProfile | null;
    loading: boolean;
};

export type AuthResponse = {
    success: boolean;
    error?: string;
    message?: string;
};

// --- Utility Types ---
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// For when you need an event with certain fields guaranteed to be present
export type EventWithCategory = RequiredFields<AppEvent, 'category'>;
export type EventWithTracking = RequiredFields<AppEvent, 'isTracked'>;

// --- Collection Types ---
export type CuratedCollection = {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType;
    color: string;
    bgColor: string;
    filter: (event: AppEvent) => boolean;
};

// --- Growth Dashboard Types ---
export type GrowthMetric = {
    label: string;
    value: number | string;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
};

export type TechStackCurrency = {
    category: string;
    score: number;
    color: string;
    lastActivity?: string;
};

export type UpcomingOpportunity = {
    title: string;
    date: string;
    category: string;
    priority?: 'high' | 'medium' | 'low';
};

// --- Export utility for type checking ---
export const isSupabaseEvent = (obj: unknown): obj is SupabaseEvent => {
    return typeof obj === 'object' && obj !== null && 'start_time' in obj;
};

export const isAppEvent = (obj: unknown): obj is AppEvent => {
    return typeof obj === 'object' && obj !== null && 'startTime' in obj;
};

// --- Type Transformers (moved to separate file later) ---
export type EventTransformer = {
    toApp: (supabaseEvent: SupabaseEvent | SupabaseEventWithDetails) => AppEvent;

    toSupabase: (appEvent: Partial<AppEvent>) => Partial<SupabaseEvent>;
};

export type ProfileTransformer = {
    toApp: (supabaseProfile: SupabaseProfile) => AppProfile;
    toSupabase: (appProfile: Partial<AppProfile>) => Partial<SupabaseProfile>;
};

export type SupabaseEventWithEventType = SupabaseEvent & {
    event_type: SupabaseEventType | null;
};

export type SupabaseEventWithDetails = Omit<SupabaseEvent, 'organizer'> & {
    event_type: SupabaseEventType | null;
    organizer: { id: string, name: string } | null;
};


export type SupabaseTrackedEventWithDetails = Omit<SupabaseTrackedEvent, 'events'> & {
    events: SupabaseEventWithDetails | null;
};


export interface EventTag {
    id: string;
    name: string;
    color: string;
    category: string;
}
