import { createHash } from 'crypto';
import { Readability } from '@mozilla/readability';
import { JSDOM, VirtualConsole } from 'jsdom';
import * as Sentry from '@sentry/nextjs';
import pLimit from 'p-limit';
import type { SupabaseClientType, Json } from '@/types';
import { cleanEventDescription } from '@/utils/ingestion/DescriptionCleaner';
import {
    type AgenticCrawlMetadata,
    type EnrichmentMetadata,
    type ExtractionProviderResult,
    type ExtractedAgendaItem,
    ExtractedEventDataSchema,
    type ExtractedEventData,
    type ExtractedSpeaker,
    type InferenceRequest,
    type InferenceProviderResult,
} from '@/types/enrichment';
import { PlaywrightScraper } from './PlaywrightScraper';
import { getExtractionProvider } from './providers/ProviderFactory';
import {
    DEFAULT_GEMINI_MODEL,
    GeminiExtractionProvider,
    normalizeExtractedProviderPayload,
} from './providers/GeminiExtractionProvider';
import { GeminiCrawlPlanner } from './providers/GeminiCrawlPlanner';
import { env } from '@/utils/env';
import type { FieldDiff } from './EventUpdateService';
import {
    buildReviewQueueSignature,
    isLlmEnrichmentReviewReason,
    LLM_ENRICHMENT_MERGED_REVIEW_REASON,
    LLM_ENRICHMENT_REVIEW_REASON,
    selectPendingInferenceCandidates,
    selectPendingScrapeCandidates,
    type QueueFieldSnapshot,
    type RelationReviewValue,
} from './utils/enrichmentQueue';
import {
    buildProviderDocuments,
    buildStructuredExtractedEventData,
    collectLinkedPageDocuments,
    DEFAULT_AGENTIC_VENDOR_HOST_ALLOWLIST,
    mergeExtractedEventData,
    type LinkedPageDocument,
} from './linkedPageExtraction';
import {
    AgenticCrawlService,
    type AgenticCrawlMode,
    type CoverageAssessment,
    assessExtractionCoverage,
    type CrawlPlanner,
} from './AgenticCrawlService';
import type { ExtractionProvider } from './providers/ExtractionProvider';

const CONTENT_LIMIT = 100_000; // ~100KB
const MAX_RETRIES = 3;
const CONCURRENT_LIMIT = 5; // Limit concurrent LLM API calls
const DEFAULT_BATCH_LIMIT = 25;
const CANDIDATE_FETCH_MULTIPLIER = 5;
const MIN_CANDIDATE_FETCH = 100;
const OPEN_REVIEW_QUEUE_STATUSES = ['pending', 'partially_approved'] as const;
const BROKEN_STYLESHEET_ERROR = 'Could not parse CSS stylesheet';

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
    created_at?: string | null;
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
    reviewOldValue: RelationReviewValue;
    reviewNewValue: RelationReviewValue;
};

type ReviewQueueRow = {
    id: string;
    status: string;
    created_at?: string | null;
    requires_review_reason?: string | null;
};

type ReviewQueueField = QueueFieldSnapshot & {
    id: string;
    field_status: string;
};

const ALLOWED_TAGS_TTL_MS = 5 * 60 * 1000; // 5 minutes
let allowedTagsCache: { tags: AllowedTag[]; fetchedAt: number } | null = null;

export interface EnrichmentJobResult {
    eventId: string;
    title?: string;
    status: 'enriched' | 'failed';
    error?: string;
}

export interface EnrichmentBatchResult {
    processed: number;
    succeeded: number;
    failed: number;
    results: EnrichmentJobResult[];
}

interface LLMEnrichmentServiceOptions {
    scraper?: PlaywrightScraper;
    provider?: string;
    model?: string;
    crawlPlanner?: CrawlPlanner;
    agenticCrawlMode?: AgenticCrawlMode;
}

interface DocumentExtractionResult {
    documents: LinkedPageDocument[];
    contentHash: string;
    providerResult: ExtractionProviderResult;
    data: ExtractedEventData;
}

interface AgenticCrawlResolution {
    finalExtraction?: DocumentExtractionResult;
    metadata: AgenticCrawlMetadata;
}

export const resolveSeedAllowedHosts = (
    sourceUrl: string,
    mode: AgenticCrawlMode,
): string[] | undefined => {
    if (mode === 'off') {
        return undefined;
    }

    return Array.from(
        new Set([
            new URL(sourceUrl).hostname,
            ...DEFAULT_AGENTIC_VENDOR_HOST_ALLOWLIST.map((host) => host.toString()),
        ])
    );
};

export class LLMEnrichmentService {
    private readonly scraper: PlaywrightScraper;

    private readonly providerOverride?: string;

    private readonly modelOverride?: string;

    private readonly crawlPlanner?: CrawlPlanner;

    private readonly agenticCrawlMode: AgenticCrawlMode;

    constructor(
        private readonly supabaseClient: SupabaseClientType,
        options: LLMEnrichmentServiceOptions = {},
    ) {
        this.scraper = options.scraper ?? new PlaywrightScraper();
        this.providerOverride = options.provider;
        this.modelOverride = options.model;
        this.crawlPlanner = options.crawlPlanner;
        this.agenticCrawlMode = options.agenticCrawlMode ?? this.resolveAgenticCrawlMode();
    }

    async processBatch(limit = DEFAULT_BATCH_LIMIT): Promise<EnrichmentBatchResult> {
        await this.resetStuckProcessing();
        const events = await this.fetchPendingEvents(limit);

        // Process events in parallel with concurrency limit
        const concurrencyLimiter = pLimit(CONCURRENT_LIMIT);
        const results = await Promise.all(
            events.map((event) =>
                concurrencyLimiter(() => this.processEvent(event.id))
            )
        );

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
        let eventTitle: string | undefined;

        try {
            const event = await this.fetchEvent(eventId);
            if (!event) {
                return { eventId, status: 'failed', error: 'Event not found' };
            }

            eventTitle = event.title ?? undefined;

            const sourceUrl = event.source_url;
            if (!sourceUrl) {
                await this.markFailed(eventId, event, 'Event is missing source_url');
                return { eventId, title: eventTitle, status: 'failed', error: 'Missing source_url' };
            }

            this.validateSourceUrl(sourceUrl);

            const metadata = this.normalizeMetadata(event);
            await this.markProcessing(eventId, metadata);

            const allowedHosts = resolveSeedAllowedHosts(sourceUrl, this.agenticCrawlMode);
            const scrape = await this.scraper.scrapeUrl(sourceUrl);
            const seedDocuments = await collectLinkedPageDocuments({
                sourceUrl,
                html: scrape.html,
                finalUrl: scrape.finalUrl,
                loadPage: async (url) => this.scraper.scrapeUrl(url),
                allowedHosts,
            });
            const allowedTags = await this.loadAllowedTags();
            const provider = getExtractionProvider(this.providerOverride, this.modelOverride);
            const initialExtraction = await this.extractFromDocuments(provider, seedDocuments, {
                sourceUrl,
                eventId,
                allowedTags: allowedTags.map((tag) => tag.name),
            });
            const coverageBefore = assessExtractionCoverage(initialExtraction.data, seedDocuments);
            const crawlResolution = await this.resolveAgenticCrawl({
                sourceUrl,
                eventId,
                documents: seedDocuments,
                initialExtraction,
                coverageBefore,
                provider,
                allowedTags: allowedTags.map((tag) => tag.name),
                allowedHosts: allowedHosts ?? [new URL(sourceUrl).hostname],
            });
            const finalExtraction = crawlResolution.finalExtraction ?? initialExtraction;

            await this.persistSuccess(
                eventId,
                event,
                {
                    ...finalExtraction.providerResult,
                    data: finalExtraction.data,
                },
                metadata,
                finalExtraction.contentHash,
                allowedTags,
                crawlResolution.metadata
            );

            return { eventId, title: eventTitle, status: 'enriched' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.markRetryOrFail(eventId, message);
            Sentry.captureException(error, { extra: { eventId } });
            return { eventId, title: eventTitle, status: 'failed', error: message };
        }
    }

    private async fetchPendingEvents(limit: number): Promise<EventRow[]> {
        const candidateLimit = Math.max(limit * CANDIDATE_FETCH_MULTIPLIER, MIN_CANDIDATE_FETCH);
        const { data, error } = await this.supabaseClient
            .from('events')
            .select(
                [
                    'id',
                    'title',
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
                    'start_time',
                    'difficulty_level',
                    'created_at',
                ].join(','),
            )
            .in(this.statusColumn(), ['pending', 'failed'])
            .order('created_at', { ascending: true })
            .limit(candidateLimit);

        if (error) {
            Sentry.captureException(error, { extra: { function: 'fetchPendingEvents', limit } });
            return [];
        }

        return selectPendingScrapeCandidates((data ?? []) as unknown as EventRow[], limit);
    }

    private async fetchEvent(eventId: string): Promise<EventRow | null> {
        const { data, error } = await this.supabaseClient
            .from('events')
            .select(
                [
                    'id',
                    'title',
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
                    'difficulty_level',
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

    private resolveAgenticCrawlMode(): AgenticCrawlMode {
        const configured = (process.env.LLM_ENRICHMENT_AGENTIC_CRAWL_MODE || 'off')
            .trim()
            .toLowerCase();

        if (configured === 'shadow' || configured === 'assist') {
            return configured;
        }

        return 'off';
    }

    private getCrawlPlanner(): CrawlPlanner | undefined {
        if (this.crawlPlanner) {
            return this.crawlPlanner;
        }

        if (this.agenticCrawlMode === 'off') {
            return undefined;
        }

        return new GeminiCrawlPlanner({
            apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY'),
            model: this.modelOverride || env('LLM_ENRICHMENT_MODEL', DEFAULT_GEMINI_MODEL),
        });
    }

    private async extractFromDocuments(
        provider: ExtractionProvider,
        documents: LinkedPageDocument[],
        options: {
            sourceUrl: string;
            eventId: string;
            allowedTags: string[];
        },
    ): Promise<DocumentExtractionResult> {
        const primaryContent = documents[0]?.content ?? '';
        const providerDocuments = buildProviderDocuments(documents.slice(1));
        const structuredData = buildStructuredExtractedEventData(documents);
        const content = [primaryContent, ...providerDocuments.map((document) => document.content)]
            .filter(Boolean)
            .join('\n\n');

        if (!content.trim()) {
            throw new Error('Unable to extract readable content from page');
        }

        const contentHash = this.hashContent(content);
        const providerResult = await provider.extract({
            content,
            context: { sourceUrl: options.sourceUrl, eventId: options.eventId, contentHash },
            model: this.modelOverride,
            allowedTags: options.allowedTags,
            documents: providerDocuments,
        });

        const mergedData = mergeExtractedEventData(structuredData, providerResult.data);
        const normalizedMergedData = normalizeExtractedProviderPayload(
            mergedData,
            options.allowedTags
        );
        const validatedData = ExtractedEventDataSchema.safeParse(normalizedMergedData);

        if (!validatedData.success) {
            const issues = validatedData.error.issues
                .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
                .join('; ');
            throw new Error(`Merged enrichment payload failed validation: ${issues}`);
        }

        return {
            documents,
            contentHash,
            providerResult,
            data: validatedData.data,
        };
    }

    private async resolveAgenticCrawl(options: {
        sourceUrl: string;
        eventId: string;
        documents: LinkedPageDocument[];
        initialExtraction: DocumentExtractionResult;
        coverageBefore: CoverageAssessment;
        provider: ExtractionProvider;
        allowedTags: string[];
        allowedHosts: string[];
    }): Promise<AgenticCrawlResolution> {
        const baseMetadata: AgenticCrawlMetadata = {
            crawl_strategy: 'deterministic_only',
            agent_invoked: false,
            agent_shadow_mode: this.agenticCrawlMode === 'shadow',
            coverage_score_before: options.coverageBefore.score,
            coverage_score_after: options.coverageBefore.score,
            escalation_reasons: options.coverageBefore.reasons,
            pages_crawled: 0,
            vendor_hosts_used: [],
            agent_trace: [],
        };

        if (this.agenticCrawlMode === 'off' || !options.coverageBefore.shouldEscalate) {
            return { metadata: baseMetadata };
        }

        const planner = this.getCrawlPlanner();
        if (!planner) {
            return { metadata: baseMetadata };
        }

        const crawlService = new AgenticCrawlService(planner);
        const crawlResult = await crawlService.augment({
            sourceUrl: options.sourceUrl,
            documents: options.documents,
            assessment: options.coverageBefore,
            allowedHosts: options.allowedHosts,
            loadPage: async (url) => this.scraper.scrapeUrl(url),
            observePage: async (candidate) =>
                this.scraper.observePage(candidate.pageUrl, {
                    selector: candidate.selector,
                    label: candidate.label,
                    actionType: candidate.actionType,
                }),
            assessCoverage: (documents) => {
                const structuredData = buildStructuredExtractedEventData(documents);
                const mergedCoverageData = mergeExtractedEventData(
                    structuredData,
                    options.initialExtraction.data
                );

                return assessExtractionCoverage(mergedCoverageData, documents);
            },
        });

        const metadata: AgenticCrawlMetadata = {
            crawl_strategy: 'hybrid_agent',
            agent_invoked: true,
            agent_shadow_mode: this.agenticCrawlMode === 'shadow',
            coverage_score_before: options.coverageBefore.score,
            coverage_score_after: options.coverageBefore.score,
            escalation_reasons: options.coverageBefore.reasons,
            pages_crawled: crawlResult.pagesCrawled,
            vendor_hosts_used: crawlResult.vendorHostsUsed,
            agent_trace: crawlResult.trace,
        };

        if (crawlResult.additionalDocuments.length === 0) {
            return { metadata };
        }

        const augmentedExtraction = await this.extractFromDocuments(
            options.provider,
            crawlResult.documents,
            {
                sourceUrl: options.sourceUrl,
                eventId: options.eventId,
                allowedTags: options.allowedTags,
            }
        );
        const coverageAfter = assessExtractionCoverage(
            augmentedExtraction.data,
            crawlResult.documents
        );
        metadata.coverage_score_after = coverageAfter.score;

        if (this.agenticCrawlMode === 'shadow') {
            return { metadata };
        }

        return {
            finalExtraction: augmentedExtraction,
            metadata,
        };
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
            agentic_crawl: metadata.agentic_crawl,
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
        crawlMetadata?: AgenticCrawlMetadata,
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
            next_retry_after: undefined,
            agentic_crawl: crawlMetadata,
        };

        await this.supabaseClient
            .from('events')
            .update({
                [this.statusColumn()]: 'enriched',
                [this.metadataColumn()]: metadata as unknown as Json,
            })
            .eq('id', eventId);

        const diffs = this.buildFieldDiffs(event, providerResult.data);
        const tagChange = await this.diffTags(eventId, providerResult.data.tags, allowedTags);
        if (tagChange) {
            diffs.push({
                fieldName: 'tags',
                oldValue: tagChange.reviewOldValue,
                newValue: tagChange.reviewNewValue,
                hasChanged: true,
            });
        }

        await this.queueForReview(eventId, diffs, {
            contentHash,
            previousContentHash: previousMetadata.content_hash,
        });
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
        const sanitizedHtml = this.stripNonContentMarkup(html);

        try {
            const virtualConsole = new VirtualConsole();
            virtualConsole.on('jsdomError', (error: Error) => {
                if (error.message.includes(BROKEN_STYLESHEET_ERROR)) {
                    return;
                }
                console.warn('[LLMEnrichmentService] JSDOM parse warning:', error.message);
            });

            const dom = new JSDOM(sanitizedHtml, { virtualConsole });
            const reader = new Readability(dom.window.document);
            const article = reader.parse();
            const text = (article?.textContent || dom.window.document.body?.textContent || '').trim();
            const sanitized = this.stripPii(text).replace(/\s+/g, ' ').trim();
            return this.truncate(sanitized, CONTENT_LIMIT);
        } catch (error) {
            const fallbackText = this.extractTextFallback(sanitizedHtml);
            if (!fallbackText) {
                Sentry.captureException(error, { extra: { function: 'extractReadableContent' } });
                return '';
            }

            return this.truncate(
                this.stripPii(fallbackText).replace(/\s+/g, ' ').trim(),
                CONTENT_LIMIT
            );
        }
    }

    private stripNonContentMarkup(html: string): string {
        return html
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
            .replace(/<canvas\b[^>]*>[\s\S]*?<\/canvas>/gi, ' ')
            .replace(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi, ' ');
    }

    private extractTextFallback(html: string): string {
        return html
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&#39;/gi, "'")
            .replace(/&quot;/gi, '"')
            .trim();
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

    private async diffTags(
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
            Sentry.captureException(existingError, { extra: { function: 'diffTags_existing', eventId } });
        }

        const oldTagIds = new Set<string>((existing || []).map(r => r.tag_id as string));

        const idToName = new Map<string, string>();
        allowedTags.forEach(tag => idToName.set(tag.id, tag.name));

        const oldIdsArr = Array.from(oldTagIds).sort();
        const newIdsArr = Array.from(newTagIds).sort();
        const addedIds = newIdsArr.filter(id => !oldTagIds.has(id));
        const removedIds = oldIdsArr.filter(id => !newTagIds.has(id));

        if (addedIds.length === 0 && removedIds.length === 0) {
            return null;
        }

        return {
            oldTagIds: oldIdsArr,
            newTagIds: newIdsArr,
            oldTagNames: oldIdsArr.map(id => idToName.get(id) || id),
            newTagNames: newIdsArr.map(id => idToName.get(id) || id),
            added: addedIds.map(id => idToName.get(id) || id),
            removed: removedIds.map(id => idToName.get(id) || id),
            reviewOldValue: {
                ids: oldIdsArr,
                labels: oldIdsArr.map(id => idToName.get(id) || id),
            },
            reviewNewValue: {
                ids: newIdsArr,
                labels: newIdsArr.map(id => idToName.get(id) || id),
            },
        };
    }

    private async queueForReview(
        eventId: string,
        diffs: FieldDiff[],
        options: { contentHash?: string; previousContentHash?: string } = {},
    ): Promise<void> {
        if (diffs.length === 0) {
            return;
        }

        const queueSignature = buildReviewQueueSignature(diffs);
        const recentQueues = await this.fetchRecentReviewQueues(eventId);
        const openQueues = recentQueues.filter((queue) =>
            OPEN_REVIEW_QUEUE_STATUSES.includes(queue.status as typeof OPEN_REVIEW_QUEUE_STATUSES[number])
        );
        const openQueue = openQueues.find((queue) => isLlmEnrichmentReviewReason(queue.requires_review_reason))
            ?? openQueues[0];

        if (openQueue) {
            const openFields = await this.fetchReviewQueueFields(openQueue.id);
            if (this.hasMatchingPendingSignature(openFields, diffs, queueSignature)) {
                await this.ensureMergedReviewQueueReason(openQueue);
                return;
            }

            await this.syncOpenReviewQueue(openQueue, openFields, diffs, {
                pruneMissingFields: openQueue.requires_review_reason === LLM_ENRICHMENT_REVIEW_REASON,
            });
            return;
        }

        const latestResolvedQueue = recentQueues.find((queue) =>
            !OPEN_REVIEW_QUEUE_STATUSES.includes(queue.status as typeof OPEN_REVIEW_QUEUE_STATUSES[number])
            && isLlmEnrichmentReviewReason(queue.requires_review_reason)
        );

        if (
            latestResolvedQueue
            && options.contentHash
            && options.previousContentHash
            && options.contentHash === options.previousContentHash
        ) {
            const previousFields = await this.fetchReviewQueueFields(latestResolvedQueue.id);
            const previousSignature = buildReviewQueueSignature(previousFields);
            if (previousSignature === queueSignature) {
                return;
            }
        }

        await this.createReviewQueue(eventId, diffs);
    }

    private async fetchRecentReviewQueues(eventId: string): Promise<ReviewQueueRow[]> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = this.supabaseClient as any;

        const { data, error } = await tableClient
            .from('event_update_queue')
            .select('id, status, created_at, requires_review_reason')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })
            .limit(25);

        if (error) {
            throw new Error(`Failed to fetch review queue entries: ${error.message}`);
        }

        return (data ?? []) as ReviewQueueRow[];
    }

    private async fetchReviewQueueFields(queueId: string): Promise<ReviewQueueField[]> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = this.supabaseClient as any;

        const { data, error } = await tableClient
            .from('event_update_queue_fields')
            .select('id, field_name, old_value, new_value, confidence, field_status')
            .eq('queue_id', queueId);

        if (error) {
            throw new Error(`Failed to fetch review queue fields: ${error.message}`);
        }

        return (data ?? []) as ReviewQueueField[];
    }

    private async syncOpenReviewQueue(
        queue: ReviewQueueRow,
        existingFields: ReviewQueueField[],
        diffs: FieldDiff[],
        options: { pruneMissingFields: boolean },
    ): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = this.supabaseClient as any;

        const pendingFields = existingFields.filter((field) => field.field_status === 'pending');
        const pendingByField = new Map(pendingFields.map((field) => [field.field_name, field]));
        const reviewedFieldNames = new Set(
            existingFields
                .filter((field) => field.field_status !== 'pending')
                .map((field) => field.field_name)
        );

        const updatePromises: Promise<unknown>[] = [];
        const deletePromises: Promise<unknown>[] = [];
        const fieldsToInsert: Array<{
            queue_id: string;
            field_name: string;
            old_value: unknown;
            new_value: unknown;
            field_status: 'pending';
            confidence: number | null;
        }> = [];

        for (const diff of diffs) {
            const existingPendingField = pendingByField.get(diff.fieldName);
            if (existingPendingField) {
                const existingSignature = buildReviewQueueSignature([
                    {
                        field_name: existingPendingField.field_name,
                        old_value: existingPendingField.old_value,
                        new_value: existingPendingField.new_value,
                        confidence: existingPendingField.confidence ?? null,
                    },
                ]);
                const nextSignature = buildReviewQueueSignature([
                    {
                        fieldName: diff.fieldName,
                        oldValue: diff.oldValue,
                        newValue: diff.newValue,
                        confidence: diff.confidence ?? undefined,
                    },
                ]);

                if (existingSignature !== nextSignature) {
                    updatePromises.push(
                        tableClient
                            .from('event_update_queue_fields')
                            .update({
                                old_value: diff.oldValue ?? null,
                                new_value: diff.newValue ?? null,
                                confidence: diff.confidence ?? null,
                            })
                            .eq('id', existingPendingField.id)
                    );
                }

                pendingByField.delete(diff.fieldName);
                continue;
            }

            if (reviewedFieldNames.has(diff.fieldName)) {
                continue;
            }

            fieldsToInsert.push({
                queue_id: queue.id,
                field_name: diff.fieldName,
                old_value: diff.oldValue ?? null,
                new_value: diff.newValue ?? null,
                field_status: 'pending',
                confidence: diff.confidence ?? null,
            });
        }

        if (options.pruneMissingFields) {
            for (const staleField of pendingByField.values()) {
                deletePromises.push(
                    tableClient
                        .from('event_update_queue_fields')
                        .delete()
                        .eq('id', staleField.id)
                );
            }
        }

        if (fieldsToInsert.length > 0) {
            updatePromises.push(
                tableClient
                    .from('event_update_queue_fields')
                    .insert(fieldsToInsert)
            );
        }

        const results = await Promise.all([...updatePromises, ...deletePromises]);
        const failedResult = results.find((result) => result && typeof result === 'object' && 'error' in result && result.error);
        if (failedResult && typeof failedResult === 'object' && 'error' in failedResult) {
            const errorMessage = failedResult.error instanceof Error
                ? failedResult.error.message
                : typeof failedResult.error === 'object' && failedResult.error && 'message' in failedResult.error
                    ? String(failedResult.error.message)
                    : 'Unknown error';
            throw new Error(`Failed to update review queue fields: ${errorMessage}`);
        }

        const queueUpdates: Record<string, unknown> = {};

        if (queue.status !== 'pending' && fieldsToInsert.length > 0) {
            queueUpdates.status = 'partially_approved';
            queueUpdates.reviewed_by = null;
            queueUpdates.reviewed_at = null;
        }

        if (!isLlmEnrichmentReviewReason(queue.requires_review_reason)) {
            queueUpdates.requires_review_reason = LLM_ENRICHMENT_MERGED_REVIEW_REASON;
        }

        if (Object.keys(queueUpdates).length > 0) {
            const { error } = await tableClient
                .from('event_update_queue')
                .update(queueUpdates)
                .eq('id', queue.id);

            if (error) {
                throw new Error(`Failed to refresh review queue status: ${error.message}`);
            }
        }
    }

    private async createReviewQueue(eventId: string, diffs: FieldDiff[]): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = this.supabaseClient as any;

        const { data: queueEntry, error: queueError } = await tableClient
            .from('event_update_queue')
            .insert({
                event_id: eventId,
                status: 'pending',
                requires_review_reason: LLM_ENRICHMENT_REVIEW_REASON,
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
            old_value: field.oldValue ?? null,
            new_value: field.newValue ?? null,
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

    private hasMatchingPendingSignature(
        existingFields: ReviewQueueField[],
        diffs: FieldDiff[],
        queueSignature: string,
    ): boolean {
        const diffFieldNames = new Set(diffs.map((diff) => diff.fieldName));
        const relevantPendingFields = existingFields.filter((field) =>
            field.field_status === 'pending' && diffFieldNames.has(field.field_name)
        );

        if (relevantPendingFields.length !== diffs.length) {
            return false;
        }

        return buildReviewQueueSignature(relevantPendingFields) === queueSignature;
    }

    private async ensureMergedReviewQueueReason(queue: ReviewQueueRow): Promise<void> {
        if (isLlmEnrichmentReviewReason(queue.requires_review_reason)) {
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = this.supabaseClient as any;
        const { error } = await tableClient
            .from('event_update_queue')
            .update({ requires_review_reason: LLM_ENRICHMENT_MERGED_REVIEW_REASON })
            .eq('id', queue.id);

        if (error) {
            throw new Error(`Failed to update review queue reason: ${error.message}`);
        }
    }

    private buildFieldDiffs(
        event: EventRow,
        data: ExtractedEventData,
        options: { difficultyLevel?: string | null } = {},
    ): FieldDiff[] {
        const diffs: FieldDiff[] = [];

        const pushDiff = (
            fieldName: string,
            oldValue: unknown,
            newValue: unknown,
        ) => {
            const hasChanged = JSON.stringify(oldValue ?? null) !== JSON.stringify(newValue ?? null);
            if (!hasChanged) return; // Skip unchanged fields entirely
            diffs.push({
                fieldName,
                oldValue,
                newValue,
                hasChanged,
            });
        };

        const normalizedDescription =
            cleanEventDescription(data.description) ?? data.description?.trim() ?? undefined;
        if (normalizedDescription) {
            pushDiff('description', event.description, normalizedDescription);
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
        if (options.difficultyLevel) {
            pushDiff('difficulty_level', event.difficulty_level, options.difficultyLevel);
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
            twitterUrl: speaker.twitterUrl,
            websiteUrl: speaker.websiteUrl,
        }));
    }

    private toAgendaItems(agenda: ExtractedAgendaItem[]) {
        return agenda.map((item) => ({
            title: item.title,
            start_time: item.startTime ?? null,
            end_time: item.endTime ?? null,
            description: item.description ?? null,
            location: item.location ?? null,
            track: item.track ?? null,
            topics: item.topics ?? [],
            day_number: item.dayNumber ?? null,
            agenda_type: item.agendaType ?? null,
            difficulty_level: item.difficultyLevel ?? null,
            capacity: item.capacity ?? null,
            prerequisites: item.prerequisites ?? null,
            is_required: item.isRequired ?? null,
            duration_minutes: item.durationMinutes ?? null,
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
    async processInferenceBatch(limit = DEFAULT_BATCH_LIMIT): Promise<EnrichmentBatchResult> {
        const events = await this.fetchEventsForInference(limit);

        // Process events in parallel with concurrency limit
        const concurrencyLimiter = pLimit(CONCURRENT_LIMIT);
        const results = await Promise.all(
            events.map((event) =>
                concurrencyLimiter(() => this.processEventInference(event.id))
            )
        );

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
        let eventTitle: string | undefined;

        try {
            const event = await this.fetchEventForInference(eventId);
            if (!event) {
                return { eventId, status: 'failed', error: 'Event not found' };
            }

            eventTitle = event.title ?? undefined;

            if (!event.title) {
                return { eventId, title: eventTitle, status: 'failed', error: 'Event is missing title' };
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

            return { eventId, title: eventTitle, status: 'enriched' };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            await this.markRetryOrFail(eventId, message);
            Sentry.captureException(error, { extra: { eventId, mode: 'inference' } });
            return { eventId, title: eventTitle, status: 'failed', error: message };
        }
    }

    /**
     * Fetch events that need inference (missing description or tags)
     */
    private async fetchEventsForInference(limit: number): Promise<EventRowWithRelations[]> {
        const candidateLimit = Math.max(limit * CANDIDATE_FETCH_MULTIPLIER, MIN_CANDIDATE_FETCH);
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
                created_at,
                event_type:event_type_id (name),
                organizer:organizer_id (name)
            `)
            .eq('status', 'confirmed')
            .or('description.is.null,description.eq.')
            .not('title', 'is', null)
            .order('created_at', { ascending: true })
            .limit(candidateLimit);

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
        const filteredEvents = ((data ?? []) as unknown as EventRowWithRelations[]).filter(event => {
            const hasDescription = event.description && event.description.trim().length > 0;
            const hasTags = eventsWithTags.has(event.id);
            return !hasDescription || !hasTags;
        });

        return selectPendingInferenceCandidates(filteredEvents, limit);
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
        const model = this.modelOverride || env('LLM_ENRICHMENT_MODEL', DEFAULT_GEMINI_MODEL);
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
        const inferredTags = Array.isArray(inferenceResult.data.tags)
            ? inferenceResult.data.tags
                .filter(tag => typeof tag === 'string')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0)
            : undefined;
        const extractedData: ExtractedEventData = {
            description: inferenceResult.data.description ?? undefined,
            tags: inferredTags,
        };
        const contentHash = this.hashContent(JSON.stringify({
            title: event.title,
            eventType: event.event_type?.name ?? null,
            organizer: event.organizer?.name ?? null,
            location: event.location ?? null,
            startTime: event.start_time ?? null,
            extractedData,
            difficultyLevel: inferenceResult.data.difficultyLevel ?? null,
        }));
        const metadata: EnrichmentMetadata = {
            ...previousMetadata,
            enrichment_source: 'llm',
            llm_model: inferenceResult.model,
            enriched_data: extractedData,
            completed_at: now,
            retry_count: previousMetadata.retry_count,
            content_hash: contentHash,
            tokens_used: inferenceResult.tokensUsed,
            last_error: undefined,
            next_retry_after: undefined,
        };

        await this.supabaseClient
            .from('events')
            .update({
                [this.statusColumn()]: 'enriched',
                [this.metadataColumn()]: metadata as unknown as Json,
            })
            .eq('id', eventId);

        const diffs = this.buildFieldDiffs(event, extractedData, {
            difficultyLevel: inferenceResult.data.difficultyLevel ?? undefined,
        });
        const tagChange = await this.diffTags(eventId, inferredTags, allowedTags);
        if (tagChange) {
            diffs.push({
                fieldName: 'tags',
                oldValue: tagChange.reviewOldValue,
                newValue: tagChange.reviewNewValue,
                hasChanged: true,
            });
        }

        await this.queueForReview(eventId, diffs, {
            contentHash,
            previousContentHash: previousMetadata.content_hash,
        });
    }
}
