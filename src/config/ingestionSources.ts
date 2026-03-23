/**
 * Ingestion Sources Configuration
 * 
 * Initial source list with prioritized feeds per persona.
 * Each source includes metadata requirements and trust score initialization.
 */

export type IngestionSourceType = 'API' | 'RSS' | 'ICS' | 'HTML' | 'MANUAL_UPLOAD';

export interface SourceMetadata {
    rate_limit?: {
        requests_per_minute: number;
    };
    auth?: {
        type: 'api_key' | 'oauth';
        config: Record<string, unknown>;
    };
    pagination?: {
        type: 'cursor' | 'offset' | 'page';
        params: Record<string, unknown>;
    };
    selector_patterns?: Record<string, string>; // For HTML scraping
    provider?: string;
    filters?: Record<string, unknown>;
    categories?: string[];
    years_ahead?: number;
}

export interface InitialSourceConfig {
    name: string;
    source_url: string;
    source_type: IngestionSourceType;
    access_type: string;
    trust_score: number; // Initial trust score (0-100)
    fetch_interval_minutes?: number;
    metadata?: SourceMetadata;
    is_active?: boolean;
}

/**
 * Initial prioritized source list
 * Organized by persona/use case
 */
export const INITIAL_SOURCES: InitialSourceConfig[] = [
    // CNCF and Cloud Native Community
    {
        name: 'CNCF Events',
        source_url: 'https://www.cncf.io/community/calendar/',
        source_type: 'HTML',
        access_type: 'web_scrape',
        trust_score: 85.0,
        fetch_interval_minutes: 120,
        metadata: {
            selector_patterns: {
                event_title: '.event-title',
                event_date: '.event-date',
                event_location: '.event-location',
            },
        },
    },
    
    // ProductTank Communities
    {
        name: 'ProductTank Global',
        source_url: 'https://www.mindtheproduct.com/producttank/',
        source_type: 'HTML',
        access_type: 'web_scrape',
        trust_score: 80.0,
        fetch_interval_minutes: 120,
    },
    
    // Tech Accelerator Newsletters (placeholder - actual URLs to be added)
    // These would typically be RSS or ICS feeds from accelerator calendars
    {
        name: 'Y Combinator Events',
        source_url: 'https://www.ycombinator.com/events',
        source_type: 'HTML',
        access_type: 'web_scrape',
        trust_score: 90.0,
        fetch_interval_minutes: 180,
    },
    
    // High-quality RSS feeds (examples - actual feeds to be configured)
    {
        name: 'Tech Conference RSS Feed',
        source_url: 'https://example.com/tech-events/rss',
        source_type: 'RSS',
        access_type: 'rss_feed',
        trust_score: 75.0,
        fetch_interval_minutes: 60,
        metadata: {
            rate_limit: {
                requests_per_minute: 10,
            },
        },
    },
    
    // ICS/Calendar feeds
    {
        name: 'Community Calendar ICS',
        source_url: 'https://example.com/calendar.ics',
        source_type: 'ICS',
        access_type: 'ics_feed',
        trust_score: 70.0,
        fetch_interval_minutes: 120,
    },

    {
        name: 'Confs.tech Online',
        source_url: 'https://confs.tech/?online=online',
        source_type: 'API',
        access_type: 'public_api',
        trust_score: 65.0,
        fetch_interval_minutes: 360,
        metadata: {
            provider: 'confs.tech',
            filters: {
                online_only: true,
            },
            years_ahead: 1,
        },
        is_active: true,
    },
    {
        name: 'Developers.events',
        source_url: 'https://developers.events/all-events.json',
        source_type: 'API',
        access_type: 'public_api',
        trust_score: 80.0,
        fetch_interval_minutes: 360,
        metadata: {
            provider: 'developers.events',
        },
        is_active: true,
    },
    {
        name: 'Microsoft Events Catalog',
        source_url: 'https://www.microsoft.com/msonecloudapi/events/cards',
        source_type: 'API',
        access_type: 'public_api',
        trust_score: 90.0,
        fetch_interval_minutes: 360,
        metadata: {
            provider: 'microsoft.events',
            filters: { format: 'in-person', language: 'english' },
            pagination: {
                type: 'offset',
                params: { top: 50 },
            },
        },
        is_active: true,
    },
    {
        name: 'Google Developers Events',
        source_url: 'https://developers.google.com/events',
        source_type: 'HTML',
        access_type: 'web_scrape',
        trust_score: 90.0,
        fetch_interval_minutes: 360,
        metadata: {
            selector_patterns: {
                event_title: '.devsite-landing-row-item-title, h3',
                event_date: '.devsite-landing-row-item-description',
                event_location: '.devsite-landing-row-item-description',
            },
        },
        is_active: true,
    },
];

/**
 * Default metadata structure for source types
 */
export const DEFAULT_SOURCE_METADATA: Record<IngestionSourceType, Partial<SourceMetadata>> = {
    API: {
        rate_limit: {
            requests_per_minute: 60,
        },
        pagination: {
            type: 'cursor',
            params: {},
        },
    },
    RSS: {
        rate_limit: {
            requests_per_minute: 10,
        },
    },
    ICS: {
        rate_limit: {
            requests_per_minute: 5,
        },
    },
    HTML: {
        rate_limit: {
            requests_per_minute: 10,
        },
        selector_patterns: {},
    },
    MANUAL_UPLOAD: {},
};


