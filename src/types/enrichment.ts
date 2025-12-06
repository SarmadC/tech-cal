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
});

export type ExtractedSpeaker = z.infer<typeof ExtractedSpeakerSchema>;

export const ExtractedAgendaItemSchema = z.object({
    title: z.string(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    description: z.string().max(500).optional(),
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


