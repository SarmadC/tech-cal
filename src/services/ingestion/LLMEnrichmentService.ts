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
} from '@/types/enrichment';
import { PlaywrightScraper } from './PlaywrightScraper';
import { getExtractionProvider } from './providers/ProviderFactory';
import type { FieldDiff } from './EventUpdateService';

const CONTENT_LIMIT = 100_000; // ~100KB
const MAX_RETRIES = 3;

type EventRow = {
    id: string;
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
};

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
            const provider = getExtractionProvider();
            const providerResult = await provider.extract({
                content,
                context: { sourceUrl, eventId, contentHash },
            });

            await this.persistSuccess(eventId, event, providerResult, metadata, contentHash);

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

        await this.queueForReview(eventId, event, providerResult.data);
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

    private async queueForReview(eventId: string, event: EventRow, data: ExtractedEventData): Promise<void> {
        const diffs = this.buildFieldDiffs(event, data);
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
}

