// src/types/index.ts

// --- Database Types (snake_case) ---
// These types match the shape of data coming directly from Supabase.

export type SupabaseEvent = {
    id: string;
    created_at: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string | null;
    organizer: string;
    location: string;
    status: string;
    source_url: string;
    livestream_url: string | null;
    event_type_id: string;
};

export type SupabaseEventType = {
    id: string;
    name: string;
    color: string;
    description: string | null;
};

export type SupabaseTrackedEvent = {
    id: string;
    user_id: string;
    event_id: string;
    status: 'bookmarked' | 'attending' | 'attended' | 'cancelled';
    notes: string | null;
    created_at: string;
    // FIX: This must be an array of events or null, as per Supabase's join syntax
    events: SupabaseEvent[] | null;
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
    sourceUrl: string;
    livestreamUrl: string | null;
    eventTypeId: string;
    color?: string; // Enriched data
};

export type AppEventType = {
    id: string;
    name: string;
    color: string;
    description: string | null;
    eventCount?: number; // Enriched data
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