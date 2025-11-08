/**
 * Firecrawl Type Definitions
 * 
 * TypeScript interfaces for Firecrawl API responses and JSON extraction schemas
 */

/**
 * Firecrawl enrichment metadata stored in events.firecrawl_enrichment_metadata
 */
export interface FirecrawlEnrichmentMetadata {
    attempted_at?: string; // ISO timestamp
    completed_at?: string; // ISO timestamp
    urls_scraped?: string[]; // Array of resolved URLs that were scraped
    original_urls?: { // Original URLs before Techmeme resolution
        source_url?: string;
        registration_url?: string | null;
    };
    effective_urls?: { // URLs we actually queried during extraction (after in-code heuristics)
        source_url?: string;
        registration_url?: string | null;
    };
    resolved_urls?: { // Resolved canonical URLs after Techmeme resolution
        source_url?: string;
        registration_url?: string | null;
    };
    schedule_links_used?: string[];
    schedule_links_remaining?: string[];
    schedule_links_processed?: string[];
    schedule_links_pending?: string[];
    schedule_next_cursor?: string | null;
    schedule_link_details?: Array<{
        url: string;
        type?: string;
        label?: string;
        contentFormat?: 'html' | 'json' | 'graphql';
        queryParams?: string[];
        hints?: string[];
    }>;
    schedule_hints?: string[];
    schedule_auto_retry_count?: number;
    schedule_credits_used?: number;
    fields_updated?: string[]; // Array of field names that were updated
    error_message?: string | null;
    retry_count?: number; // Number of retry attempts (capped at max retries)
    next_retry_at?: string; // ISO timestamp for next retry (exponential backoff)
    enrichment_strategy?: 'scrape' | 'crawl' | 'extract'; // Strategy used for enrichment
    site_complexity?: 'SIMPLE' | 'MULTI_PAGE' | 'COMPLEX'; // Detected site complexity
    pages_crawled?: number; // Number of pages crawled (if using crawl mode)
    credits_used?: number; // Firecrawl credits consumed
    extraction_quality_score?: number; // 0-1 score for extraction quality
    ingestion_confidence?: number; // Final confidence score stored during enrichment
    partial_coverage?: 'agenda' | 'speakers' | 'pricing' | 'other';
}

/**
 * Firecrawl enrichment status values
 */
export type FirecrawlEnrichmentStatus = 
    | 'pending'
    | 'in_progress'
    | 'completed'
    | 'failed'
    | 'skipped';

/**
 * Event agenda item schema for Firecrawl JSON extraction
 * Uses semantic field names to match various site terminologies
 */
export interface EventAgendaSchema {
    // Primary fields with variations for semantic matching
    title?: string;
    name?: string;
    sessionName?: string;
    dayNumber?: number;

    // Time fields
    startTime?: string; // ISO timestamp or time string
    start_time?: string;
    start?: string;
    time?: string;
    begin?: string;
    beginTime?: string;
    startTimeLocal?: string;

    endTime?: string; // ISO timestamp or time string
    end_time?: string;
    end?: string;
    duration?: string; // Alternative: duration in minutes or text
    endTimeLocal?: string;
    durationMinutes?: number;

    // Content fields
    description?: string;
    summary?: string;
    abstract?: string;
    overview?: string;
    details?: string;
    bio?: string;

    // Speaker/Presenter fields
    speakers?: string[];
    speaker?: string;
    presenters?: string[];
    presenter?: string;
    instructors?: string[];
    instructor?: string;

    // Location/Track fields
    location?: string;
    venue?: string;
    room?: string;

    track?: string;
    category?: string;
    type?: string;
    agenda_type?: string;
}

/**
 * Event daily schedule entry for Firecrawl JSON extraction
 */
export interface EventDailyScheduleEntry {
    dayNumber?: number; // Day number in the event (1-based)
    date?: string; // ISO date if available
    startTime?: string; // Start time (24-hour HH:MM preferred, ISO accepted)
    endTime?: string; // End time (24-hour HH:MM preferred, ISO accepted)
    dayLabel?: string; // Optional label, e.g., "Day 1"
    notes?: string; // Additional context if available
}

/**
 * Event speaker schema for Firecrawl JSON extraction
 * Uses semantic field names to match various site terminologies
 */
export interface EventSpeakersSchema {
    // Name fields
    name?: string;
    fullName?: string;
    full_name?: string;
    speaker?: string;
    presenter?: string;

    // Title/Role fields
    title?: string;
    role?: string;
    position?: string;
    jobTitle?: string;
    job_title?: string;

    // Organization fields
    company?: string;
    organization?: string;
    employer?: string;

    // Bio/Description fields
    bio?: string;
    biography?: string;
    description?: string;
    summary?: string;
    about?: string;

    // Social/Web fields
    linkedinUrl?: string;
    linkedin?: string;
    linkedin_url?: string;

    twitterUrl?: string;
    twitter?: string;
    twitter_url?: string;
    twitterHandle?: string;
    twitter_handle?: string;

    photoUrl?: string;
    photo_url?: string;
    photo?: string;
    image?: string;
    imageUrl?: string;

    websiteUrl?: string;
    website?: string;
    website_url?: string;
    personalWebsite?: string;
}

/**
 * Event pricing schema for Firecrawl JSON extraction
 */
export interface EventPricingSchema {
    priceMin?: number;
    priceMax?: number;
    currency?: string; // ISO currency code (USD, EUR, etc.)
    pricingType?: 'Free' | 'Paid' | 'Varies';
}

/**
 * Combined extracted data from Firecrawl
 */
export interface ExtractedEventData {
    title?: string;
    description?: string; // Markdown description
    startTime?: string; // ISO timestamp for event start time
    endTime?: string; // ISO timestamp for event end time
    timezone?: string;
    status?: string;
    format?: string;
    registrationUrl?: string;
    agendaUrl?: string;
    language?: string;
    difficulty?: string;
    targetAudience?: string;
    tags?: string[];
    location?: {
        venue?: string;
        address?: string;
        city?: string;
        country?: string;
        virtualPlatform?: string;
    };
    agenda?: EventAgendaSchema[];
    speakers?: EventSpeakersSchema[];
    pricing?: EventPricingSchema;
    imageUrl?: string;
    venue?: {
        name?: string;
        address?: string;
        city?: string;
        state_province?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    dailySchedule?: EventDailyScheduleEntry[];
    sourceUrls?: {
        finalUrl?: string;
        sourceUrl?: string;
        ogUrl?: string;
    };
}

/**
 * Firecrawl scrape response (simplified)
 */
export interface FirecrawlScrapeResponse {
    success: boolean;
    data?: {
        markdown?: string;
        html?: string;
        json?: unknown; // Structured data from JSON mode
        metadata?: {
            title?: string;
            description?: string;
            ogImage?: string;
            ogUrl?: string;
            [key: string]: unknown;
        };
    };
    error?: string;
    creditsUsed?: number;
}

/**
 * Firecrawl crawl response (for multi-page crawling)
 */
export interface FirecrawlCrawlResponse {
    success: boolean;
    data?: Array<{
        url: string;
        markdown?: string;
        html?: string;
        extract?: unknown; // Structured data from extract format
        metadata?: {
            title?: string;
            description?: string;
            ogImage?: string;
            ogUrl?: string;
            [key: string]: unknown;
        };
    }>;
    error?: string;
    creditsUsed?: number;
    expiresAt?: string; // ISO timestamp for result expiration
}

/**
 * Firecrawl extract response (for structured data extraction)
 */
export interface FirecrawlExtractResponse {
    success: boolean;
    data?: {
        results?: Array<{
            url: string;
            data?: ExtractedEventData;
            [key: string]: unknown;
        }>;
        [key: string]: unknown;
    };
    error?: string;
    creditsUsed?: number;
}
