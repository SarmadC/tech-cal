import { z } from 'zod';

export const ENRICHMENT_STATUSES = [
    'pending',
    'processing',
    'enriched',
    'failed',
    'approved',
    'rejected',
    'skipped',
] as const;

export type EnrichmentStatus = (typeof ENRICHMENT_STATUSES)[number];

export const ExtractedSpeakerSchema = z.object({
    name: z.string(),
    title: z.string().optional(),
    company: z.string().optional(),
    bio: z.string().max(500).optional(),
    linkedinUrl: z.string().url().optional(),
    photoUrl: z.string().url().optional(),
    twitterUrl: z.string().url().optional(),
    websiteUrl: z.string().url().optional(),
});

export type ExtractedSpeaker = z.infer<typeof ExtractedSpeakerSchema>;

export const ExtractedAgendaItemSchema = z.object({
    title: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    description: z.string().max(500).optional(),
    location: z.string().max(300).optional(),
    track: z.string().max(200).optional(),
    topics: z.array(z.string().min(1).max(64)).max(20).optional(),
    dayNumber: z.number().int().min(1).max(31).optional(),
    agendaType: z.string().max(64).optional(),
    difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    capacity: z.number().int().positive().optional(),
    prerequisites: z.string().max(500).optional(),
    isRequired: z.boolean().optional(),
    durationMinutes: z.number().int().positive().max(24 * 60).optional(),
    speakers: z.array(z.string()).optional(),
});

export type ExtractedAgendaItem = z.infer<typeof ExtractedAgendaItemSchema>;

export const ExtractedPricingSchema = z.object({
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    currency: z.string().length(3).optional(),
    pricingType: z.enum(['Free', 'Paid', 'Varies']).optional(),
});

export type ExtractedPricing = z.infer<typeof ExtractedPricingSchema>;

export interface AgenticCrawlTraceEntry {
    iteration: number;
    action: 'start' | 'fetch' | 'interact' | 'stop' | 'skip';
    candidateId?: string;
    actionType?: 'switch_day' | 'expand_section' | 'load_more';
    label?: string;
    pageUrl?: string;
    url?: string;
    kind?: 'primary' | 'agenda' | 'speakers' | 'session';
    rationale?: string;
    reason?: string;
    coverageScore?: number;
    escalationReasons?: string[];
    evidenceSources?: string[];
    capturedAgendaDays?: number;
    expectedAgendaDays?: number;
}

export interface AgenticCrawlMetadata {
    crawl_strategy: 'deterministic_only' | 'hybrid_agent';
    agent_invoked: boolean;
    agent_shadow_mode?: boolean;
    coverage_score_before?: number;
    coverage_score_after?: number;
    escalation_reasons?: string[];
    pages_crawled?: number;
    vendor_hosts_used?: string[];
    agent_trace?: AgenticCrawlTraceEntry[];
}

export const ExtractedEventDataSchema = z.object({
    speakers: z.array(ExtractedSpeakerSchema).max(50).optional(),
    agenda: z.array(ExtractedAgendaItemSchema).max(100).optional(),
    pricing: ExtractedPricingSchema.optional(),
    description: z.string().max(5000).optional(),
    location: z.string().max(500).optional(),
    registrationUrl: z.string().url().optional(),
    eventFormat: z.enum(['Online', 'In-person', 'Hybrid']).optional(),
    // Canonical tag names chosen from an allowed list; enforced upstream
    tags: z.array(z.string().min(2).max(64)).max(25).optional(),
});

export type ExtractedEventData = z.infer<typeof ExtractedEventDataSchema>;

export interface EnrichmentMetadata {
    enrichment_source: 'llm' | 'rules' | 'firecrawl';
    llm_model?: string;
    enriched_data?: ExtractedEventData;
    processing_started_at?: string;
    completed_at?: string;
    retry_count: number;
    next_retry_after?: string;
    last_error?: string;
    content_hash?: string;
    tokens_used?: number;
    applied_tags?: string[];
    agentic_crawl?: AgenticCrawlMetadata;
}

export interface ExtractionContext {
    eventId?: string;
    sourceUrl: string;
    contentHash?: string;
}

export interface ExtractionProviderResult {
    data: ExtractedEventData;
    model?: string;
    tokensUsed?: number;
    raw?: unknown;
}

// =============================================
// INFERENCE MODE TYPES
// =============================================

/**
 * Request for LLM inference mode (no scraping required)
 * Uses event title and available metadata to generate/infer content
 */
export interface InferenceRequest {
    title: string;
    eventType?: string;
    organizer?: string;
    location?: string;
    existingDescription?: string;
    startTime?: string;
    endTime?: string;
    allowedTags: string[];
}

/**
 * Schema for inferred event data (subset of ExtractedEventData)
 * Focused on what can be reasonably inferred from title/metadata
 * Uses permissive validation to handle various Gemini response formats
 */
export const InferredEventDataSchema = z.object({
    // Generated description based on event title and context
    description: z.string().max(2000).nullish().optional(),
    // Inferred tags from title and context
    tags: z.array(z.string()).nullish().optional(),
    // Inferred difficulty level
    difficultyLevel: z.string().nullish().optional(),
    // Inferred target audience
    targetAudience: z.array(z.string()).nullish().optional(),
    // Key topics extracted from title
    keyTopics: z.array(z.string()).nullish().optional(),
}).passthrough(); // Allow extra fields from Gemini

export type InferredEventData = z.infer<typeof InferredEventDataSchema>;

/**
 * Result from inference provider
 */
export interface InferenceProviderResult {
    data: InferredEventData;
    model?: string;
    tokensUsed?: number;
    raw?: unknown;
}
