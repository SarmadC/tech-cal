/**
 * Ingestion Types
 * 
 * Type definitions for event ingestion pipeline
 */

export interface EventSourceRecord {
    // Normalized event data
    title: string;
    description?: string;
    startTime: string;
    endTime?: string;
    timezone?: string;
    location: string;
    organizer?: string;
    organizerDomain?: string;
    sourceUrl: string;
    registrationUrl?: string;
    livestreamUrl?: string;
    eventImageUrl?: string;
    tags?: string[];
    priceRange?: {
        min?: number;
        max?: number;
        currency?: string;
    };
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    eventFormat?: 'virtual' | 'in-person' | 'hybrid';
    speakerLineup?: SpeakerRecord[];
    normalizedSourceUrl?: string;
    normalizedSourceUrlHash?: string;
    normalizedRegistrationUrl?: string;
    normalizedRegistrationUrlHash?: string;
    sourceDomain?: string;
    
    // Provenance and confidence
    provenance: IngestionProvenance;
    confidence: number; // 0-100, confidence in the extracted data
}

export interface SpeakerRecord {
    name: string;
    title?: string;
    company?: string;
    bio?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    photoUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
}

export interface IngestionProvenance {
    source_id: string;
    fetch_job_id: string;
    collector: 'rss' | 'api' | 'ics' | 'html' | 'manual';
    raw_hash: string; // SHA256 of raw payload
    quality_components: {
        source_trust: number;
        metadata_completeness: number;
        speaker_verification: number;
        historical_performance: number;
    };
    fetched_at: string; // ISO timestamp
    collector_version?: string;
    normalized_url?: string;
    normalized_url_hash?: string;
    registration_normalized_url?: string;
    registration_normalized_url_hash?: string;
    source_domain?: string;
    cache_hit?: boolean;
}

export interface CollectorResult {
    records: Array<{
        record: EventSourceRecord;
        rawItem: unknown; // Original raw item from source (for stable checksum calculation)
    }>;
    errors: CollectorError[];
    metadata?: Record<string, unknown>;
}

export interface CollectorError {
    type: 'fetch_error' | 'parse_error' | 'validation_error' | 'rate_limit_error';
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Event agenda item schema for scraped data
 */
export interface EventAgendaSchema {
    title?: string;
    name?: string;
    sessionName?: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    speakers?: string[];
    location?: string;
    track?: string;
    dayNumber?: number;
    agendaType?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    capacity?: number;
    prerequisites?: string;
    isRequired?: boolean;
    durationMinutes?: number;
}

/**
 * Event daily schedule entry for scraped data
 */
export interface EventDailyScheduleEntry {
    dayNumber?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    dayLabel?: string;
    notes?: string;
}

/**
 * Event speaker schema for scraped data
 */
export interface EventSpeakersSchema {
    name?: string;
    title?: string;
    company?: string;
    bio?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    photoUrl?: string;
    websiteUrl?: string;
}

/**
 * Event pricing schema for scraped data
 */
export interface EventPricingSchema {
    priceMin?: number;
    priceMax?: number;
    currency?: string;
    pricingType?: 'Free' | 'Paid' | 'Varies';
}

/**
 * Combined extracted data from scraping
 */
export interface ScrapedEventData {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    agenda?: EventAgendaSchema[];
    speakers?: EventSpeakersSchema[];
    pricing?: EventPricingSchema;
    imageUrl?: string;
    agendaUrl?: string;
    timezone?: string;
    registrationUrl?: string;
    livestreamUrl?: string;
    format?: string;
    difficulty?: string;
    tags?: Array<string | null | undefined>;
    venue?: {
        name?: string;
        address?: string;
        city?: string;
        state_province?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    location?: {
        venue?: string;
        address?: string;
        city?: string;
        country?: string;
        state?: string;
        state_province?: string;
        virtualPlatform?: string;
        [key: string]: unknown;
    };
    sourceUrls?: {
        finalUrl?: string;
        sourceUrl?: string;
        [key: string]: unknown;
    };
    dailySchedule?: EventDailyScheduleEntry[];
}

