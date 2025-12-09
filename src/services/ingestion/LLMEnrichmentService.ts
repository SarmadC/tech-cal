import { createHash } from 'crypto';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as Sentry from '@sentry/nextjs';
import type { SupabaseClientType, Json } from '@/types';
import {
    type EnrichmentMetadata,
    type ExtractionProviderResult,
    type ExtractedAgendaItem,
    type ExtractedEventData,
    type ExtractedSpeaker,
    type InferenceRequest,
    type InferenceProviderResult,
} from '@/types/enrichment';
import { PlaywrightScraper } from './PlaywrightScraper';
import { getExtractionProvider } from './providers/ProviderFactory';
import { GeminiExtractionProvider } from './providers/GeminiExtractionProvider';
import { env } from '@/utils/env';
import type { FieldDiff } from './EventUpdateService';

const CONTENT_LIMIT = 100_000; // ~100KB
const MAX_RETRIES = 3;

type EventRow = {
    id: string;
    title?: string | null;
    source_url: string | null;
    enrichment_status?: string | null;
    enrichment_metadata?: EnrichmentMetadata | null;
    description?: string | null;
    location?: string | null;
    registration_url?: string | null;
    event_format?: string | null;
    price_min?: number | null;
    price_max?: number | null;
    currency?: string | null;
    pricing_type?: string | null;
    speaker_lineup?: unknown;
    start_time?: string | null;
    end_time?: string | null;
    difficulty_level?: string | null;
};

type EventRowWithRelations = EventRow & {
    event_type?: { name: string } | null;
    organizer?: { name: string } | null;
};

type AllowedTag = {
    id: string;
    name: string;
    category?: string | null;
};

type TagChange = {
    oldTagIds: string[];
    newTagIds: string[];
    oldTagNames: string[];
    newTagNames: string[];
    added: string[];
    removed: string[];
};

const ALLOWED_TAGS_TTL_MS = 5 * 60 * 1000; // 5 minutes
let allowedTagsCache: { tags: AllowedTag[]; fetchedAt: number } | null = null;

export interface EnrichmentJobResult {
    eventId: string;
    status: 'enriched' | 'failed';
    error?: string;
}

export interface EnrichmentBatchResult {
    processed: number;
    succeeded: number;
    failed: number;
    results: EnrichmentJobResult[];
}

export class LLMEnrichmentService {
    constructor(
        private readonly supabaseClient: SupabaseClientType,
        private readonly scraper = new PlaywrightScraper(),
    ) {}

    async processBatch(limit = 10): Promise<EnrichmentBatchResult> {
        await this.resetStuckProcessing();
        const events = await this.fetchPendingEvents(limit);
        const results: EnrichmentJobResult[] = [];

        for (const event of events) {
            // eslint-disable-next-line no-await-in-loop
            const result = await this.processEvent(event.id);
            results.push(result);
        }

        const succeeded = results.filter(r => r.status === 'enriched').length;
        const failed = results.length - succeeded;

        return {
            processed: results.length,
            succeeded,
            failed,
            results,
        };
    }

    async processEvent(eventId: string): Promise<EnrichmentJobResult> {
        try {
            const event = await this.fetchEvent(eventId);
            if (!event) {
                return { eventId, status: 'failed', error: 'Event not found' };
            }

            const sourceUrl = event.source_url;
            if (!sourceUrl) {
                await this.markFailed(eventId, event, 'Event is missing source_url');
                return { eventId, status: 'failed', error: 'Missing source_url' };
            }

            this.validateSourceUrl(sourceUrl);

            const metadata = this.normalizeMetadata(event);
            await this.markProcessing(eventId, metadata);

            const scrape = await this.scraper.scrapeUrl(sourceUrl);
            const content = this.extractReadableContent(scrape.html);

            if (!content) {
                throw new Error('Unable to extract readable content from page');
            }

            const contentHash = this.hashContent(content);
            const allowedTags = await this.loadAllowedTags();
            const provider = getExtractionProvider();
            const providerResult = await provider.extract({
                content,
                context: { sourceUrl, eventId, contentHash },
                allowedTags: allowedTags.map(t => t.name),
            });

            await this.persistSuccess(eventId, event, providerResult, metadata, contentHash, allowedTags);

            return { eventId, status: 'enriched' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.markRetryOrFail(eventId, message);
            Sentry.captureException(error, { extra: { eventId } });
            return { eventId, status: 'failed', error: message };
        }
    }

    private async fetchPendingEvents(limit: number): Promise<EventRow[]> {
        const { data, error } = await this.supabaseClient
            .from('events')
            .select(
                [
                    'id',
                    'source_url',
                    'enrichment_status',
                    'enrichment_metadata',
                    'description',
                    'location',
                    'registration_url',
                    'event_format',
                    'price_min',
                    'price_max',
                    'currency',
                    'pricing_type',
                    'speaker_lineup',
                ].join(','),
            )
            .in(this.statusColumn(), ['pending', 'failed'])
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            Sentry.captureException(error, { extra: { function: 'fetchPendingEvents', limit } });
            return [];
        }

        return (data ?? []) as unknown as EventRow[];
    }

    private async fetchEvent(eventId: string): Promise<EventRow | null> {
        const { data, error } = await this.supabaseClient
            .from('events')
            .select(
                [
                    'id',
                    'source_url',
                    'enrichment_status',
                    'enrichment_metadata',
                    'description',
                    'location',
                    'registration_url',
                    'event_format',
                    'price_min',
                    'price_max',
                    'currency',
                    'pricing_type',
                    'speaker_lineup',
                ].join(','),
            )
            .eq('id', eventId)
            .maybeSingle();

        if (error) {
            Sentry.captureException(error, { extra: { function: 'fetchEvent', eventId } });
            return null;
        }

        return (data as unknown as EventRow | null) || null;
    }

    private normalizeMetadata(event: EventRow): EnrichmentMetadata {
        const metadata = (event.enrichment_metadata || {}) as EnrichmentMetadata;
        return {
            enrichment_source: 'llm',
            retry_count: metadata.retry_count ?? 0,
            processing_started_at: metadata.processing_started_at,
            completed_at: metadata.completed_at,
            enriched_data: metadata.enriched_data,
            llm_model: metadata.llm_model,
            next_retry_after: metadata.next_retry_after,
            last_error: metadata.last_error,
            content_hash: metadata.content_hash,
            tokens_used: metadata.tokens_used,
        };
    }

    private statusColumn(): 'enrichment_status' {
        return 'enrichment_status';
    }

    private metadataColumn(): 'enrichment_metadata' {
        return 'enrichment_metadata';
    }

    private async markProcessing(eventId: string, metadata: EnrichmentMetadata): Promise<void> {
        const now = new Date().toISOString();
        const updatedMeta: EnrichmentMetadata = {
            ...metadata,
            processing_started_at: now,
            last_error: undefined,
        };

        await this.supabaseClient
            .from('events')
            .update({
                [this.statusColumn()]: 'processing',
                [this.metadataColumn()]: updatedMeta as unknown as Json,
            })
            .eq('id', eventId);
    }

    private async persistSuccess(
        eventId: string,
        event: EventRow,
        providerResult: ExtractionProviderResult,
        previousMetadata: EnrichmentMetadata,
        contentHash: string,
        allowedTags: AllowedTag[] = [],
    ): Promise<void> {
        const now = new Date().toISOString();
        const metadata: EnrichmentMetadata = {
            ...previousMetadata,
            enrichment_source: 'llm',
            llm_model: providerResult.model,
            enriched_data: providerResult.data,
            completed_at: now,
            retry_count: previousMetadata.retry_count,
            content_hash: contentHash,
            tokens_used: providerResult.tokensUsed,
            last_error: undefined,
        };

        await this.supabaseClient
            .from('events')
            .update({
                [this.statusColumn()]: 'enriched',
                [this.metadataColumn()]: metadata as unknown as Json,
            })
            .eq('id', eventId);

        const tagChange = await this.persistTags(eventId, providerResult.data.tags, allowedTags);
        if (tagChange) {
            metadata.applied_tags = tagChange.newTagNames;
            await this.supabaseClient
                .from('events')
                .update({
                    [this.metadataColumn()]: metadata as unknown as Json,
                })
                .eq('id', eventId);
        }

        await this.queueForReview(eventId, event, providerResult.data, tagChange);
    }

    private async markFailed(eventId: string, event: EventRow, reason: string): Promise<void> {
        const metadata = this.normalizeMetadata(event);
        const updated: EnrichmentMetadata = {
            ...metadata,
            retry_count: metadata.retry_count + 1,
            last_error: reason,
        };

        await this.supabaseClient
            .from('events')
            .update({
                [this.statusColumn()]: 'failed',
                [this.metadataColumn()]: updated as unknown as Json,
            })
            .eq('id', eventId);
    }

    private async markRetryOrFail(eventId: string, reason: string): Promise<void> {
        const event = await this.fetchEvent(eventId);
        if (!event) return;

        const metadata = this.normalizeMetadata(event);
        const retries = metadata.retry_count + 1;
        const shouldFail = retries >= MAX_RETRIES;
        const nextStatus = shouldFail ? 'failed' : 'pending';

        const updated: EnrichmentMetadata = {
            ...metadata,
            retry_count: retries,
            last_error: reason,
            next_retry_after: shouldFail ? undefined : this.computeNextRetry(retries),
        };

        await this.supabaseClient
            .from('events')
            .update({
                [this.statusColumn()]: nextStatus,
                [this.metadataColumn()]: updated as unknown as Json,
            })
            .eq('id', eventId);
    }

    private computeNextRetry(retries: number): string {
        const minutes = retries === 1 ? 1 : retries === 2 ? 5 : 30;
        const date = new Date();
        date.setMinutes(date.getMinutes() + minutes);
        return date.toISOString();
    }

    private async resetStuckProcessing(): Promise<void> {
        const threshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        await this.supabaseClient
            .from('events')
            .update({ [this.statusColumn()]: 'pending' })
            .eq(this.statusColumn(), 'processing')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .lt('enrichment_metadata->>processing_started_at' as any, threshold);
    }

    private extractReadableContent(html: string): string {
        const dom = new JSDOM(html);
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        const text = (article?.textContent || dom.window.document.body?.textContent || '').trim();
        const sanitized = this.stripPii(text).replace(/\s+/g, ' ').trim();
        return this.truncate(sanitized, CONTENT_LIMIT);
    }

    private stripPii(text: string): string {
        // Basic scrubbing for emails and phone numbers
        return text
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted]')
            .replace(/\+?\d[\d\s().-]{7,}\d/g, '[redacted]');
    }

    private truncate(text: string, limit: number): string {
        if (text.length <= limit) return text;
        return `${text.slice(0, limit)}...[truncated]`;
    }

    private hashContent(content: string): string {
        return createHash('sha256').update(content).digest('hex');
    }

    private async loadAllowedTags(): Promise<AllowedTag[]> {
        const now = Date.now();
        if (allowedTagsCache && now - allowedTagsCache.fetchedAt < ALLOWED_TAGS_TTL_MS) {
            return allowedTagsCache.tags;
        }

        const { data, error } = await this.supabaseClient
            .from('event_tags')
            .select('id, event_tag, category');

        if (error || !data) {
            Sentry.captureException(error, { extra: { function: 'loadAllowedTags' } });
            return allowedTagsCache?.tags ?? [];
        }

        const tags = data
            .map(tag => ({
                id: tag.id as string,
                name: (tag.event_tag as string).trim(),
                category: (tag.category as string | null) ?? null,
            }))
            .filter(tag => this.isAllowedTagName(tag.name));

        allowedTagsCache = { tags, fetchedAt: now };
        return tags;
    }

    private isAllowedTagName(name: string): boolean {
        const trimmed = name.trim();
        if (!trimmed) return false;

        const lower = trimmed.toLowerCase();

        // Skip noisy placeholders or malformed entries
        if (lower === 'general' || lower === 'online') return false;
        if (lower === 'language' || lower === 'topic') return false;
        if (/^{/.test(trimmed)) return false; // JSON-ish stored as string

        // Filter ultra-short unless explicitly meaningful (keep AI, ML)
        if (trimmed.length < 2) return false;
        if (trimmed.length === 2 && !['ai', 'ml', 'vr', 'ar', 'ui'].includes(lower)) {
            return false;
        }

        return true;
    }

    private async persistTags(
        eventId: string,
        tags: string[] | undefined,
        allowedTags: AllowedTag[],
    ): Promise<TagChange | null> {
        if (!tags || tags.length === 0 || allowedTags.length === 0) return null;

        const lookup = new Map<string, string>();
        allowedTags.forEach(tag => {
            lookup.set(tag.name.toLowerCase(), tag.id);
        });

        const newTagIds = new Set<string>();
        tags.forEach(tag => {
            if (typeof tag !== 'string') return;
            const normalized = tag.trim().toLowerCase();
            const tagId = lookup.get(normalized);
            if (tagId) {
                newTagIds.add(tagId);
            }
        });

        if (newTagIds.size === 0) return null;

        // Fetch current tags for diffing
        const { data: existing, error: existingError } = await this.supabaseClient
            .from('event_tag_relations')
            .select('tag_id')
            .eq('event_id', eventId);

        if (existingError) {
            Sentry.captureException(existingError, { extra: { function: 'persistTags_existing', eventId } });
        }

        const oldTagIds = new Set<string>((existing || []).map(r => r.tag_id as string));

        const rows = Array.from(newTagIds).map(tagId => ({
            event_id: eventId,
            tag_id: tagId,
        }));

        const { error } = await this.supabaseClient
            .from('event_tag_relations')
            .upsert(rows, { onConflict: 'event_id,tag_id' });

        if (error) {
            Sentry.captureException(error, { extra: { function: 'persistTags', eventId, tagCount: rows.length } });
            return null;
        }

        const idToName = new Map<string, string>();
        allowedTags.forEach(tag => idToName.set(tag.id, tag.name));

        const oldIdsArr = Array.from(oldTagIds);
        const newIdsArr = Array.from(newTagIds);
        const addedIds = newIdsArr.filter(id => !oldTagIds.has(id));
        const removedIds = oldIdsArr.filter(id => !newTagIds.has(id));

        return {
            oldTagIds: oldIdsArr,
            newTagIds: newIdsArr,
            oldTagNames: oldIdsArr.map(id => idToName.get(id) || id),
            newTagNames: newIdsArr.map(id => idToName.get(id) || id),
            added: addedIds.map(id => idToName.get(id) || id),
            removed: removedIds.map(id => idToName.get(id) || id),
        };
    }

    private async queueForReview(
        eventId: string,
        event: EventRow,
        data: ExtractedEventData,
        tagChange?: TagChange | null
    ): Promise<void> {
        const diffs = this.buildFieldDiffs(event, data);
        if (tagChange && (tagChange.added?.length || tagChange.removed?.length)) {
            diffs.push({
                fieldName: 'tags',
                oldValue: tagChange.oldTagNames,
                newValue: tagChange.newTagNames,
                hasChanged: true,
            });
        }
        if (diffs.length === 0) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = this.supabaseClient as any;

        const { data: queueEntry, error: queueError } = await tableClient
            .from('event_update_queue')
            .insert({
                event_id: eventId,
                status: 'pending',
                requires_review_reason: 'llm_enrichment',
                // Use event_id as source_event_id to satisfy NOT NULL constraints in some deployments
                source_event_id: eventId,
            })
            .select('id')
            .single();

        if (queueError || !queueEntry) {
            throw new Error(`Failed to create review queue entry: ${queueError?.message || 'unknown error'}`);
        }

        const fieldRows = diffs.map((field) => ({
            queue_id: queueEntry.id,
            field_name: field.fieldName,
            old_value: field.oldValue,
            new_value: field.newValue,
            field_status: 'pending',
            confidence: field.confidence ?? null,
        }));

        const { error: fieldsError } = await tableClient
            .from('event_update_queue_fields')
            .insert(fieldRows);

        if (fieldsError) {
            throw new Error(`Failed to create review queue fields: ${fieldsError.message}`);
        }
    }

    private buildFieldDiffs(event: EventRow, data: ExtractedEventData): FieldDiff[] {
        const diffs: FieldDiff[] = [];

        const pushDiff = (
            fieldName: string,
            oldValue: unknown,
            newValue: unknown,
        ) => {
            const hasChanged = JSON.stringify(oldValue ?? null) !== JSON.stringify(newValue ?? null);
            if (!hasChanged && newValue == null) return;
            diffs.push({
                fieldName,
                oldValue,
                newValue,
                hasChanged: true,
            });
        };

        if (data.description) {
            pushDiff('description', event.description, data.description);
        }
        if (data.location) {
            pushDiff('location', event.location, data.location);
        }
        if (data.registrationUrl) {
            pushDiff('registration_url', event.registration_url, data.registrationUrl);
        }
        if (data.eventFormat) {
            pushDiff('event_format', event.event_format, data.eventFormat);
        }
        if (data.pricing) {
            pushDiff('price_min', event.price_min, data.pricing.priceMin ?? null);
            pushDiff('price_max', event.price_max, data.pricing.priceMax ?? null);
            pushDiff('currency', event.currency, data.pricing.currency ?? null);
            pushDiff('pricing_type', event.pricing_type, data.pricing.pricingType ?? null);
        }
        if (data.speakers) {
            pushDiff('speaker_lineup', event.speaker_lineup, this.toSpeakerLineup(data.speakers));
        }
        if (data.agenda) {
            pushDiff('agenda', null, this.toAgendaItems(data.agenda));
        }

        return diffs;
    }

    private validateSourceUrl(url: string) {
        let parsed: URL | null = null;
        try {
            parsed = new URL(url);
        } catch {
            throw new Error('Invalid source_url');
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Unsupported source_url protocol');
        }
    }

    private toSpeakerLineup(speakers: ExtractedSpeaker[]) {
        return speakers.map((speaker) => ({
            name: speaker.name,
            title: speaker.title,
            company: speaker.company,
            bio: speaker.bio,
            linkedinUrl: speaker.linkedinUrl,
            photoUrl: speaker.photoUrl,
        }));
    }

    private toAgendaItems(agenda: ExtractedAgendaItem[]) {
        return agenda.map((item) => ({
            title: item.title,
            start_time: item.startTime ?? null,
            end_time: item.endTime ?? null,
            description: item.description ?? null,
            speakers: item.speakers ?? [],
        }));
    }

    // =============================================
    // INFERENCE MODE (no scraping required)
    // =============================================

    /**
     * Process batch of events using inference mode (no scraping)
     * Targets events missing description or tags
     */
    async processInferenceBatch(limit = 20): Promise<EnrichmentBatchResult> {
        const events = await this.fetchEventsForInference(limit);
        const results: EnrichmentJobResult[] = [];

        for (const event of events) {
            // eslint-disable-next-line no-await-in-loop
            const result = await this.processEventInference(event.id);
            results.push(result);
        }

        const succeeded = results.filter(r => r.status === 'enriched').length;
        const failed = results.length - succeeded;

        return {
            processed: results.length,
            succeeded,
            failed,
            results,
        };
    }

    /**
     * Process a single event using inference mode (no scraping)
     * Generates description and tags from title + available metadata
     */
    async processEventInference(eventId: string): Promise<EnrichmentJobResult> {
        try {
            const event = await this.fetchEventForInference(eventId);
            if (!event) {
                return { eventId, status: 'failed', error: 'Event not found' };
            }

            if (!event.title) {
                return { eventId, status: 'failed', error: 'Event is missing title' };
            }

            const metadata = this.normalizeMetadata(event);
            await this.markProcessing(eventId, metadata);

            // Get allowed tags
            const allowedTags = await this.loadAllowedTags();

            // Build inference request
            const inferenceRequest: InferenceRequest = {
                title: event.title,
                eventType: event.event_type?.name,
                organizer: event.organizer?.name,
                location: event.location ?? undefined,
                existingDescription: event.description ?? undefined,
                startTime: event.start_time ?? undefined,
                allowedTags: allowedTags.map(t => t.name),
            };

            // Get inference provider
            const provider = this.getInferenceProvider();
            const inferenceResult = await provider.infer(inferenceRequest);

            // Persist the inferred data
            await this.persistInferenceSuccess(eventId, event, inferenceResult, metadata, allowedTags);

            return { eventId, status: 'enriched' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.markRetryOrFail(eventId, message);
            Sentry.captureException(error, { extra: { eventId, mode: 'inference' } });
            return { eventId, status: 'failed', error: message };
        }
    }

    /**
     * Fetch events that need inference (missing description or tags)
     */
    private async fetchEventsForInference(limit: number): Promise<EventRowWithRelations[]> {
        // First, get events with basic info
        const { data, error } = await this.supabaseClient
            .from('events')
            .select(`
                id,
                title,
                source_url,
                enrichment_status,
                enrichment_metadata,
                description,
                location,
                start_time,
                end_time,
                difficulty_level,
                event_type:event_type_id (name),
                organizer:organizer_id (name)
            `)
            .eq('status', 'confirmed')
            .or('description.is.null,description.eq.')
            .not('title', 'is', null)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            Sentry.captureException(error, { extra: { function: 'fetchEventsForInference', limit } });
            return [];
        }

        // Filter to events that don't have enough tags
        const eventIds = (data ?? []).map(e => e.id);
        if (eventIds.length === 0) return data as unknown as EventRowWithRelations[];

        // Check which events have tags
        const { data: tagRelations } = await this.supabaseClient
            .from('event_tag_relations')
            .select('event_id')
            .in('event_id', eventIds);

        const eventsWithTags = new Set((tagRelations ?? []).map(r => r.event_id));

        // Return events missing description OR missing tags
        return ((data ?? []) as unknown as EventRowWithRelations[]).filter(event => {
            const hasDescription = event.description && event.description.trim().length > 0;
            const hasTags = eventsWithTags.has(event.id);
            return !hasDescription || !hasTags;
        });
    }

    /**
     * Fetch a single event with relations for inference
     */
    private async fetchEventForInference(eventId: string): Promise<EventRowWithRelations | null> {
        const { data, error } = await this.supabaseClient
            .from('events')
            .select(`
                id,
                title,
                source_url,
                enrichment_status,
                enrichment_metadata,
                description,
                location,
                start_time,
                end_time,
                difficulty_level,
                event_type:event_type_id (name),
                organizer:organizer_id (name)
            `)
            .eq('id', eventId)
            .maybeSingle();

        if (error) {
            Sentry.captureException(error, { extra: { function: 'fetchEventForInference', eventId } });
            return null;
        }

        return (data as unknown as EventRowWithRelations | null) || null;
    }

    /**
     * Get inference provider (reuses Gemini provider)
     */
    private getInferenceProvider(): GeminiExtractionProvider {
        const apiKey = env('GOOGLE_GENERATIVE_AI_API_KEY');
        const model = env('LLM_ENRICHMENT_MODEL', 'gemini-1.5-flash');
        return new GeminiExtractionProvider({ apiKey, model });
    }

    /**
     * Persist inference results
     */
    private async persistInferenceSuccess(
        eventId: string,
        event: EventRowWithRelations,
        inferenceResult: InferenceProviderResult,
        previousMetadata: EnrichmentMetadata,
        allowedTags: AllowedTag[] = [],
    ): Promise<void> {
        const now = new Date().toISOString();
        const inferredDescription = inferenceResult.data.description ?? undefined;
        const inferredTags = Array.isArray(inferenceResult.data.tags)
            ? inferenceResult.data.tags
                .filter(tag => typeof tag === 'string')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
            : undefined;
        const metadata: EnrichmentMetadata = {
            ...previousMetadata,
            enrichment_source: 'llm',
            llm_model: inferenceResult.model,
            enriched_data: {
                description: inferredDescription,
                tags: inferredTags,
            },
            completed_at: now,
            retry_count: previousMetadata.retry_count,
            tokens_used: inferenceResult.tokensUsed,
            last_error: undefined,
        };

        // Build update payload
        const updatePayload: Record<string, unknown> = {
            [this.statusColumn()]: 'enriched',
            [this.metadataColumn()]: metadata as unknown as Json,
        };

        // Update description if generated and event doesn't have one
        if (inferredDescription && (!event.description || event.description.trim().length === 0)) {
            updatePayload.description = inferredDescription;
        }

        // Update difficulty level if inferred and event doesn't have one
        if (inferenceResult.data.difficultyLevel && !event.difficulty_level) {
            updatePayload.difficulty_level = inferenceResult.data.difficultyLevel;
        }

        await this.supabaseClient
            .from('events')
            .update(updatePayload)
            .eq('id', eventId);

        // Persist tags
        const tagChange = await this.persistTags(eventId, inferredTags, allowedTags);
        if (tagChange) {
            metadata.applied_tags = tagChange.newTagNames;
            await this.supabaseClient
                .from('events')
                .update({
                    [this.metadataColumn()]: metadata as unknown as Json,
                })
                .eq('id', eventId);
        }

        // Queue for review (optional - inference results may not need review)
        // Convert inference data to ExtractedEventData format for review queue
        const extractedData: ExtractedEventData = {
            description: inferredDescription,
            tags: inferredTags,
        };
        await this.queueForReview(eventId, event, extractedData, tagChange);
    }
}

