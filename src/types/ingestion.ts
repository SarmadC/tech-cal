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

