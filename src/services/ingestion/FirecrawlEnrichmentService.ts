/**
 * Firecrawl Enrichment Service
 * 
 * Automatically enriches events during ingestion using Firecrawl API.
 * Uses async queue pattern to avoid blocking ingestion pipeline.
 */

import Firecrawl from '@mendable/firecrawl-js';
import type { SupabaseClientType } from '@/types';
import type { Json } from '@/types/supabase';
import type {
    FirecrawlEnrichmentStatus,
    FirecrawlEnrichmentMetadata,
    ExtractedEventData,
    EventAgendaSchema,
    EventSpeakersSchema,
    EventDailyScheduleEntry,
    FirecrawlScrapeResponse,
    FirecrawlExtractResponse,
} from '@/types/firecrawl';
import { EventEnrichmentService, type SpeakerInput, type AgendaItemInput } from './EventEnrichmentService';
import { EventUpdateService, type FieldDiff } from './EventUpdateService';
import { FirecrawlSiteAnalyzer, type SiteAnalysis, type ScheduleLinkDetail } from './FirecrawlSiteAnalyzer';
import {
    normalizeDescription,
    normalizeAgenda,
    normalizeSpeakers,
    normalizePricing,
    mergeExtractedData,
    calculateQualityScore,
} from './FirecrawlDataNormalizer';
import { extractionPrompts, getSemanticEventSchema } from './FirecrawlExtractionPrompts';
import {
    FIRECRAWL_CONFIG,
    RETRY_CONFIG,
    FIRECRAWL_TIMEOUT_MULTIPLIERS,
    FIRECRAWL_EXTRACT_CONFIG,
    TECHMEME_SCHEDULE_CONFIG,
} from '@/config/ingestionConstants';
import { normalizeUrl, resolveTechMemeRedirect, isTechMemeRedirect } from './utils/urlResolver';
import * as Sentry from '@sentry/nextjs';
import {
    normalizeTimezone,
    parsePriceRangeText,
    parseLocalTime,
    deriveEndTime,
    parseDurationMinutes,
    normalizeSpeakerName,
    buildSpeakerKey,
} from '@/utils/ingestion/ExtractNormalization';
import { MultiTrackScheduleFetcher } from './scheduleFetchers/MultiTrackScheduleFetcher';
import { RulesFirstExtractionService } from './RulesFirstExtractionService';
import { BudgetGuardService } from './BudgetGuardService';

/**
 * Create a timeout promise that rejects after the specified duration
 */
function createTimeoutPromise<T>(timeoutMs: number, operation: string): Promise<T> {
    return new Promise<T>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Firecrawl ${operation} timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });
}

// Get configuration from environment
function getConfig() {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    const enabled = process.env.FIRECRAWL_ENABLED !== 'false'; // Default: true
    const timeout = parseInt(
        process.env.FIRECRAWL_TIMEOUT_MS || String(FIRECRAWL_CONFIG.DEFAULT_TIMEOUT_MS),
        10
    );
    const concurrency = parseInt(
        process.env.FIRECRAWL_CONCURRENCY || String(FIRECRAWL_CONFIG.DEFAULT_CONCURRENCY),
        10
    );

    return {
        apiKey,
        enabled: enabled && !!apiKey,
        timeout,
        concurrency,
    };
}

// Check if URL should be blocked
function isBlockedDomain(url: string): boolean {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
        return FIRECRAWL_CONFIG.BLOCKED_DOMAINS.some(domain => domain === hostname);
    } catch {
        return false;
    }
}

const resolveMetadataUrl = (metadata?: MetadataRecord): string | undefined => {
    if (!metadata) {
        return undefined;
    }

    const directUrl = metadata['url'];
    if (typeof directUrl === 'string' && directUrl.trim().length > 0) {
        return directUrl;
    }

    if (typeof metadata.ogUrl === 'string' && metadata.ogUrl.trim().length > 0) {
        return metadata.ogUrl;
    }

    const sourceUrl = metadata['sourceURL'];
    if (typeof sourceUrl === 'string' && sourceUrl.trim().length > 0) {
        return sourceUrl;
    }

    return undefined;
};

const QUALITY_THRESHOLD_REVIEW = 0.85;
const QUALITY_THRESHOLD_MODERATION = 0.6;
const RULES_FIRST_CONFIDENCE_THRESHOLD = 0.7;

const isFeatureFlagEnabled = (value: string | undefined): boolean => {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return !(normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'disabled');
};

interface ExtractStrategyParams {
    primarySourceUrl: string;
    primaryRegistrationUrl?: string | null;
    siteAnalysis: SiteAnalysis;
    semanticSchema: Record<string, unknown> | null;
    extractionPrompt: string;
    priorityUrls: string[];
    techMemeCandidates: string[];
    scheduleLinks: string[];
    useScheduleChunks: boolean;
}

interface ExtractStrategyResult {
    sourceResult: FirecrawlScrapeResponse;
    sourcePages: Array<{
        url: string;
        markdown?: string;
        html?: string;
        json?: unknown;
        metadata?: Record<string, unknown>;
    }>;
    pagesProcessed: number;
    creditsUsed: number;
    extractUrls: string[];
    usedScheduleLinks: string[];
    remainingScheduleLinks: string[];
}

type ExtractApiResult = FirecrawlExtractResponse & { status?: string };
type MetadataRecord = NonNullable<NonNullable<FirecrawlScrapeResponse['data']>['metadata']>;
type JsonPayload = Record<string, unknown>;

type ExistingEventRow = {
    start_time?: string | null;
    end_time?: string | null;
    daily_schedule?: Record<string, unknown> | null;
    timezone?: string | null;
    description?: string | null;
    location?: string | null;
    virtual_platform?: string | null;
    status?: string | null;
    event_format?: string | null;
    registration_url?: string | null;
    agenda_url?: string | null;
    target_audience?: string | null;
    language?: string | null;
    difficulty_level?: string | null;
    price_min?: number | null;
    price_max?: number | null;
    currency?: string | null;
    pricing_type?: string | null;
    event_image_url?: string | null;
    ingestion_provenance?: Record<string, unknown> | null;
    venue_id?: string | null;
    title?: string | null;
};

/**
 * Firecrawl client adapter with retry and timeout handling
 */
class FirecrawlClientAdapter {
    private client: Firecrawl | null = null;
    private config: ReturnType<typeof getConfig> | null = null;

    /**
     * Get or initialize the Firecrawl client (lazy initialization)
     */
    private getClient(): Firecrawl | null {
        // Re-check config on each call in case env vars were loaded after module import
        if (!this.config) {
            this.config = getConfig();
        } else {
            // Re-check config to handle cases where env vars are loaded late
            const currentConfig = getConfig();
            if (currentConfig.apiKey !== this.config.apiKey || currentConfig.enabled !== this.config.enabled) {
                this.config = currentConfig;
                this.client = null; // Reset client if config changed
            }
        }

        if (!this.client && this.config.enabled && this.config.apiKey) {
            this.client = new Firecrawl({ apiKey: this.config.apiKey });
        }

        return this.client;
    }

    /**
     * Extract structured data from one or more URLs using the /extract endpoint
     * This endpoint handles crawling and extraction in a single call
     */
    async extractFromUrls(
        urls: string[],
        jsonSchema: Record<string, unknown> | null,
        prompt: string | null
    ): Promise<{ success: boolean; data?: unknown; error?: string; creditsUsed?: number; status?: string }> {
        const client = this.getClient();
        if (!client) {
            return {
                success: false,
                error: 'Firecrawl client not initialized (missing API key or disabled)',
            };
        }

        if (!urls || urls.length === 0) {
            return {
                success: false,
                error: 'No URLs provided for extraction',
            };
        }

        try {
            const config = this.config || getConfig();
            // Extract endpoint can take longer, especially with multiple URLs
            const extractTimeout = config.timeout * FIRECRAWL_TIMEOUT_MULTIPLIERS.EXTRACT * 2;
            const timeoutPromise = createTimeoutPromise<ExtractApiResult>(extractTimeout, 'extract');

            const extractOptions: Record<string, unknown> = {};
            if (jsonSchema) {
                extractOptions.schema = jsonSchema;
            }
            if (prompt) {
                extractOptions.prompt = prompt;
            }

            const extractPromise = client.extract(
                urls,
                extractOptions as Parameters<Firecrawl['extract']>[1]
            );

            const raceResult = await Promise.race([extractPromise, timeoutPromise]);
            const result = raceResult as ExtractApiResult;

            // Handle both synchronous (direct result) and async (job status) responses
            if (result.status === 'processing') {
                return {
                    success: false,
                    error: 'Extract job is still processing',
                    status: 'processing',
                };
            }

            if (!result.success) {
                return {
                    success: false,
                    error: result.error || 'Extract failed',
                    status: result.status,
                };
            }

            return {
                success: true,
                data: result.data,
                creditsUsed: result.creditsUsed,
                status: result.status || 'completed',
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(
                `[FirecrawlEnrichmentService] Extract failed for URLs ${urls.join(', ')}:`,
                errorMessage
            );

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    isEnabled(): boolean {
        const config = this.config || getConfig();
        return config.enabled;
    }
}

// Singleton client adapter
const firecrawlClient = new FirecrawlClientAdapter();

export class FirecrawlEnrichmentService {
    private static isTechMemeExperimentEnabled(): boolean {
        return isFeatureFlagEnabled(process.env.FIRECRAWL_TECHMEME_EXPERIMENT);
    }

    /**
     * Enqueue event for Firecrawl enrichment
     * Marks event as pending and stores initial metadata
     */
    static async enqueueEnrichment(
        eventId: string,
        sourceUrl: string,
        registrationUrl: string | null | undefined,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        const config = getConfig();

        // Early exit if disabled or no API key
        if (!config.enabled) {
            console.log(`[FirecrawlEnrichmentService] Enrichment disabled or no API key. enabled=${config.enabled}, hasApiKey=${!!config.apiKey}`);
            return;
        }

        console.log(`[FirecrawlEnrichmentService] Enqueueing enrichment for event ${eventId}, sourceUrl=${sourceUrl}`);

        // Don't block TechMeme URLs upfront - let Firecrawl follow redirects
        // We'll check the final URL after scraping

        try {
            // Mark as pending
            await this.updateEnrichmentStatus(
                eventId,
                'pending',
                {
                    attempted_at: new Date().toISOString(),
                    retry_count: 0,
                },
                null,
                supabaseClient
            );
            console.log(`[FirecrawlEnrichmentService] Enqueued enrichment for event ${eventId}`);
        } catch (error) {
            console.error(`[FirecrawlEnrichmentService] Failed to enqueue enrichment for event ${eventId}:`, error);
            // Don't throw - enrichment is non-critical
        }
    }

    /**
     * Process single enrichment job
     * Called by background worker
     */
    static async processEnrichment(
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        const config = getConfig();

        if (!config.enabled) {
            return { success: false, error: 'Firecrawl enrichment is disabled' };
        }

        // Fetch event data (including description and other fields for normalization)
        const { data: event, error: fetchError } = await supabaseClient
            .from('events')
            .select('id, source_url, registration_url, description, firecrawl_enrichment_metadata, ingestion_source_id')
            .eq('id', eventId)
            .single();

        if (fetchError || !event) {
            return { success: false, error: `Event not found: ${fetchError?.message || 'Unknown'}` };
        }

        // Check retry count and exponential backoff
        const metadata = (event.firecrawl_enrichment_metadata as FirecrawlEnrichmentMetadata) || {};
        const retryCount = metadata.retry_count || 0;
        const sourceEventRef = (event.ingestion_source_id as string | null) ?? null;

        const legacyProcessed = Array.isArray(metadata.schedule_links_used) ? metadata.schedule_links_used : [];
        const legacyPending = Array.isArray(metadata.schedule_links_remaining) ? metadata.schedule_links_remaining : [];

        const processedScheduleLinks = Array.isArray(metadata.schedule_links_processed)
            ? metadata.schedule_links_processed
            : legacyProcessed;

        const pendingScheduleLinks = Array.isArray(metadata.schedule_links_pending)
            ? metadata.schedule_links_pending
            : legacyPending;

        const cachedScheduleLinks = Array.from(new Set([...processedScheduleLinks, ...pendingScheduleLinks]));
        const cachedScheduleDetails = Array.isArray(metadata.schedule_link_details)
            ? (metadata.schedule_link_details as ScheduleLinkDetail[])
            : undefined;

        if (retryCount >= RETRY_CONFIG.MAX_ATTEMPTS_FIRECRAWL) {
            await this.updateEnrichmentStatus(
                eventId,
                'failed',
                {
                    ...metadata,
                    completed_at: new Date().toISOString(),
                    error_message: `Max retry attempts (${RETRY_CONFIG.MAX_ATTEMPTS_FIRECRAWL}) exceeded`,
                    retry_count: retryCount,
                },
                `Max retry attempts (${RETRY_CONFIG.MAX_ATTEMPTS_FIRECRAWL}) exceeded`,
                supabaseClient
            );
            return { success: false, error: 'Max retry attempts exceeded' };
        }

        // Check exponential backoff - if next_retry_at is set and hasn't passed, skip
        if (metadata.next_retry_at) {
            const nextRetryAt = new Date(metadata.next_retry_at);
            const now = new Date();
            if (now < nextRetryAt) {
                // Not time to retry yet, skip this event
                return {
                    success: false,
                    error: `Retry scheduled for ${nextRetryAt.toISOString()}, skipping for now`,
                };
            }
        }

        const nextMetadata: FirecrawlEnrichmentMetadata = {
            ...metadata,
            attempted_at: new Date().toISOString(),
            retry_count: retryCount + 1,
        };

        const { data: claimedEvent, error: claimError } = await supabaseClient
            .from('events')
            .update({
                firecrawl_enrichment_status: 'in_progress',
                firecrawl_enrichment_metadata: nextMetadata as Json,
            })
            .eq('id', eventId)
            .eq('firecrawl_enrichment_status', 'pending')
            .select('id')
            .single();

        if (claimError) {
            console.error(`[FirecrawlEnrichmentService] Failed to claim event ${eventId} for enrichment:`, claimError);
            return { success: false, error: `Failed to mark event ${eventId} as in_progress` };
        }

        if (!claimedEvent) {
            return { success: false, error: 'Another worker claimed this job' };
        }

        const extractionStartedAt = Date.now();
        let creditsUsedForLog = 0;
        let primarySourceForLog: string | null = null;
        let primaryDomainForLog: string | undefined;

        try {
            // Get URLs from event and derive effective targets for Firecrawl
            const sourceUrl = event.source_url as string;
            const registrationUrl = event.registration_url as string | null | undefined;

            if (!sourceUrl) {
                throw new Error(`Event has no source_url: ${eventId}`);
            }

            let primarySourceUrl = sourceUrl;
            primarySourceForLog = sourceUrl;
            const techMemeSourceCandidates = isTechMemeRedirect(sourceUrl)
                ? resolveTechMemeRedirect(sourceUrl)
                : [];

            if (techMemeSourceCandidates.length > 0) {
                primarySourceUrl = techMemeSourceCandidates[0];
                console.log(
                    `[FirecrawlEnrichmentService] Resolved TechMeme source redirect for event ${eventId}: ${sourceUrl} -> ${primarySourceUrl}`
                );
            }

            let primaryRegistrationUrl = registrationUrl;
            if (registrationUrl && isTechMemeRedirect(registrationUrl)) {
                const registrationCandidates = resolveTechMemeRedirect(registrationUrl);
                if (registrationCandidates.length > 0) {
                    primaryRegistrationUrl = registrationCandidates[0];
                    console.log(
                        `[FirecrawlEnrichmentService] Resolved TechMeme registration redirect for event ${eventId}: ${registrationUrl} -> ${primaryRegistrationUrl}`
                    );
                }
            }

            console.log(
                `[FirecrawlEnrichmentService] Processing enrichment for event ${eventId}, originalSource=${sourceUrl}, effectiveSource=${primarySourceUrl}`
            );

            primaryDomainForLog = (() => {
                try {
                    return new URL(primarySourceUrl).hostname.replace(/^www\./, '');
                } catch {
                    return undefined;
                }
            })();
            primarySourceForLog = primarySourceUrl;

            const isTechMemeSource = techMemeSourceCandidates.length > 0 || isTechMemeRedirect(sourceUrl);
            const useTechMemeFlow = isTechMemeSource && this.isTechMemeExperimentEnabled();

            // Use semantic event schema from FirecrawlExtractionPrompts when TechMeme flow is enabled
            const semanticSchema = useTechMemeFlow ? getSemanticEventSchema() : null;

            // Analyze site complexity and determine strategy
            const siteAnalysis = await FirecrawlSiteAnalyzer.analyze(
                primarySourceUrl,
                primaryRegistrationUrl || undefined,
                {
                    cachedScheduleLinks,
                    cachedScheduleDetails,
                }
            );
            console.log(
                `[FirecrawlEnrichmentService] Site analysis for ${primarySourceUrl}: complexity=${siteAnalysis.complexity}, strategy=${siteAnalysis.strategy}, needsMultiPage=${siteAnalysis.needsMultiPageCrawl}, relatedPages=${siteAnalysis.relatedPages.length}`
            );

            let sourceResult: FirecrawlScrapeResponse | null = null;
            let sourcePages: Array<{ url: string; markdown?: string; html?: string; json?: unknown }> = [];
            let pagesScraped = 1;
            let creditsUsed = 0;
            const allPriorityUrls: string[] = [...(siteAnalysis.priorityPages || [])];
            const extractionPrompt = useTechMemeFlow
                ? extractionPrompts.techMemeExtract
                : extractionPrompts.contextualFallback;

            const allScheduleLinks = siteAnalysis.scheduleLinks;
            const basePendingLinks = pendingScheduleLinks.length > 0
                ? pendingScheduleLinks
                : allScheduleLinks.filter((link) => !processedScheduleLinks.includes(link));

            let updatedProcessedLinks = [...processedScheduleLinks];
            let updatedPendingLinks = [...basePendingLinks];
            let scheduleNextCursor: string | null = updatedPendingLinks[0] ?? metadata.schedule_next_cursor ?? null;
            const previousScheduleCredits = typeof metadata.schedule_credits_used === 'number'
                ? metadata.schedule_credits_used
                : 0;
            const previousAutoRetryCount = metadata.schedule_auto_retry_count ?? 0;

            const scheduleQueue = basePendingLinks.slice(0, TECHMEME_SCHEDULE_CONFIG.MAX_TOTAL_LINKS);

            const extractResult = await this.runExtractStrategy({
                primarySourceUrl,
                primaryRegistrationUrl,
                siteAnalysis,
                semanticSchema,
                extractionPrompt,
                priorityUrls: allPriorityUrls,
                techMemeCandidates: techMemeSourceCandidates,
                scheduleLinks: useTechMemeFlow ? scheduleQueue : [],
                useScheduleChunks: useTechMemeFlow,
            });

            sourceResult = extractResult.sourceResult;
            sourcePages = extractResult.sourcePages;
            pagesScraped = extractResult.pagesProcessed;
            creditsUsed = typeof extractResult.creditsUsed === 'number' ? extractResult.creditsUsed : pagesScraped;
            creditsUsedForLog = creditsUsed;
            const extractUrls = extractResult.extractUrls;
            let usedScheduleLinks = Array.from(new Set(extractResult.usedScheduleLinks));
            const totalScheduleCredits = Math.min(
                previousScheduleCredits + creditsUsed,
                TECHMEME_SCHEDULE_CONFIG.MAX_CREDITS_PER_EVENT
            );

            const newlyProcessedLinks = usedScheduleLinks.filter(
                (link) => !processedScheduleLinks.includes(link)
            );
            updatedProcessedLinks = Array.from(new Set([...updatedProcessedLinks, ...newlyProcessedLinks]));
            const remainingQueuedLinks = scheduleQueue.filter((link) => !usedScheduleLinks.includes(link));
            const notQueuedLinks = basePendingLinks.filter((link) => !scheduleQueue.includes(link));
            updatedPendingLinks = Array.from(new Set([...remainingQueuedLinks, ...notQueuedLinks]));
            scheduleNextCursor = updatedPendingLinks.length > 0 ? updatedPendingLinks[0] : null;

            console.log(
                `[FirecrawlEnrichmentService] Source enrichment for ${primarySourceUrl}: strategy=extract, pages=${pagesScraped}, credits=${creditsUsed}, has_json=${!!sourceResult.data?.json}`
            );

            // Extract final URLs from Firecrawl metadata (after redirects)
            // Firecrawl follows redirects automatically
            // Priority: metadata.url (final destination) > metadata.ogUrl > metadata.sourceURL (original URL) > fallback
            // Note: sourceURL is the original URL we passed, while url/ogUrl is the final destination after redirects
            // Safely extract final URLs from Firecrawl metadata (after redirects)
            const finalSourceUrl =
                resolveMetadataUrl(sourceResult?.data?.metadata as MetadataRecord | undefined) ||
                primarySourceUrl;
            const finalRegistrationUrl = primaryRegistrationUrl || null;

            // Log redirect chain
            if (finalSourceUrl !== primarySourceUrl) {
                console.log(`[FirecrawlEnrichmentService] Redirect chain for source URL: ${primarySourceUrl} -> ${finalSourceUrl}`);
            }
            if (primaryRegistrationUrl && finalRegistrationUrl && finalRegistrationUrl !== primaryRegistrationUrl) {
                console.log(`[FirecrawlEnrichmentService] Redirect chain for registration URL: ${primaryRegistrationUrl} -> ${finalRegistrationUrl}`);
            }

            // Check if final URLs are in blocklist
            if (isBlockedDomain(finalSourceUrl)) {
                await this.updateEnrichmentStatus(
                    eventId,
                    'skipped',
                    {
                        attempted_at: metadata.attempted_at || new Date().toISOString(),
                        error_message: `Final URL after redirect is in blocked domain list: ${finalSourceUrl}`,
                        original_urls: {
                            source_url: sourceUrl,
                            registration_url: registrationUrl || null,
                        },
                        effective_urls: {
                            source_url: primarySourceUrl,
                            registration_url: primaryRegistrationUrl || null,
                        },
                        resolved_urls: {
                            source_url: finalSourceUrl,
                            registration_url: finalRegistrationUrl,
                        },
                        retry_count: retryCount + 1,
                    },
                    null,
                    supabaseClient
                );
                return { success: false, error: 'Blocked domain' };
            }

            // Extract and merge data
            const existingDescription = (event.description as string) || undefined;

            let rulesFirstResult: Awaited<ReturnType<typeof RulesFirstExtractionService.extractFromUrl>> | null = null;
            try {
                rulesFirstResult = await RulesFirstExtractionService.extractFromUrl(
                    primarySourceUrl,
                    {
                        minConfidence: RULES_FIRST_CONFIDENCE_THRESHOLD - 0.1,
                    },
                    supabaseClient
                );
            } catch (rulesError) {
                console.warn(
                    `[FirecrawlEnrichmentService] Rules-first extraction failed for ${primarySourceUrl}:`,
                    rulesError
                );
                Sentry.captureException(rulesError, {
                    extra: { function: 'rulesFirstExtraction', eventId, sourceUrl: primarySourceUrl },
                });
            }

            if (rulesFirstResult) {
                nextMetadata.rules_first = {
                    confidence: rulesFirstResult.confidence,
                    field_confidence: rulesFirstResult.fieldConfidence,
                    content_hash: rulesFirstResult.contentHash,
                    normalized_url: rulesFirstResult.normalizedUrl,
                    normalized_url_hash: rulesFirstResult.normalizedUrlHash,
                    source_domain: rulesFirstResult.sourceDomain,
                    status_code: rulesFirstResult.statusCode,
                    cache_hit: rulesFirstResult.cacheHit ?? false,
                    fallback: !(
                        rulesFirstResult.success &&
                        (rulesFirstResult.confidence ?? 0) >= RULES_FIRST_CONFIDENCE_THRESHOLD
                    ),
                    reason: !rulesFirstResult.success
                        ? rulesFirstResult.error || 'rules_first_failed'
                        : (rulesFirstResult.confidence ?? 0) < RULES_FIRST_CONFIDENCE_THRESHOLD
                        ? 'confidence_below_threshold'
                        : undefined,
                };
            }

            if (
                rulesFirstResult?.success &&
                rulesFirstResult.data &&
                (rulesFirstResult.confidence ?? 0) >= RULES_FIRST_CONFIDENCE_THRESHOLD
            ) {
                console.log(
                    `[FirecrawlEnrichmentService] Rules-first extraction succeeded for ${primarySourceUrl} (confidence=${(rulesFirstResult.confidence ?? 0).toFixed(2)})`
                );

                const mergedRulesData = mergeExtractedData([rulesFirstResult.data]);
                const normalizedRulesData: ExtractedEventData = {
                    ...mergedRulesData,
                    description: normalizeDescription(mergedRulesData.description, existingDescription),
                    agenda: mergedRulesData.agenda ? normalizeAgenda(mergedRulesData.agenda) : undefined,
                    speakers: mergedRulesData.speakers ? normalizeSpeakers(mergedRulesData.speakers) : undefined,
                    pricing: mergedRulesData.pricing ? normalizePricing(mergedRulesData.pricing) : undefined,
                };

                const { fieldsUpdated, fieldDiffs } = await this.updateEventFields(
                    eventId,
                    normalizedRulesData,
                    supabaseClient
                );

                const uniqueFieldsUpdated = Array.from(new Set(fieldsUpdated));
                const qualityScore = calculateQualityScore(normalizedRulesData);
                const ingestionConfidence = Math.max(rulesFirstResult.confidence ?? 0, qualityScore);

                await supabaseClient
                    .from('events')
                    .update({ ingestion_confidence: ingestionConfidence })
                    .eq('id', eventId);

                if (fieldDiffs.length > 0 && uniqueFieldsUpdated.length > 0 && sourceEventRef) {
                    const autoUpdateResult = await EventUpdateService.logAutoUpdate(
                        eventId,
                        sourceEventRef,
                        uniqueFieldsUpdated,
                        supabaseClient
                    );
                    if (!autoUpdateResult.success) {
                        console.warn(
                            `[FirecrawlEnrichmentService] Failed to log auto-update (rules-first) for event ${eventId}: ${autoUpdateResult.error}`
                        );
                    }
                }

                await this.logExtractionJob({
                    supabaseClient,
                    eventId,
                    sourceUrl: primarySourceUrl,
                    normalizedUrl: rulesFirstResult.normalizedUrl ?? primarySourceUrl,
                    sourceDomain: rulesFirstResult.sourceDomain ?? primaryDomainForLog ?? null,
                    firecrawlUsed: false,
                    firecrawlCredits: 0,
                    decision: 'rules_first_success',
                    status: 'completed',
                    confidence: rulesFirstResult.confidence,
                    metadata: {
                        fieldConfidence: rulesFirstResult.fieldConfidence,
                        cacheHit: rulesFirstResult.cacheHit ?? false,
                    },
                    startedAt: new Date(extractionStartedAt),
                    durationMs: Date.now() - extractionStartedAt,
                });

                const rulesMetadata: FirecrawlEnrichmentMetadata = {
                    ...nextMetadata,
                    attempted_at: nextMetadata.attempted_at || new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    retry_count: retryCount + 1,
                    enrichment_strategy: 'rules_first',
                    credits_used: 0,
                    extraction_quality_score: qualityScore,
                    ingestion_confidence: ingestionConfidence,
                    fields_updated: uniqueFieldsUpdated,
                    rules_first: {
                        confidence: rulesFirstResult.confidence,
                        field_confidence: rulesFirstResult.fieldConfidence,
                        content_hash: rulesFirstResult.contentHash,
                        normalized_url: rulesFirstResult.normalizedUrl,
                        normalized_url_hash: rulesFirstResult.normalizedUrlHash,
                        source_domain: rulesFirstResult.sourceDomain,
                        status_code: rulesFirstResult.statusCode,
                        cache_hit: rulesFirstResult.cacheHit ?? false,
                        fallback: false,
                    },
                };

                await this.updateEnrichmentStatus(
                    eventId,
                    'completed',
                    rulesMetadata,
                    null,
                    supabaseClient
                );

                return { success: true };
            }

            if (rulesFirstResult) {
                await this.logExtractionJob({
                    supabaseClient,
                    eventId,
                    sourceUrl: primarySourceUrl,
                    normalizedUrl: rulesFirstResult.normalizedUrl ?? primarySourceUrl,
                    sourceDomain: rulesFirstResult.sourceDomain ?? primaryDomainForLog ?? null,
                    firecrawlUsed: false,
                    firecrawlCredits: 0,
                    decision: 'rules_first_fallback',
                    status: 'skipped',
                    confidence: rulesFirstResult.confidence,
                    metadata: {
                        fieldConfidence: rulesFirstResult.fieldConfidence,
                        cacheHit: rulesFirstResult.cacheHit ?? false,
                    },
                    startedAt: new Date(extractionStartedAt),
                    durationMs: Date.now() - extractionStartedAt,
                });
            }

            const budgetCheck = await BudgetGuardService.check(supabaseClient, {
                sourceDomain: primaryDomainForLog,
                creditsRequested: FIRECRAWL_CONFIG.ESTIMATED_CREDITS_PER_RUN,
            });

            if (!budgetCheck.allow) {
                const budgetMetadata: FirecrawlEnrichmentMetadata = {
                    ...nextMetadata,
                    attempted_at: nextMetadata.attempted_at || new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    retry_count: retryCount + 1,
                    enrichment_strategy: 'skipped_budget',
                    credits_used: 0,
                    error_message: budgetCheck.reason || 'Budget cap exceeded',
                    rules_first: nextMetadata.rules_first,
                };

                await this.updateEnrichmentStatus(
                    eventId,
                    'skipped',
                    budgetMetadata,
                    budgetCheck.reason || 'Budget cap exceeded',
                    supabaseClient
                );

                await this.logExtractionJob({
                    supabaseClient,
                    eventId,
                    sourceUrl: primarySourceUrl,
                    normalizedUrl: primarySourceUrl,
                    sourceDomain: primaryDomainForLog ?? null,
                    firecrawlUsed: false,
                    firecrawlCredits: 0,
                    decision: budgetCheck.reason || 'budget_cap',
                    status: 'skipped',
                    metadata: {
                        usage: budgetCheck.usage,
                    },
                    startedAt: new Date(extractionStartedAt),
                    durationMs: Date.now() - extractionStartedAt,
                });

                return { success: false, error: budgetCheck.reason || 'Budget cap exceeded' };
            }

            const normalizedExtractedData = this.extractEventFields(
                sourceResult,
                sourcePages.length > 0 ? sourcePages : undefined,
                existingDescription
            );

            const primaryHost = (() => {
                try {
                    return new URL(primarySourceUrl).hostname;
                } catch {
                    return '';
                }
            })();

            if (useTechMemeFlow && siteAnalysis.isMultiTrack && (!normalizedExtractedData.agenda || normalizedExtractedData.agenda.length === 0)) {
                try {
                    const scheduleDetails = siteAnalysis.scheduleLinkDetails.filter((detail) =>
                        !updatedProcessedLinks.includes(detail.url)
                    );

                    const fallbackResult = await MultiTrackScheduleFetcher.fetch({
                        domain: primaryHost,
                        scheduleLinks: scheduleDetails.length > 0 ? scheduleDetails : siteAnalysis.scheduleLinkDetails,
                        limit: TECHMEME_SCHEDULE_CONFIG.MAX_AGENDA_ITEMS_PER_EVENT,
                        startingLink: scheduleNextCursor,
                        scheduleHints: siteAnalysis.scheduleHints,
                    });

                    if (fallbackResult.agenda.length > 0) {
                        normalizedExtractedData.agenda = fallbackResult.agenda;
                    }

                    if (fallbackResult.processedLinks.length > 0) {
                        usedScheduleLinks = Array.from(new Set([...usedScheduleLinks, ...fallbackResult.processedLinks]));
                        updatedProcessedLinks = Array.from(
                            new Set([...updatedProcessedLinks, ...fallbackResult.processedLinks])
                        );
                        updatedPendingLinks = updatedPendingLinks.filter(
                            (link) => !fallbackResult.processedLinks.includes(link)
                        );
                        scheduleNextCursor = updatedPendingLinks.length > 0 ? updatedPendingLinks[0] : null;
                    }
                } catch (error) {
                    console.warn('[FirecrawlEnrichmentService] Multi-track schedule fallback failed:', error);
                }
            }
            
            console.log(`[FirecrawlEnrichmentService] Extracted data for ${eventId}:`, {
                hasDescription: !!normalizedExtractedData.description,
                descriptionLength: normalizedExtractedData.description?.length || 0,
                startTime: normalizedExtractedData.startTime || 'not found',
                endTime: normalizedExtractedData.endTime || 'not found',
                agendaCount: normalizedExtractedData.agenda?.length || 0,
                speakersCount: normalizedExtractedData.speakers?.length || 0,
                hasPricing: !!normalizedExtractedData.pricing,
                hasImage: !!normalizedExtractedData.imageUrl,
                hasVenue: !!normalizedExtractedData.venue,
                dailyScheduleEntries: normalizedExtractedData.dailySchedule?.length || 0,
            });

            // Update event fields
            const { fieldsUpdated, fieldDiffs } = await this.updateEventFields(
                eventId,
                normalizedExtractedData,
                supabaseClient
            );

            // Update source_url and registration_url with final URLs from Firecrawl (after redirects)
            const urlUpdates: Record<string, string> = {};
            const { data: existingEvent } = await supabaseClient
                .from('events')
                .select('source_url, registration_url')
                .eq('id', eventId)
                .single();

            const existingSourceUrl = existingEvent?.source_url as string;
            const existingRegistrationUrl = (existingEvent?.registration_url as string) || null;

            if (finalSourceUrl !== existingSourceUrl) {
                urlUpdates.source_url = finalSourceUrl;
                fieldsUpdated.push('source_url');
            }
            if (finalRegistrationUrl && finalRegistrationUrl !== existingRegistrationUrl) {
                urlUpdates.registration_url = finalRegistrationUrl;
                fieldsUpdated.push('registration_url');
            }

            if (Object.keys(urlUpdates).length > 0) {
                await supabaseClient
                    .from('events')
                    .update(urlUpdates)
                    .eq('id', eventId);
                console.log(`[FirecrawlEnrichmentService] Updated URLs for event ${eventId}:`, urlUpdates);
            }

            const uniqueFieldsUpdated = Array.from(new Set(fieldsUpdated));

            // Calculate quality score with agenda coverage awareness
            const qualityScore = calculateQualityScore(normalizedExtractedData);
            const remainingScheduleLinks = Array.from(new Set([...updatedPendingLinks]));
            metadata.schedule_links_processed = updatedProcessedLinks;
            metadata.schedule_links_pending = remainingScheduleLinks;
            metadata.schedule_next_cursor = scheduleNextCursor;
            metadata.schedule_link_details = siteAnalysis.scheduleLinkDetails;
            metadata.schedule_hints = siteAnalysis.scheduleHints;
            metadata.schedule_credits_used = totalScheduleCredits;
            const partialAgendaCoverage = remainingScheduleLinks.length > 0;
            const ingestionConfidence = partialAgendaCoverage
                ? Math.min(qualityScore, 0.45)
                : qualityScore;
            const reviewConfidence = Number(ingestionConfidence.toFixed(2));
            const requiresModeration = ingestionConfidence < QUALITY_THRESHOLD_MODERATION;
            const requiresFieldReview = !requiresModeration && ingestionConfidence < QUALITY_THRESHOLD_REVIEW;
            const canRetryByCredits = totalScheduleCredits < TECHMEME_SCHEDULE_CONFIG.MAX_CREDITS_PER_EVENT;
            const canRetryByAttempts = previousAutoRetryCount < TECHMEME_SCHEDULE_CONFIG.MAX_AUTO_RETRY_ATTEMPTS;
            const shouldAutoRetry = partialAgendaCoverage && canRetryByCredits && canRetryByAttempts;
            if (shouldAutoRetry) {
                metadata.schedule_auto_retry_count = previousAutoRetryCount + 1;
            } else {
                metadata.schedule_auto_retry_count = previousAutoRetryCount;
            }

            if (partialAgendaCoverage && !shouldAutoRetry) {
                const partialDiff: FieldDiff = {
                    fieldName: 'agenda_partial',
                    oldValue: null,
                    newValue: {
                        remainingScheduleLinks,
                        processed: usedScheduleLinks,
                    },
                    hasChanged: true,
                    confidence: ingestionConfidence,
                };

                if (sourceEventRef) {
                    const queueResult = await EventUpdateService.queueForReview(
                        eventId,
                        sourceEventRef,
                        [partialDiff],
                        supabaseClient
                    );

                    if (!queueResult.success) {
                        console.warn(
                            `[FirecrawlEnrichmentService] Failed to queue agenda partial coverage for event ${eventId}: ${queueResult.error}`
                        );
                    }
                }
            }

            await supabaseClient
                .from('events')
                .update({ ingestion_confidence: ingestionConfidence })
                .eq('id', eventId);

            if (fieldDiffs.length > 0 && useTechMemeFlow) {
                if (requiresModeration) {
                    try {
                        await supabaseClient
                            .from('event_moderation_queue')
                            .insert({
                                source_event_id: eventId,
                                event_id: eventId,
                                ingestion_quality_score: ingestionConfidence,
                                reason_codes: ['low_confidence_extract'],
                                status: 'pending',
                            });
                        console.log(
                            `[FirecrawlEnrichmentService] Queued event ${eventId} for moderation (confidence=${ingestionConfidence.toFixed(2)})`
                        );
                    } catch (moderationError) {
                        console.warn(
                            `[FirecrawlEnrichmentService] Failed to queue moderation for event ${eventId}:`,
                            moderationError
                        );
                    }
                } else if (requiresFieldReview) {
                    const reviewDiffs: FieldDiff[] = fieldDiffs.map((diff) => ({
                        ...diff,
                        confidence: reviewConfidence,
                    }));
                    if (sourceEventRef) {
                        const reviewResult = await EventUpdateService.queueForReview(
                            eventId,
                            sourceEventRef,
                            reviewDiffs,
                            supabaseClient
                        );
                        if (reviewResult.success) {
                            console.log(
                                `[FirecrawlEnrichmentService] Enqueued ${reviewDiffs.length} fields for review (event ${eventId}, confidence=${ingestionConfidence.toFixed(2)})`
                            );
                        } else {
                            console.warn(
                                `[FirecrawlEnrichmentService] Failed to queue field review for event ${eventId}: ${reviewResult.error}`
                            );
                        }
                    }
                } else if (uniqueFieldsUpdated.length > 0) {
                    if (sourceEventRef) {
                        const autoUpdateResult = await EventUpdateService.logAutoUpdate(
                            eventId,
                            sourceEventRef,
                            uniqueFieldsUpdated,
                            supabaseClient
                        );
                        if (!autoUpdateResult.success) {
                            console.warn(
                                `[FirecrawlEnrichmentService] Failed to log auto-update for event ${eventId}: ${autoUpdateResult.error}`
                            );
                        }
                    }
                }
            } else if (fieldDiffs.length > 0 && uniqueFieldsUpdated.length > 0) {
                if (sourceEventRef) {
                    const autoUpdateResult = await EventUpdateService.logAutoUpdate(
                        eventId,
                        sourceEventRef,
                        uniqueFieldsUpdated,
                        supabaseClient
                    );
                    if (!autoUpdateResult.success) {
                        console.warn(
                            `[FirecrawlEnrichmentService] Failed to log auto-update for event ${eventId}: ${autoUpdateResult.error}`
                        );
                    }
                }
            }

            // Update status to completed
            const autoRetryDelayMs = TECHMEME_SCHEDULE_CONFIG.AUTO_RETRY_DELAY_MS;
            const finalStatus: FirecrawlEnrichmentStatus = shouldAutoRetry ? 'pending' : 'completed';
            const finalMetadata: FirecrawlEnrichmentMetadata = {
                ...metadata,
                attempted_at: metadata.attempted_at || new Date().toISOString(),
                completed_at: shouldAutoRetry ? undefined : new Date().toISOString(),
                urls_scraped: extractUrls,
                original_urls: {
                    source_url: sourceUrl,
                    registration_url: registrationUrl || null,
                },
                effective_urls: {
                    source_url: primarySourceUrl,
                    registration_url: primaryRegistrationUrl || null,
                },
                resolved_urls: {
                    source_url: finalSourceUrl,
                    registration_url: finalRegistrationUrl,
                },
                schedule_links_processed: updatedProcessedLinks,
                schedule_links_pending: remainingScheduleLinks,
                schedule_link_details: siteAnalysis.scheduleLinkDetails,
                schedule_next_cursor: scheduleNextCursor,
                schedule_hints: siteAnalysis.scheduleHints,
                schedule_auto_retry_count: metadata.schedule_auto_retry_count,
                schedule_credits_used: totalScheduleCredits,
                fields_updated: uniqueFieldsUpdated,
                retry_count: retryCount + 1,
                enrichment_strategy: 'extract',
                site_complexity: siteAnalysis.complexity,
                pages_crawled: pagesScraped,
                credits_used: creditsUsed,
                extraction_quality_score: qualityScore,
                ingestion_confidence: ingestionConfidence,
                partial_coverage: partialAgendaCoverage ? 'agenda' : undefined,
                next_retry_at: shouldAutoRetry
                    ? new Date(Date.now() + autoRetryDelayMs).toISOString()
                    : undefined,
            };

            await this.updateEnrichmentStatus(
                eventId,
                finalStatus,
                finalMetadata,
                null,
                supabaseClient
            );

            if (shouldAutoRetry) {
                console.log(
                    `[FirecrawlEnrichmentService] Auto-requeued multi-track agenda fetch for event ${eventId} (retry #${metadata.schedule_auto_retry_count})`
                );
            }

            const logStatus: 'completed' | 'skipped' =
                finalStatus === 'completed' ? 'completed' : 'skipped';

            await this.logExtractionJob({
                supabaseClient,
                eventId,
                sourceUrl: primarySourceUrl,
                normalizedUrl: finalSourceUrl,
                sourceDomain: primaryDomainForLog ?? null,
                firecrawlUsed: true,
                firecrawlCredits: creditsUsedForLog,
                decision: 'firecrawl_extract',
                status: logStatus,
                confidence: ingestionConfidence,
                metadata: {
                    fieldsUpdated: uniqueFieldsUpdated,
                    qualityScore,
                    scheduleLinksUsed: usedScheduleLinks,
                    scheduleLinksPending: remainingScheduleLinks,
                },
                startedAt: new Date(extractionStartedAt),
                durationMs: Date.now() - extractionStartedAt,
            });

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Update status to failed (will retry if under max attempts)
            await this.updateEnrichmentStatus(
                eventId,
                'failed',
                {
                    ...metadata,
                    completed_at: new Date().toISOString(),
                    error_message: errorMessage,
                    retry_count: retryCount + 1,
                },
                errorMessage,
                supabaseClient
            );

            // Calculate exponential backoff for next retry
            const now = new Date();
            const delay = Math.min(
                RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, retryCount),
                RETRY_CONFIG.MAX_DELAY_MS
            );
            const nextRetryAt = new Date(now.getTime() + delay);

            // Reset to pending for retry (if under max) with exponential backoff
            if (retryCount + 1 < RETRY_CONFIG.MAX_ATTEMPTS_FIRECRAWL) {
                await this.updateEnrichmentStatus(
                    eventId,
                    'pending',
                    {
                        ...metadata,
                        retry_count: retryCount + 1,
                        next_retry_at: nextRetryAt.toISOString(),
                    },
                    null,
                    supabaseClient
                );
            }

            await this.logExtractionJob({
                supabaseClient,
                eventId,
                sourceUrl: primarySourceForLog ?? (event.source_url as string),
                normalizedUrl: primarySourceForLog ?? (event.source_url as string),
                sourceDomain: primaryDomainForLog ?? null,
                firecrawlUsed: true,
                firecrawlCredits: creditsUsedForLog || 0,
                decision: 'firecrawl_failed',
                status: 'failed',
                metadata: {
                    error: errorMessage,
                },
                startedAt: new Date(extractionStartedAt),
                durationMs: Date.now() - extractionStartedAt,
                error: errorMessage,
            });

            return { success: false, error: errorMessage };
        }
    }

    private static async logExtractionJob(params: {
        supabaseClient: SupabaseClientType;
        eventId: string;
        sourceUrl: string;
        normalizedUrl?: string;
        sourceDomain?: string | null;
        adapter?: string | null;
        firecrawlUsed: boolean;
        firecrawlCredits?: number;
        decision: string;
        status: 'completed' | 'skipped' | 'failed';
        confidence?: number;
        metadata?: Record<string, unknown>;
        startedAt?: Date;
        durationMs?: number;
        error?: string | null;
    }): Promise<void> {
        const {
            supabaseClient,
            eventId,
            sourceUrl,
            normalizedUrl,
            sourceDomain,
            adapter,
            firecrawlUsed,
            firecrawlCredits,
            decision,
            status,
            confidence,
            metadata,
            startedAt,
            durationMs,
            error,
        } = params;

        try {
            await supabaseClient
                .from('extraction_job_log')
                .insert({
                    event_id: eventId,
                    source_url: sourceUrl,
                    normalized_url: normalizedUrl ?? sourceUrl,
                    source_domain: sourceDomain ?? null,
                    adapter: adapter ?? null,
                    firecrawl_used: firecrawlUsed,
                    firecrawl_credits_spent: firecrawlCredits ?? null,
                    decision,
                    status,
                    confidence: confidence ?? null,
                    metadata: metadata ? (metadata as Json) : null,
                    started_at: startedAt?.toISOString() ?? new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    duration_ms: durationMs ?? null,
                    error: error ? ({ message: error } as Json) : null,
                });
        } catch (logError) {
            console.warn(
                '[FirecrawlEnrichmentService] Failed to log extraction job:',
                logError
            );
        }
    }

    static async fetchDescriptionPreview(
        sourceUrl: string,
        registrationUrl?: string | null,
        existingDescription?: string
    ): Promise<{ description: string; creditsUsed: number } | null> {
        const config = getConfig();

        if (!config.enabled) {
            return null;
        }

        if (!sourceUrl) {
            return null;
        }

        try {
            let primarySourceUrl = sourceUrl;
            const techMemeSourceCandidates = isTechMemeRedirect(sourceUrl)
                ? resolveTechMemeRedirect(sourceUrl)
                : [];
            if (techMemeSourceCandidates.length > 0) {
                primarySourceUrl = techMemeSourceCandidates[0];
            }

            let primaryRegistrationUrl = registrationUrl ?? null;
            if (registrationUrl && isTechMemeRedirect(registrationUrl)) {
                const registrationCandidates = resolveTechMemeRedirect(registrationUrl);
                if (registrationCandidates.length > 0) {
                    primaryRegistrationUrl = registrationCandidates[0];
                }
            }

            const siteAnalysis = await FirecrawlSiteAnalyzer.analyze(
                primarySourceUrl,
                primaryRegistrationUrl || undefined,
                {
                    cachedScheduleLinks: [],
                    cachedScheduleDetails: [],
                }
            );

            const isTechMemeSource =
                techMemeSourceCandidates.length > 0 || isTechMemeRedirect(sourceUrl);
            const useTechMemeFlow = isTechMemeSource && this.isTechMemeExperimentEnabled();

            const extractResult = await this.runExtractStrategy({
                primarySourceUrl,
                primaryRegistrationUrl,
                siteAnalysis,
                semanticSchema: useTechMemeFlow ? getSemanticEventSchema() : null,
                extractionPrompt: useTechMemeFlow
                    ? extractionPrompts.techMemeExtract
                    : extractionPrompts.contextualFallback,
                priorityUrls: siteAnalysis.priorityPages || [],
                techMemeCandidates: techMemeSourceCandidates,
                scheduleLinks: [],
                useScheduleChunks: false,
            });

            const finalSourceUrl =
                resolveMetadataUrl(
                    extractResult.sourceResult.data?.metadata as MetadataRecord | undefined
                ) || primarySourceUrl;

            if (isBlockedDomain(finalSourceUrl)) {
                return null;
            }

            const extractedData = this.extractEventFields(
                extractResult.sourceResult,
                extractResult.sourcePages,
                existingDescription
            );

            const candidateDescription = extractedData.description?.trim();

            if (!candidateDescription) {
                return null;
            }

            if (
                existingDescription &&
                candidateDescription.toLowerCase() === existingDescription.trim().toLowerCase()
            ) {
                return null;
            }

            return {
                description: candidateDescription,
                creditsUsed:
                    typeof extractResult.creditsUsed === 'number' ? extractResult.creditsUsed : 0,
            };
        } catch (error) {
            console.warn('[FirecrawlEnrichmentService] Description preview failed:', error);
            Sentry.captureException(error, {
                extra: { function: 'fetchDescriptionPreview', sourceUrl },
            });
            return null;
        }
    }

    private static async runExtractStrategy(params: ExtractStrategyParams): Promise<ExtractStrategyResult> {
        const extractUrls = this.buildExtractUrlList(
            params.primarySourceUrl,
            params.primaryRegistrationUrl,
            params.priorityUrls,
            params.techMemeCandidates,
            params.scheduleLinks,
            {
                useScheduleChunks: params.useScheduleChunks,
                trackLimit: TECHMEME_SCHEDULE_CONFIG.MAX_TRACK_LINKS,
                totalLimit: TECHMEME_SCHEDULE_CONFIG.MAX_TOTAL_LINKS,
            }
        );

        const extractResult = await firecrawlClient.extractFromUrls(
            extractUrls,
            params.semanticSchema,
            params.extractionPrompt
        );

        if (!extractResult.success || !extractResult.data) {
            throw new Error(
                `Firecrawl extract failed for ${params.primarySourceUrl}: ${
                    extractResult.error || extractResult.status || 'unknown error'
                }`
            );
        }

        const { merged, pages } = this.flattenExtractResults(extractResult.data, params.primarySourceUrl);
        if (!merged && pages.length === 0) {
            throw new Error(`Firecrawl extract returned no structured data for ${params.primarySourceUrl}`);
        }

        const representative = merged || pages[0]?.json;
        if (!representative) {
            throw new Error(`Firecrawl extract produced empty payload for ${params.primarySourceUrl}`);
        }

        const usablePages =
            pages.length > 0
                ? pages
                : [
                      {
                          url: params.primarySourceUrl,
                          json: representative,
                      },
                  ];

        const representativeMetadata =
            (usablePages[0]?.metadata as Record<string, unknown> | undefined) ?? undefined;
        const metadataPayload: Record<string, unknown> = representativeMetadata ? { ...representativeMetadata } : {};
        if (!metadataPayload.url && usablePages[0]?.url) {
            metadataPayload.url = usablePages[0]?.url;
        }

        const sourceResult: FirecrawlScrapeResponse = {
            success: true,
            data: {
                json: representative,
                metadata: Object.keys(metadataPayload).length > 0 ? metadataPayload : { url: params.primarySourceUrl },
            },
            creditsUsed: extractResult.creditsUsed,
        };

        const normalizeForComparison = (url: string) => {
            try {
                return normalizeUrl(url) || url;
            } catch {
                return url;
            }
        };

        const normalizedSchedule = new Set(
            params.scheduleLinks.map((link) => normalizeForComparison(link))
        );
        const usedScheduleLinks = extractUrls.filter((url) =>
            normalizedSchedule.has(normalizeForComparison(url))
        );
        const usedScheduleNormalized = new Set(usedScheduleLinks.map((url) => normalizeForComparison(url)));
        const remainingScheduleLinks = params.scheduleLinks.filter(
            (link) => !usedScheduleNormalized.has(normalizeForComparison(link))
        );

        return {
            sourceResult,
            sourcePages: usablePages,
            pagesProcessed: usablePages.length,
            creditsUsed: extractResult.creditsUsed || usablePages.length,
            extractUrls,
            usedScheduleLinks,
            remainingScheduleLinks,
        };
    }

    private static buildExtractUrlList(
        primarySourceUrl: string,
        primaryRegistrationUrl: string | null | undefined,
        priorityUrls: string[],
        techMemeCandidates: string[],
        scheduleLinks: string[],
        options?: {
            useScheduleChunks?: boolean;
            trackLimit?: number;
            totalLimit?: number;
        }
    ): string[] {
        const urls: string[] = [];
        const seen = new Set<string>();
        const maxUrls = Math.min(
            FIRECRAWL_EXTRACT_CONFIG.MAX_URLS,
            options?.totalLimit ?? FIRECRAWL_EXTRACT_CONFIG.MAX_URLS
        );
        const addCandidate = (candidate?: string | null) => {
            if (!candidate) {
                return;
            }
            try {
                const normalized = normalizeUrl(candidate);
                if (!normalized || seen.has(normalized)) {
                    return;
                }
                if (urls.length >= maxUrls) {
                    return;
                }
                urls.push(candidate);
                seen.add(normalized);
            } catch {
                // Ignore invalid URLs
            }
        };

        addCandidate(primarySourceUrl);

        addCandidate(primaryRegistrationUrl);

        for (const candidate of priorityUrls) {
            if (urls.length >= maxUrls) break;
            addCandidate(candidate);
        }

        for (const candidate of techMemeCandidates) {
            if (urls.length >= maxUrls) break;
            addCandidate(candidate);
        }

        if (options?.useScheduleChunks && scheduleLinks.length > 0 && urls.length < maxUrls) {
            const lowerSchedule = scheduleLinks.map((link) => link.toLowerCase());
            const baseScheduleIndex = lowerSchedule.findIndex(link => !link.includes('track='));
            const baseScheduleLink = baseScheduleIndex >= 0 ? scheduleLinks[baseScheduleIndex] : scheduleLinks[0];
            addCandidate(baseScheduleLink);

            const trackLinks = scheduleLinks
                .filter((link) => link !== baseScheduleLink)
                .filter((link) => link.toLowerCase().includes('track=') || link.toLowerCase().includes('/track'))
                .slice(0, options.trackLimit ?? TECHMEME_SCHEDULE_CONFIG.MAX_TRACK_LINKS);

            for (const trackLink of trackLinks) {
                if (urls.length >= maxUrls) break;
                addCandidate(trackLink);
            }
        }

        return urls.slice(0, maxUrls);
    }

    private static flattenExtractResults(
        rawData: unknown,
        fallbackUrl: string
    ): {
        merged?: ExtractedEventData;
        pages: Array<{ url: string; markdown?: string; html?: string; json?: unknown; metadata?: Record<string, unknown> }>;
    } {
        const pages: Array<{
            url: string;
            markdown?: string;
            html?: string;
            json?: unknown;
            metadata?: Record<string, unknown>;
        }> = [];
        const payloads: ExtractedEventData[] = [];

        const pushEntry = (urlCandidate: unknown, data: unknown, metadata?: unknown) => {
            if (!data || typeof data !== 'object') {
                return;
            }
            const url =
                typeof urlCandidate === 'string' && urlCandidate.trim().length > 0
                    ? urlCandidate
                    : fallbackUrl;
            const typed = data as ExtractedEventData;
            payloads.push(typed);
            pages.push({
                url,
                json: typed,
                metadata: metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>) : undefined,
            });
        };

        const processValue = (value: unknown) => {
            if (Array.isArray(value)) {
                value.forEach(processValue);
                return;
            }

            if (value && typeof value === 'object') {
                const record = value as { url?: unknown; data?: unknown; metadata?: unknown };
                if (record.data && typeof record.data === 'object') {
                    pushEntry(record.url, record.data, record.metadata);
                } else {
                    pushEntry(record.url, record, record.metadata);
                }
            }
        };

        const candidate = rawData as { results?: unknown; data?: unknown };
        processValue(candidate.results);
        processValue(candidate.data);

        if (pages.length === 0) {
            processValue(rawData);
        }

        const merged =
            payloads.length === 0
                ? undefined
                : payloads.length === 1
                ? payloads[0]
                : mergeExtractedData(payloads);

        return { merged, pages };
    }

    /**
     * Extract event fields from Firecrawl responses
     * Enhanced to handle multi-page data and normalize field values
     */
    private static extractEventFields(
        sourceResult: FirecrawlScrapeResponse | null,
        sourcePages?: Array<{ url: string; markdown?: string; html?: string; json?: unknown; metadata?: Record<string, unknown> }>,
        existingDescription?: string
    ): ExtractedEventData {
        const extracted: ExtractedEventData = {};
        const payloads: JsonPayload[] = [];

        const pushPayload = (payload: unknown) => {
            if (payload && typeof payload === 'object') {
                payloads.push(payload as JsonPayload);
            }
        };

        if (sourceResult?.success && sourceResult.data?.json) {
            pushPayload(sourceResult.data.json);
        }

        sourcePages?.forEach((page) => pushPayload(page.json));

        if (payloads.length > 0) {
            let jsonDescription: string | undefined;

            payloads.forEach((payload) => {
                const eventNode = (payload.event as Record<string, unknown> | undefined) ?? undefined;
                const eventRecord = eventNode as Record<string, unknown> | undefined;

                if (!extracted.title) {
                    const titleCandidate =
                        (eventNode?.title as string | undefined) ||
                        (payload.title as string | undefined);
                    if (titleCandidate && titleCandidate.trim().length > 0) {
                        extracted.title = titleCandidate.trim();
                    }
                }

                if (!extracted.startTime) {
                    const startCandidate =
                        (eventNode?.startDateTime as string | undefined) ||
                        (payload.startTime as string | undefined);
                    if (typeof startCandidate === 'string') {
                        extracted.startTime = startCandidate;
                    }
                }

                if (!extracted.endTime) {
                    const endCandidate =
                        (eventNode?.endDateTime as string | undefined) ||
                        (payload.endTime as string | undefined);
                    if (typeof endCandidate === 'string') {
                        extracted.endTime = endCandidate;
                    }
                }

                if (!extracted.timezone) {
                    const tzCandidate = (eventNode?.timezone as string | undefined) || (payload.timezone as string | undefined);
                    if (tzCandidate && tzCandidate.trim().length > 0) {
                        extracted.timezone = tzCandidate.trim();
                    }
                }

                if (!extracted.status && typeof eventNode?.status === 'string') {
                    extracted.status = eventNode.status.trim();
                }

                if (!extracted.format && typeof eventNode?.format === 'string') {
                    extracted.format = eventNode.format.trim();
                }

                if (!extracted.registrationUrl && typeof eventNode?.registrationUrl === 'string') {
                    extracted.registrationUrl = eventNode.registrationUrl.trim();
                }

                if (!extracted.agendaUrl && typeof eventNode?.agendaUrl === 'string') {
                    extracted.agendaUrl = eventNode.agendaUrl.trim();
                }

                if (!extracted.language && typeof eventNode?.language === 'string') {
                    extracted.language = eventNode.language.trim();
                }

                if (!extracted.difficulty && typeof eventNode?.difficulty === 'string') {
                    extracted.difficulty = eventNode.difficulty.trim();
                }

                if (!extracted.targetAudience && typeof eventNode?.targetAudience === 'string') {
                    extracted.targetAudience = eventNode.targetAudience.trim();
                }

                if (!extracted.tags && Array.isArray(eventNode?.tags)) {
                    const tags = (eventNode?.tags as unknown[])
                        .filter((tag): tag is string => typeof tag === 'string')
                        .map((tag) => tag.trim())
                        .filter((tag) => tag.length > 0);
                    if (tags.length > 0) {
                        extracted.tags = Array.from(new Set(tags));
                    }
                }

                if (!extracted.location) {
                    const locationNode = eventNode?.location as
                        | { venue?: string; address?: string; city?: string; country?: string; virtualPlatform?: string }
                        | undefined;
                    if (locationNode) {
                        extracted.location = {
                            venue: typeof locationNode.venue === 'string' ? locationNode.venue.trim() : undefined,
                            address: typeof locationNode.address === 'string' ? locationNode.address.trim() : undefined,
                            city: typeof locationNode.city === 'string' ? locationNode.city.trim() : undefined,
                            country: typeof locationNode.country === 'string' ? locationNode.country.trim() : undefined,
                            virtualPlatform:
                                typeof locationNode.virtualPlatform === 'string'
                                    ? locationNode.virtualPlatform.trim()
                                    : undefined,
                        };
                    }
                }

                if (!jsonDescription) {
                    const descriptionCandidate =
                        (eventNode?.description as string | undefined) ||
                        (payload.description as string | undefined);
                    if (descriptionCandidate && descriptionCandidate.trim().length > 0) {
                        jsonDescription = descriptionCandidate;
                    }
                }

                if (!extracted.imageUrl) {
                    const imageCandidate =
                        (eventNode?.imageUrl as string | undefined) ||
                        (payload.imageUrl as string | undefined) ||
                        (payload as { image_url?: unknown }).image_url ||
                        (payload as { heroImage?: unknown }).heroImage ||
                        (payload as { hero_image?: unknown }).hero_image;
                    if (typeof imageCandidate === 'string' && imageCandidate.trim().length > 0) {
                        extracted.imageUrl = imageCandidate.trim();
                    }
                }

                if (!extracted.pricing) {
                    const pricingNode = (eventNode?.pricing || payload.pricing) as
                        | { priceMin?: number; priceMax?: number; currency?: string; pricingType?: string; price?: string }
                        | undefined;

                    let priceMin = typeof eventNode?.priceMin === 'number' ? eventNode.priceMin : pricingNode?.priceMin;
                    let priceMax = typeof eventNode?.priceMax === 'number' ? eventNode.priceMax : pricingNode?.priceMax;
                    let currency =
                        (typeof eventNode?.currency === 'string' && eventNode.currency.trim()) ||
                        (typeof pricingNode?.currency === 'string' && pricingNode.currency.trim()) ||
                        undefined;
                    let pricingType: 'Free' | 'Paid' | 'Varies' | undefined;

                    if (typeof pricingNode?.pricingType === 'string') {
                        const normalizedType = pricingNode.pricingType.trim();
                        if (['Free', 'Paid', 'Varies'].includes(normalizedType)) {
                            pricingType = normalizedType as 'Free' | 'Paid' | 'Varies';
                        }
                    }

                    if (priceMin === undefined && priceMax === undefined) {
                        const rawPriceText =
                            (typeof pricingNode?.price === 'string' && pricingNode.price) ||
                            (typeof eventRecord?.price === 'string' ? (eventRecord.price as string) : undefined) ||
                            (typeof eventRecord?.priceRange === 'string'
                                ? (eventRecord.priceRange as string)
                                : undefined);
                        if (rawPriceText) {
                            const parsed = parsePriceRangeText(rawPriceText);
                            if (parsed) {
                                priceMin = parsed.min ?? priceMin;
                                priceMax = parsed.max ?? priceMax;
                                currency = parsed.currency ?? currency;
                                if (parsed.min === 0 && parsed.max === 0) {
                                    pricingType = 'Free';
                                }
                            }
                        }
                    }

                    if (priceMin !== undefined || priceMax !== undefined || currency || pricingType) {
                        extracted.pricing = {
                            priceMin,
                            priceMax,
                            currency,
                            pricingType,
                        };
                    }
                }

                if (!extracted.sourceUrls) {
                    const sourceNode = payload.source as
                        | { finalUrl?: string; sourceUrl?: string; ogUrl?: string }
                        | undefined;
                    if (sourceNode && (sourceNode.finalUrl || sourceNode.sourceUrl || sourceNode.ogUrl)) {
                        extracted.sourceUrls = {
                            finalUrl:
                                typeof sourceNode.finalUrl === 'string' && sourceNode.finalUrl.trim().length > 0
                                    ? sourceNode.finalUrl.trim()
                                    : undefined,
                            sourceUrl:
                                typeof sourceNode.sourceUrl === 'string' && sourceNode.sourceUrl.trim().length > 0
                                    ? sourceNode.sourceUrl.trim()
                                    : undefined,
                            ogUrl:
                                typeof sourceNode.ogUrl === 'string' && sourceNode.ogUrl.trim().length > 0
                                    ? sourceNode.ogUrl.trim()
                                    : undefined,
                        };
                    }
                }
            });

            if (jsonDescription) {
                extracted.description = normalizeDescription(jsonDescription, existingDescription);
            }

            let agendaItems: EventAgendaSchema[] = [];
            payloads.forEach((payload) => {
                if (Array.isArray(payload.agenda)) {
                    agendaItems = agendaItems.concat(normalizeAgenda(payload.agenda));
                }
            });
            if (agendaItems.length > 0) {
                const seen = new Set<string>();
                extracted.agenda = agendaItems.filter((item) => {
                    const key = item.title ? item.title.toLowerCase() : '';
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });
            }

            let speakersList: EventSpeakersSchema[] = [];
            payloads.forEach((payload) => {
                if (Array.isArray(payload.speakers)) {
                    speakersList = speakersList.concat(normalizeSpeakers(payload.speakers));
                }
            });
            if (speakersList.length > 0) {
                const seen = new Set<string>();
                extracted.speakers = speakersList.filter((speaker) => {
                    const key = speaker.name ? speaker.name.toLowerCase() : '';
                    if (seen.has(key)) {
                        return false;
                    }
                    seen.add(key);
                    return true;
                });
            }

            for (const payload of payloads) {
                if (!extracted.pricing && payload.pricing && typeof payload.pricing === 'object') {
                    extracted.pricing = normalizePricing(payload.pricing);
                    if (extracted.pricing) {
                        break;
                    }
                }
            }

            const dailyScheduleMap = new Map<number, EventDailyScheduleEntry>();
            payloads.forEach((payload) => {
                if (Array.isArray(payload.dailySchedule)) {
                    payload.dailySchedule.forEach((schedule, index) => {
                        const dayNumber =
                            typeof schedule.dayNumber === 'number' && schedule.dayNumber > 0
                                ? Math.floor(schedule.dayNumber)
                                : index + 1;
                        const existing = dailyScheduleMap.get(dayNumber);

                        if (
                            !existing ||
                            ((schedule.startTime && schedule.endTime) &&
                                (!existing.startTime || !existing.endTime))
                        ) {
                            dailyScheduleMap.set(dayNumber, schedule);
                        } else {
                            dailyScheduleMap.set(dayNumber, {
                                ...existing,
                                ...schedule,
                                startTime: schedule.startTime || existing.startTime,
                                endTime: schedule.endTime || existing.endTime,
                                date: schedule.date || existing.date,
                                dayLabel: schedule.dayLabel || existing.dayLabel,
                                notes: schedule.notes || existing.notes,
                            });
                        }
                    });
                }
            });

            if (dailyScheduleMap.size > 0) {
                extracted.dailySchedule = Array.from(dailyScheduleMap.values()).sort(
                    (a, b) => (a.dayNumber || 0) - (b.dayNumber || 0)
                );
            }

            for (const payload of payloads) {
                if (!extracted.venue && payload.venue && typeof payload.venue === 'object') {
                    extracted.venue = payload.venue;
                    break;
                }
            }
        }

        if (!extracted.description) {
            const markdownSource =
                sourceResult?.data?.markdown ||
                sourcePages?.find((page) => page.markdown)?.markdown;
            if (markdownSource) {
                extracted.description = normalizeDescription(markdownSource, existingDescription);
            }
        }

        if (!extracted.imageUrl && sourceResult?.data?.metadata?.ogImage) {
            extracted.imageUrl = sourceResult.data.metadata.ogImage;
        }

        if (!extracted.sourceUrls) {
            const extractMetadataValue = (
                metadata: Record<string, unknown>,
                keys: string[]
            ): string | undefined => {
                for (const key of keys) {
                    const value = metadata[key];
                    if (typeof value === 'string' && value.trim().length > 0) {
                        return value.trim();
                    }
                }
                return undefined;
            };

            const metadataCandidates: Record<string, unknown>[] = [];
            if (sourceResult?.data?.metadata && typeof sourceResult.data.metadata === 'object') {
                metadataCandidates.push(sourceResult.data.metadata as Record<string, unknown>);
            }
            sourcePages?.forEach((page) => {
                if (page.metadata) {
                    metadataCandidates.push(page.metadata);
                }
            });

            for (const metadata of metadataCandidates) {
                const finalUrl =
                    extractMetadataValue(metadata, ['finalUrl', 'final_url', 'canonicalUrl', 'url']) ||
                    extractMetadataValue(metadata, ['ogUrl', 'og:url']);
                const sourceUrl =
                    extractMetadataValue(metadata, ['sourceUrl', 'source_url', 'originalUrl', 'original_url']) ||
                    extractMetadataValue(metadata, ['url']);
                const ogUrl = extractMetadataValue(metadata, ['ogUrl', 'og:url']);

                if (finalUrl || sourceUrl || ogUrl) {
                    extracted.sourceUrls = {
                        finalUrl: finalUrl || undefined,
                        sourceUrl: sourceUrl || undefined,
                        ogUrl: ogUrl || undefined,
                    };
                    break;
                }
            }
        }

        return extracted;
    }

    /**
     * Normalize daily schedule entries returned by Firecrawl into the format expected by events.daily_schedule
     * Handles partial data: accepts entries with only start time or only end time
     */
    private static normalizeDailySchedule(
        entries: EventDailyScheduleEntry[],
        timezone?: string | null
    ): Json | null {
        if (!entries || entries.length === 0) {
            return null;
        }

        const normalizedEntries: Array<{ day: number; start?: string; end?: string }> = [];

        entries.forEach((entry, index) => {
            const start = entry.startTime ? this.convertToHHMM(entry.startTime, timezone) : null;
            const end = entry.endTime ? this.convertToHHMM(entry.endTime, timezone) : null;

            // Accept entries with at least start OR end time (relaxed validation)
            if (!start && !end) {
                return;
            }

            const dayNumber = entry.dayNumber && entry.dayNumber > 0 ? Math.floor(entry.dayNumber) : index + 1;

            // Include entry with available times (at least one is required due to check above)
            normalizedEntries.push({
                day: dayNumber,
                ...(start && { start }),
                ...(end && { end }),
            });
        });

        if (normalizedEntries.length === 0) {
            return null;
        }

        // Check if all entries have both times (for determining if we can simplify)
        const allComplete = normalizedEntries.every(entry => entry.start && entry.end);
        const startTimes = normalizedEntries.filter(e => e.start).map(entry => entry.start!);
        const endTimes = normalizedEntries.filter(e => e.end).map(entry => entry.end!);
        const allSameStart = allComplete && startTimes.length > 0 && startTimes.every((time) => time === startTimes[0]);
        const allSameEnd = allComplete && endTimes.length > 0 && endTimes.every((time) => time === endTimes[0]);

        // Calculate daily start/end only if we have times available
        const dailyStart = startTimes.length > 0 ? startTimes.reduce((min, time) => (time < min ? time : min), startTimes[0]) : undefined;
        const dailyEnd = endTimes.length > 0 ? endTimes.reduce((max, time) => (time > max ? time : max), endTimes[0]) : undefined;

        const schedulePayload: Record<string, unknown> = {
            type: allSameStart && allSameEnd ? 'daily_recurring' : 'daily_custom',
            custom_schedule: normalizedEntries,
        };

        // Only include daily_start/daily_end if we have valid times
        if (dailyStart) {
            schedulePayload.daily_start = dailyStart;
        }
        if (dailyEnd) {
            schedulePayload.daily_end = dailyEnd;
        }

        if (timezone && timezone.includes('/')) {
            schedulePayload.timezone = timezone;
        }

        return schedulePayload as Json;
    }

    /**
     * Convert various time string formats to HH:MM (24-hour) representation.
     */
    private static convertToHHMM(timeStr?: string, timezone?: string | null): string | null {
        if (!timeStr || typeof timeStr !== 'string') {
            return null;
        }

        let trimmed = timeStr.trim();
        if (!trimmed) {
            return null;
        }

        trimmed = trimmed.replace(/\u00A0/g, ' '); // replace non-breaking spaces
        trimmed = trimmed.replace(/\s*\(.*?\)\s*$/, ''); // remove parenthetical notes

        // Strip trailing timezone abbreviations (e.g., "PT", "PST") for parsing
        if (!/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
            trimmed = trimmed.replace(/\s+(?:UTC[+-]?\d{0,2}|[A-Z]{2,5})$/, '').trim();
        }

        // 24-hour format with optional seconds
        let match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (match) {
            const hours = match[1].padStart(2, '0');
            const minutes = match[2];
            return `${hours}:${minutes}`;
        }

        // 12-hour format with AM/PM
        match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const minutes = match[2];
            const meridiem = match[3].toUpperCase();
            if (meridiem === 'PM' && hours !== 12) {
                hours += 12;
            } else if (meridiem === 'AM' && hours === 12) {
                hours = 0;
            }
            return `${String(hours).padStart(2, '0')}:${minutes}`;
        }

        // Hour only with AM/PM (e.g., "5 PM")
        match = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const meridiem = match[2].toUpperCase();
            if (meridiem === 'PM' && hours !== 12) {
                hours += 12;
            } else if (meridiem === 'AM' && hours === 12) {
                hours = 0;
            }
            return `${String(hours).padStart(2, '0')}:00`;
        }

        // ISO timestamp fallback
        if (/^\d{4}-\d{2}-\d{2}T/.test(timeStr)) {
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
                return this.formatDateToHHMM(date, timezone);
            }
        }

        return null;
    }

    private static formatDateToHHMM(date: Date, timezone?: string | null): string {
        if (timezone && timezone.includes('/')) {
            try {
                const formatter = new Intl.DateTimeFormat('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                    timeZone: timezone,
                });
                return formatter.format(date);
            } catch (error) {
                Sentry.captureException(error, {
                    tags: { context: 'formatDateToHHMM' },
                    extra: { timezone },
                });
            }
        }

        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * Validate and normalize time string to ISO 8601 format
     * Returns null if invalid or appears to be a default time that matches the original
     * 
     * @param timeStr - The extracted time string to validate
     * @param originalTime - The existing event time (optional) - if provided, only reject if extracted time exactly matches it
     */
    private static validateAndNormalizeTime(timeStr: string, originalTime?: string | null): string | null {
        if (!timeStr || typeof timeStr !== 'string') {
            console.log(`[FirecrawlEnrichmentService] Rejecting time: empty or invalid string`);
            return null;
        }

        try {
            // Parse the time string
            const date = new Date(timeStr);
            
            // Check if it's a valid date
            if (isNaN(date.getTime())) {
                console.log(`[FirecrawlEnrichmentService] Rejecting time: invalid date format: ${timeStr}`);
                return null;
            }

            const normalizedTime = date.toISOString();

            // If we have an original time, compare without timezone and minute/second precision
            // Only reject if extracted time exactly matches the original (suggesting it's the same default)
            if (originalTime) {
                try {
                    const originalDate = new Date(originalTime);
                    if (!isNaN(originalDate.getTime())) {
                        // Compare dates without timezone info - extract just the date and hour components
                        const extractedYear = date.getUTCFullYear();
                        const extractedMonth = date.getUTCMonth();
                        const extractedDay = date.getUTCDate();
                        const extractedHour = date.getUTCHours();
                        const extractedMinutes = date.getUTCMinutes();
                        const extractedSeconds = date.getUTCSeconds();

                        const originalYear = originalDate.getUTCFullYear();
                        const originalMonth = originalDate.getUTCMonth();
                        const originalDay = originalDate.getUTCDate();
                        const originalHour = originalDate.getUTCHours();
                        const originalMinutes = originalDate.getUTCMinutes();
                        const originalSeconds = originalDate.getUTCSeconds();

                        // Check if it's exactly the same (same date, hour, and both have zero minutes/seconds)
                        // This indicates it's likely the same default time
                        if (
                            extractedYear === originalYear &&
                            extractedMonth === originalMonth &&
                            extractedDay === originalDay &&
                            extractedHour === originalHour &&
                            extractedMinutes === originalMinutes &&
                            extractedSeconds === originalSeconds
                        ) {
                            console.log(`[FirecrawlEnrichmentService] Rejecting time: extracted time ${normalizedTime} exactly matches original ${originalTime} (likely same default)`);
                            return null;
                        }
                    }
                } catch (_error) {
                    // If original time parsing fails, continue with other checks
                }
            }

            // Check if it looks like a default time pattern (midnight, 7am, or 9am UTC with no minutes/seconds)
            // Only reject if it's clearly a default pattern AND we don't have an original to compare against
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const seconds = date.getUTCSeconds();
            
            // If we don't have an original time to compare, do basic default pattern check
            if (!originalTime && minutes === 0 && seconds === 0 && (hours === 0 || hours === 7 || hours === 9)) {
                // Only reject if it's clearly a default pattern (no timezone offset in string)
                if (timeStr.includes('T00:00:00') || timeStr.includes('T07:00:00') || timeStr.includes('T09:00:00')) {
                    // But allow if it has explicit timezone info (suggests it's a real time)
                    if (!timeStr.match(/[+-]\d{2}:\d{2}$/) && !timeStr.endsWith('Z')) {
                        console.log(`[FirecrawlEnrichmentService] Rejecting time: default pattern without timezone: ${timeStr}`);
                        return null;
                    }
                }
            }

            // Accept the time
            console.log(`[FirecrawlEnrichmentService] Accepting time: ${timeStr} -> ${normalizedTime}${originalTime ? ` (original: ${originalTime})` : ''}`);
            return normalizedTime;
        } catch (error) {
            console.warn(`[FirecrawlEnrichmentService] Failed to parse time: ${timeStr}`, error);
            return null;
        }
    }

    /**
     * Update event fields with extracted data
     * Returns array of field names that were updated
     */
    private static async updateEventFields(
        eventId: string,
        extractedData: ExtractedEventData,
        supabaseClient: SupabaseClientType
    ): Promise<{ fieldsUpdated: string[]; fieldDiffs: FieldDiff[] }> {
        const updatedFields = new Set<string>();
        const eventUpdates: Record<string, unknown> = {};
        const speakerCandidates = new Map<string, SpeakerInput>();
        const nameToKeys = new Map<string, string[]>();
        const agendaBlueprint: Array<{ item: AgendaItemInput; speakerNames: string[] }> = [];

        const sanitizeOptional = (value?: string | null): string | undefined => {
            if (typeof value !== 'string') {
                return undefined;
            }
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : undefined;
        };

        const registerSpeakerCandidate = (input: SpeakerInput) => {
            const normalizedName = normalizeSpeakerName(input.name);
            if (!normalizedName) {
                return;
            }

            const candidate: SpeakerInput = {
                name: normalizedName,
                linkedinUrl: sanitizeOptional(input.linkedinUrl),
                title: sanitizeOptional(input.title),
                company: sanitizeOptional(input.company),
                bio: sanitizeOptional(input.bio),
                photoUrl: sanitizeOptional(input.photoUrl),
                twitterUrl: sanitizeOptional(input.twitterUrl),
                websiteUrl: sanitizeOptional(input.websiteUrl),
            };

            const key = buildSpeakerKey(normalizedName, candidate.company);
            const existing = speakerCandidates.get(key);

            if (existing) {
                const merged = { ...existing };
                (['title', 'company', 'bio', 'linkedinUrl', 'photoUrl', 'twitterUrl', 'websiteUrl'] as const).forEach(
                    (field) => {
                        const incoming = candidate[field];
                        if (incoming && !merged[field]) {
                            merged[field] = incoming;
                        }
                    }
                );
                speakerCandidates.set(key, merged);
            } else {
                speakerCandidates.set(key, candidate);
            }

            const existingKeys = nameToKeys.get(normalizedName) || [];
            if (!existingKeys.includes(key)) {
                existingKeys.push(key);
                nameToKeys.set(normalizedName, existingKeys);
            }
        };

        const addField = (field: string) => {
            if (field) {
                updatedFields.add(field);
            }
        };

        const fieldDiffs: FieldDiff[] = [];

        const queueUpdate = (field: string, value: unknown, previousValue?: unknown) => {
            eventUpdates[field] = value;
            addField(field);

            const normalizedPrev = previousValue ?? null;
            const normalizedNext = value ?? null;
            const hasChanged = JSON.stringify(normalizedPrev) !== JSON.stringify(normalizedNext);

            if (hasChanged) {
                fieldDiffs.push({
                    fieldName: field,
                    oldValue: normalizedPrev,
                    newValue: normalizedNext,
                    hasChanged: true,
                });
            }
        };

        try {
            // Get existing event times for validation
            const { data: existingEvent } = await supabaseClient
                .from('events')
                .select(
                    [
                        'title',
                        'start_time',
                        'end_time',
                        'daily_schedule',
                        'timezone',
                        'description',
                        'location',
                        'virtual_platform',
                        'status',
                        'event_format',
                        'registration_url',
                        'agenda_url',
                        'target_audience',
                        'language',
                        'difficulty_level',
                        'price_min',
                        'price_max',
                        'currency',
                        'pricing_type',
                        'event_image_url',
                        'venue_id',
                        'ingestion_provenance',
                    ].join(', ')
                )
                .eq('id', eventId)
                .single();

            const existingEventRow = (existingEvent as ExistingEventRow | null) ?? null;

            const existingStartTime = (existingEventRow?.start_time as string) || null;
            const existingEndTime = (existingEventRow?.end_time as string) || null;
            const existingDailySchedule = existingEventRow?.daily_schedule as Record<string, unknown> | null | undefined;
            const eventTimezone = (existingEventRow?.timezone as string) || null;

            // Title: only update if existing title is missing or placeholder
            if (extractedData.title) {
                const newTitle = extractedData.title.trim();
                const existingTitle = (existingEventRow?.title as string) || '';
                if (newTitle && (!existingTitle || existingTitle.trim().length < 5 || existingTitle.trim().toLowerCase() === 'tbd')) {
                    queueUpdate('title', newTitle, existingTitle);
                }
            }

            // Update start_time if provided and valid
            if (extractedData.startTime) {
                // Validate with original time - only reject if it exactly matches
                const validatedStartTime = this.validateAndNormalizeTime(extractedData.startTime, existingStartTime);
                
                if (validatedStartTime && validatedStartTime !== existingStartTime) {
                    queueUpdate('start_time', validatedStartTime, existingStartTime);
                    console.log(`[FirecrawlEnrichmentService] Updated start_time for event ${eventId} from ${existingStartTime || 'null'} to ${validatedStartTime}`);
                } else if (!validatedStartTime) {
                    console.log(`[FirecrawlEnrichmentService] Rejected start_time for event ${eventId}: ${extractedData.startTime} (validation failed)`);
                } else {
                    console.log(`[FirecrawlEnrichmentService] Skipped start_time update for event ${eventId}: extracted time matches existing`);
                }
            }

            // Update end_time if provided and valid
            if (extractedData.endTime) {
                // Validate with original time - only reject if it exactly matches
                const validatedEndTime = this.validateAndNormalizeTime(extractedData.endTime, existingEndTime);
                
                if (validatedEndTime && validatedEndTime !== existingEndTime) {
                    queueUpdate('end_time', validatedEndTime, existingEndTime);
                    console.log(`[FirecrawlEnrichmentService] Updated end_time for event ${eventId} from ${existingEndTime || 'null'} to ${validatedEndTime}`);
                } else if (!validatedEndTime) {
                    console.log(`[FirecrawlEnrichmentService] Rejected end_time for event ${eventId}: ${extractedData.endTime} (validation failed)`);
                } else {
                    console.log(`[FirecrawlEnrichmentService] Skipped end_time update for event ${eventId}: extracted time matches existing`);
                }
            }

            // Update description if provided
            if (extractedData.description) {
                const existingDescription = (existingEventRow?.description as string) || '';
                const newDescription = extractedData.description;

                // Use normalized description (already has nav/footer filtered out)
                // normalizeDescription already does smart merging internally
                const mergedDescription = newDescription;

                if (mergedDescription !== existingDescription) {
                    queueUpdate('description', mergedDescription, existingDescription);
                    console.log(`[FirecrawlEnrichmentService] Updated description for event ${eventId} (${newDescription.length} chars, normalized)`);
                } else {
                    console.log(`[FirecrawlEnrichmentService] Skipped description update for event ${eventId} (no change after normalization)`);
                }
            }

            // Timezone inference
            if (extractedData.timezone || extractedData.location?.city || extractedData.location?.country) {
                const tzResult = normalizeTimezone(
                    extractedData.timezone,
                    {
                        city: extractedData.location?.city,
                        country: extractedData.location?.country,
                    },
                    eventTimezone || undefined
                );

                if (tzResult.timezone && tzResult.timezone !== eventTimezone) {
                    queueUpdate('timezone', tzResult.timezone, eventTimezone);
                    console.log(
                        `[FirecrawlEnrichmentService] Updated timezone for event ${eventId} from ${eventTimezone || 'null'} to ${tzResult.timezone} (source=${tzResult.source}, confidence=${tzResult.confidence})`
                    );
                }
            }

            // Status + format updates
            if (extractedData.status) {
                const normalizedStatus = extractedData.status.trim();
                const existingStatus = (existingEventRow?.status as string) || null;
                if (normalizedStatus && normalizedStatus !== (existingStatus || '')) {
                    queueUpdate('status', normalizedStatus, existingStatus);
                }
            }

            if (extractedData.format) {
                const normalizedFormat = extractedData.format.trim().toLowerCase().replace(/\s+/g, '_');
                const existingFormat = (existingEventRow?.event_format as string) || null;
                if (normalizedFormat && normalizedFormat !== (existingFormat || '')) {
                    queueUpdate('event_format', normalizedFormat, existingFormat);
                }
            }

            // Registration + agenda URLs
            if (extractedData.registrationUrl) {
                const normalizedRegistration = extractedData.registrationUrl.trim();
                const existingRegistration = (existingEventRow?.registration_url as string) || null;
                if (normalizedRegistration && normalizedRegistration !== (existingRegistration || '')) {
                    queueUpdate('registration_url', normalizedRegistration, existingRegistration);
                }
            }

            if (extractedData.agendaUrl) {
                const normalizedAgendaUrl = extractedData.agendaUrl.trim();
                const existingAgendaUrl = (existingEventRow?.agenda_url as string) || null;
                if (normalizedAgendaUrl && normalizedAgendaUrl !== (existingAgendaUrl || '')) {
                    queueUpdate('agenda_url', normalizedAgendaUrl, existingAgendaUrl);
                }
            }

            // Audience & language metadata
            if (extractedData.targetAudience) {
                const normalizedAudience = extractedData.targetAudience.trim();
                const existingAudience = (existingEventRow?.target_audience as string) || null;
                if (normalizedAudience && normalizedAudience !== (existingAudience || '')) {
                    queueUpdate('target_audience', normalizedAudience, existingAudience);
                }
            }

            if (extractedData.language) {
                const normalizedLanguage = extractedData.language.trim();
                const existingLanguage = (existingEventRow?.language as string) || null;
                if (normalizedLanguage && normalizedLanguage !== (existingLanguage || '')) {
                    queueUpdate('language', normalizedLanguage, existingLanguage);
                }
            }

            if (extractedData.difficulty) {
                const normalizedDifficulty = extractedData.difficulty.trim().toLowerCase();
                const existingDifficulty = (existingEventRow?.difficulty_level as string) || null;
                if (normalizedDifficulty && normalizedDifficulty !== (existingDifficulty || '').toLowerCase()) {
                    queueUpdate('difficulty_level', normalizedDifficulty, existingDifficulty);
                }
            }

            // Location updates
            if (extractedData.location) {
                const { venue, address, city, country, virtualPlatform } = extractedData.location;
                const locationParts = [venue, address, city, country]
                    .map((part) => (typeof part === 'string' ? part.trim() : ''))
                    .filter((part) => part.length > 0);
                const combinedLocation = locationParts.length > 0 ? locationParts.join(', ') : undefined;
                const existingLocation = (existingEventRow?.location as string) || undefined;

                if (combinedLocation && combinedLocation !== (existingLocation || undefined)) {
                    queueUpdate('location', combinedLocation, existingLocation);
                }

                if (virtualPlatform) {
                    const normalizedVirtual = virtualPlatform.trim();
                    const existingVirtual = (existingEventRow?.virtual_platform as string) || null;
                    if (normalizedVirtual && normalizedVirtual !== (existingVirtual || '')) {
                        queueUpdate('virtual_platform', normalizedVirtual, existingVirtual);
                    }
                }
            }

            // Pricing updates
            if (extractedData.pricing) {
                const { priceMin, priceMax, currency, pricingType } = extractedData.pricing;
                const existingPriceMin = existingEventRow?.price_min as number | null | undefined;
                const existingPriceMax = existingEventRow?.price_max as number | null | undefined;
                const existingCurrency = (existingEventRow?.currency as string) || undefined;
                const existingPricingType = (existingEventRow?.pricing_type as string) || undefined;

                if (priceMin !== undefined && priceMin !== existingPriceMin) {
                    queueUpdate('price_min', priceMin, existingPriceMin);
                    addField('pricing');
                }
                if (priceMax !== undefined && priceMax !== existingPriceMax) {
                    queueUpdate('price_max', priceMax, existingPriceMax);
                    addField('pricing');
                }
                if (currency && currency !== existingCurrency) {
                    queueUpdate('currency', currency, existingCurrency);
                    addField('pricing');
                }
                if (pricingType && pricingType !== existingPricingType) {
                    queueUpdate('pricing_type', pricingType, existingPricingType);
                    addField('pricing');
                }
            }

            // Event image
            if (extractedData.imageUrl) {
                const normalizedImage = extractedData.imageUrl.trim();
                const existingImage = (existingEventRow?.event_image_url as string) || null;
                if (normalizedImage && normalizedImage !== (existingImage || '')) {
                    queueUpdate('event_image_url', normalizedImage, existingImage);
                }
            }

            if (extractedData.sourceUrls) {
                const provenanceRaw = existingEventRow?.ingestion_provenance as unknown;
                const currentProvenance =
                    provenanceRaw && typeof provenanceRaw === 'object' && provenanceRaw !== null
                        ? { ...(provenanceRaw as Record<string, unknown>) }
                        : {};
                const existingFirecrawl =
                    currentProvenance.firecrawl && typeof currentProvenance.firecrawl === 'object'
                        ? { ...(currentProvenance.firecrawl as Record<string, unknown>) }
                        : {};

                const updatedFirecrawl = {
                    ...existingFirecrawl,
                    ...(extractedData.sourceUrls.finalUrl && {
                        finalUrl: extractedData.sourceUrls.finalUrl,
                    }),
                    ...(extractedData.sourceUrls.sourceUrl && {
                        sourceUrl: extractedData.sourceUrls.sourceUrl,
                    }),
                    ...(extractedData.sourceUrls.ogUrl && {
                        ogUrl: extractedData.sourceUrls.ogUrl,
                    }),
                    updatedAt: new Date().toISOString(),
                } as Record<string, unknown>;

                const updatedProvenance = {
                    ...currentProvenance,
                    firecrawl: updatedFirecrawl,
                } as Record<string, unknown>;

                const provenanceChanged = JSON.stringify(updatedProvenance) !== JSON.stringify(currentProvenance);
                if (provenanceChanged) {
                    queueUpdate('ingestion_provenance', updatedProvenance, currentProvenance);
                }
            }

            if (Object.keys(eventUpdates).length > 0) {
                await supabaseClient.from('events').update(eventUpdates).eq('id', eventId);
            }

            // Update daily schedule if provided
            if (extractedData.dailySchedule && extractedData.dailySchedule.length > 0) {
                const normalizedSchedule = this.normalizeDailySchedule(
                    extractedData.dailySchedule,
                    eventTimezone
                );

                if (normalizedSchedule) {
                    const scheduleChanged = JSON.stringify(normalizedSchedule) !== JSON.stringify(existingDailySchedule || null);

                    if (scheduleChanged) {
                        await supabaseClient
                            .from('events')
                            .update({ daily_schedule: normalizedSchedule })
                            .eq('id', eventId);
                        addField('daily_schedule');
                        fieldDiffs.push({
                            fieldName: 'daily_schedule',
                            oldValue: existingDailySchedule || null,
                            newValue: normalizedSchedule,
                            hasChanged: true,
                        });
                        console.log(`[FirecrawlEnrichmentService] Updated daily_schedule for event ${eventId}`);
                    } else {
                        console.log(`[FirecrawlEnrichmentService] Skipped daily_schedule update for event ${eventId}: no change detected`);
                    }
                } else {
                    console.log(`[FirecrawlEnrichmentService] Skipped daily_schedule update for event ${eventId}: unable to normalize extracted schedule`);
                }
            }

            // Update event image if provided
            // Create/update agenda items
            if (extractedData.agenda && extractedData.agenda.length > 0) {
                extractedData.agenda.forEach((item, index) => {
                    if (!item.title) {
                        return;
                    }

                    const rawStart =
                        item.startTimeLocal ||
                        item.startTime ||
                        (item as { beginTime?: string }).beginTime ||
                        item.start ||
                        undefined;
                    const rawEnd = item.endTimeLocal || item.endTime || undefined;
                    const durationInput =
                        (typeof item.durationMinutes === 'number' ? item.durationMinutes : undefined) ||
                        item.duration;

                    const derived = deriveEndTime(rawStart, rawEnd, durationInput);
                    const startLocal = parseLocalTime(rawStart);
                    const endLocal = derived.endTimeLocal ?? parseLocalTime(rawEnd);
                    const durationMinutes =
                        (typeof item.durationMinutes === 'number' ? item.durationMinutes : undefined) ??
                        derived.durationMinutes ??
                        parseDurationMinutes(item.duration);

                    if (!startLocal) {
                        return;
                    }

                    const startTime = `${startLocal}:00`;
                    const endTime = endLocal ? `${endLocal}:00` : `${startLocal}:00`;

                    const agendaSortOrder = (item as { sortOrder?: number }).sortOrder ?? index;

                    const baseAgenda: AgendaItemInput = {
                            title: item.title,
                        startTime,
                        endTime,
                        type: item.type || item.track || 'other',
                            description: item.description || undefined,
                            location: item.location || undefined,
                        dayNumber: item.dayNumber || 1,
                        track: item.track || undefined,
                        sortOrder: agendaSortOrder,
                        durationMinutes: durationMinutes ?? null,
                    };

                    const speakerNames = Array.isArray(item.speakers)
                        ? item.speakers
                              .map((speakerName) => normalizeSpeakerName(String(speakerName)))
                              .filter((name): name is string => !!name)
                        : [];

                    agendaBlueprint.push({ item: baseAgenda, speakerNames });

                    speakerNames.forEach((name) => {
                        registerSpeakerCandidate({ name });
                    });
                });
            }

            if (extractedData.speakers && extractedData.speakers.length > 0) {
                extractedData.speakers.forEach((speaker) => {
                    if (!speaker.name) {
                        return;
                    }
                    registerSpeakerCandidate({
                        name: speaker.name,
                        title: speaker.title,
                        company: speaker.company,
                        bio: speaker.bio,
                        linkedinUrl: speaker.linkedinUrl,
                        photoUrl: speaker.photoUrl,
                        twitterUrl: speaker.twitterUrl,
                        websiteUrl: speaker.websiteUrl,
                    });
                });
            }

            // Create/update venue if provided
            if (extractedData.venue) {
                const existingVenueId = (existingEventRow?.venue_id as string) || null;
                const venueResult = await EventEnrichmentService.createOrSelectVenue(
                    {
                        name: extractedData.venue.name || 'Unknown Venue',
                        address: extractedData.venue.address || null,
                        city: extractedData.venue.city || null,
                        state_province: extractedData.venue.state_province || null,
                        country: extractedData.venue.country || null,
                        latitude: extractedData.venue.latitude || null,
                        longitude: extractedData.venue.longitude || null,
                    },
                    null,
                    supabaseClient
                );

                if (venueResult.success && venueResult.venueId) {
                    await supabaseClient
                        .from('events')
                        .update({ venue_id: venueResult.venueId })
                        .eq('id', eventId);
                    addField('venue');
                    fieldDiffs.push({
                        fieldName: 'venue_id',
                        oldValue: existingVenueId,
                        newValue: venueResult.venueId,
                        hasChanged: existingVenueId !== venueResult.venueId,
                    });
                    console.log(`[FirecrawlEnrichmentService] Updated venue for event ${eventId} (venue_id: ${venueResult.venueId})`);
                }
            }

            const speakerIdMap = new Map<string, string>();
            if (speakerCandidates.size > 0) {
                const speakerEntries = Array.from(speakerCandidates.entries());
                const speakerInputs = speakerEntries.map(([, data]) => data);
                const speakerResult = await EventEnrichmentService.createOrUpdateSpeakers(
                    eventId,
                    speakerInputs,
                    supabaseClient
                );

                if (speakerResult.success) {
                    addField('speakers');
                    fieldDiffs.push({
                        fieldName: 'speakers',
                        oldValue: null,
                        newValue: speakerInputs.map((speaker) => ({
                            name: speaker.name,
                            title: speaker.title,
                            company: speaker.company,
                        })),
                        hasChanged: true,
                    });
                    speakerEntries.forEach(([key], index) => {
                        const id = speakerResult.speakerIds[index];
                        if (id) {
                            speakerIdMap.set(key, id);
                        }
                    });
                    if (speakerResult.speakerIds.length !== speakerInputs.length) {
                        console.warn(
                            `[FirecrawlEnrichmentService] Speaker ID count mismatch for event ${eventId}: expected ${speakerInputs.length}, received ${speakerResult.speakerIds.length}`
                        );
                    }
                } else {
                    console.warn(
                        `[FirecrawlEnrichmentService] Failed to upsert speakers for event ${eventId}: ${speakerResult.error}`
                    );
                }
            }

            if (agendaBlueprint.length > 0) {
                const resolvedAgendaItems = agendaBlueprint.map(({ item, speakerNames }) => {
                    const speakerIds = speakerNames
                        .map((name) => {
                            const candidateKeys = nameToKeys.get(name) || [];
                            for (const key of candidateKeys) {
                                const id = speakerIdMap.get(key);
                                if (id) {
                                    return id;
                                }
                            }
                            const fallbackKey = buildSpeakerKey(name, undefined);
                            return speakerIdMap.get(fallbackKey);
                        })
                        .filter((id): id is string => !!id);

                    return {
                        ...item,
                        speakerIds: speakerIds.length > 0 ? speakerIds : undefined,
                    } as AgendaItemInput;
                });

                const agendaResult = await EventEnrichmentService.createOrUpdateAgendaItems(
                    eventId,
                    resolvedAgendaItems,
                    supabaseClient
                );

                if (agendaResult.success) {
                    addField('agenda');
                    fieldDiffs.push({
                        fieldName: 'agenda',
                        oldValue: null,
                        newValue: resolvedAgendaItems.map((agendaItem) => ({
                            title: agendaItem.title,
                            startTime: agendaItem.startTime,
                            endTime: agendaItem.endTime,
                            dayNumber: agendaItem.dayNumber,
                            speakerIds: agendaItem.speakerIds,
                        })),
                        hasChanged: true,
                    });
                    console.log(
                        `[FirecrawlEnrichmentService] Updated agenda for event ${eventId} (${resolvedAgendaItems.length} items)`
                    );
                } else {
                    console.warn(
                        `[FirecrawlEnrichmentService] Failed to update agenda for event ${eventId}: ${agendaResult.error}`
                    );
                }
            }

            if (updatedFields.size === 0) {
                console.log(`[FirecrawlEnrichmentService] No fields updated for event ${eventId} (extracted data: description=${!!extractedData.description}, image=${!!extractedData.imageUrl}, agenda=${extractedData.agenda?.length || 0}, speakers=${extractedData.speakers?.length || 0}, pricing=${!!extractedData.pricing}, venue=${!!extractedData.venue})`);
            }
        } catch (error) {
            console.error(`[FirecrawlEnrichmentService] Error updating event fields for ${eventId}:`, error);
            Sentry.captureException(error, {
                extra: { function: 'updateEventFields', eventId, extractedData },
            });
        }

        return {
            fieldsUpdated: Array.from(updatedFields),
            fieldDiffs,
        };
    }

    /**
     * Update enrichment status and metadata
     */
    private static async updateEnrichmentStatus(
        eventId: string,
        status: FirecrawlEnrichmentStatus,
        metadata: FirecrawlEnrichmentMetadata,
        errorMessage: string | null,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            await supabaseClient
                .from('events')
                .update({
                    firecrawl_enrichment_status: status,
                    firecrawl_enrichment_metadata: metadata as Json,
                })
                .eq('id', eventId);
        } catch (error) {
            console.error(`[FirecrawlEnrichmentService] Failed to update enrichment status for ${eventId}:`, error);
            throw error;
        }
    }

    /**
     * Get credit usage statistics
     * Aggregates credit usage from all completed enrichments
     */
    static async getCreditUsageStats(
        supabaseClient: SupabaseClientType,
        options?: {
            startDate?: string;
            endDate?: string;
            sourceId?: string;
        }
    ): Promise<{
        totalCredits: number;
        totalEvents: number;
        averageCreditsPerEvent: number;
        byStatus: Record<string, { count: number; credits: number }>;
    }> {
        try {
            let query = supabaseClient
                .from('events')
                .select('firecrawl_enrichment_status, firecrawl_enrichment_metadata')
                .not('firecrawl_enrichment_metadata', 'is', null);

            if (options?.startDate) {
                query = query.gte('created_at', options.startDate);
            }
            if (options?.endDate) {
                query = query.lte('created_at', options.endDate);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            let totalCredits = 0;
            let totalEvents = 0;
            const byStatus: Record<string, { count: number; credits: number }> = {};

            for (const event of data || []) {
                const metadata = event.firecrawl_enrichment_metadata as FirecrawlEnrichmentMetadata | null;
                if (!metadata) continue;

                const credits = metadata.credits_used || 0;
                const status = event.firecrawl_enrichment_status || 'unknown';

                totalCredits += credits;
                totalEvents++;

                if (!byStatus[status]) {
                    byStatus[status] = { count: 0, credits: 0 };
                }
                byStatus[status].count++;
                byStatus[status].credits += credits;
            }

            return {
                totalCredits,
                totalEvents,
                averageCreditsPerEvent: totalEvents > 0 ? totalCredits / totalEvents : 0,
                byStatus,
            };
        } catch (error) {
            console.error('[FirecrawlEnrichmentService] Failed to get credit usage stats:', error);
            throw error;
        }
    }
}
