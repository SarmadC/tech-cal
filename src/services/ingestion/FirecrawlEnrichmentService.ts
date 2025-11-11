/**
 * Firecrawl Enrichment Service
 * 
 * Automatically enriches events during ingestion using Firecrawl API.
 * Uses async queue pattern to avoid blocking ingestion pipeline.
 */

import Firecrawl from '@mendable/firecrawl-js';
import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
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
import { EventEnrichmentService } from './EventEnrichmentService';
import { FirecrawlSiteAnalyzer, type SiteAnalysis } from './FirecrawlSiteAnalyzer';
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
} from '@/config/ingestionConstants';
import { normalizeUrl, resolveTechMemeRedirect, isTechMemeRedirect } from './utils/urlResolver';
import * as Sentry from '@sentry/nextjs';
import { RulesFirstExtractionService } from './RulesFirstExtractionService';

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
        return FIRECRAWL_CONFIG.BLOCKED_DOMAINS.includes(hostname);
    } catch {
        return false;
    }
}


// Check if registration URL should be scraped
function shouldScrapeRegistrationUrl(sourceUrl: string, registrationUrl: string | null | undefined): boolean {
    if (!registrationUrl) {
        return false;
    }

    // Don't block URLs upfront - let Firecrawl follow redirects
    // We'll check the final URL after scraping

    // Skip if same as source URL
    const normalizedSource = normalizeUrl(sourceUrl);
    const normalizedRegistration = normalizeUrl(registrationUrl);
    
    return normalizedSource !== normalizedRegistration;
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

type SemanticEventJsonSchema = ReturnType<typeof getSemanticEventSchema>['jsonSchema'];

interface ExtractStrategyParams {
    primarySourceUrl: string;
    primaryRegistrationUrl?: string | null;
    siteAnalysis: SiteAnalysis;
    semanticSchema: SemanticEventJsonSchema | null;
    extractionPrompt: string;
    priorityUrls: string[];
    techMemeCandidates: string[];
}

interface ExtractStrategyResult {
    sourceResult: FirecrawlScrapeResponse;
    sourcePages: Array<{ url: string; markdown?: string; html?: string; json?: unknown }>;
    pagesProcessed: number;
    creditsUsed: number;
    extractUrls: string[];
}

type ExtractApiResult = FirecrawlExtractResponse & { status?: string };
type MetadataRecord = NonNullable<NonNullable<FirecrawlScrapeResponse['data']>['metadata']>;
type JsonPayload = Partial<ExtractedEventData> & Record<string, unknown>;

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
        jsonSchema: { type: string; properties: Record<string, unknown> } | null,
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
    static async fetchDescriptionPreview(
        sourceUrl: string,
        registrationUrl?: string | null,
        existingDescription?: string | null
    ): Promise<{ description?: string; confidence?: number } | null> {
        const urlsToTry = [sourceUrl];
        if (registrationUrl && registrationUrl !== sourceUrl) {
            urlsToTry.push(registrationUrl);
        }

        for (const url of urlsToTry) {
            try {
                const extraction = await RulesFirstExtractionService.extractFromUrl(url, {
                    minConfidence: 0.4,
                });

                if (extraction.success && extraction.data?.description) {
                    const normalized =
                        normalizeDescription(
                            extraction.data.description,
                            existingDescription ?? undefined
                        ) ?? extraction.data.description.trim();

                    if (normalized) {
                        return {
                            description: normalized,
                            confidence: extraction.confidence ?? undefined,
                        };
                    }
                }
            } catch (error) {
                console.warn(
                    `[FirecrawlEnrichmentService] Failed to fetch description preview from ${url}:`,
                    error
                );
            }
        }

        return null;
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
            .select('id, source_url, registration_url, description, firecrawl_enrichment_metadata')
            .eq('id', eventId)
            .single();

        if (fetchError || !event) {
            return { success: false, error: `Event not found: ${fetchError?.message || 'Unknown'}` };
        }

        // Check retry count and exponential backoff
        const metadata = (event.firecrawl_enrichment_metadata as FirecrawlEnrichmentMetadata) || {};
        const retryCount = metadata.retry_count || 0;

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

        // Update status to in_progress
        await this.updateEnrichmentStatus(
            eventId,
            'in_progress',
            {
                ...metadata,
                attempted_at: new Date().toISOString(),
                retry_count: retryCount + 1,
            },
            null,
            supabaseClient
        );

        try {
            // Get URLs from event and derive effective targets for Firecrawl
            const sourceUrl = event.source_url as string;
            const registrationUrl = event.registration_url as string | null | undefined;

            if (!sourceUrl) {
                throw new Error(`Event has no source_url: ${eventId}`);
            }

            let primarySourceUrl = sourceUrl;
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

            // Use semantic event schema from FirecrawlExtractionPrompts
            // This schema handles terminology variations and provides comprehensive field definitions
            const { jsonSchema: semanticSchema } = getSemanticEventSchema();

            // Analyze site complexity and determine strategy
            const siteAnalysis = await FirecrawlSiteAnalyzer.analyze(
                primarySourceUrl,
                primaryRegistrationUrl || undefined
            );
            console.log(
                `[FirecrawlEnrichmentService] Site analysis for ${primarySourceUrl}: complexity=${siteAnalysis.complexity}, strategy=${siteAnalysis.strategy}, needsMultiPage=${siteAnalysis.needsMultiPageCrawl}, relatedPages=${siteAnalysis.relatedPages.length}`
            );

            let sourceResult: FirecrawlScrapeResponse | null = null;
            let sourcePages: Array<{ url: string; markdown?: string; html?: string; json?: unknown }> = [];
            let pagesScraped = 1;
            let creditsUsed = 0;
            const allPriorityUrls: string[] = [...(siteAnalysis.priorityPages || [])];
            const extractionPrompt = extractionPrompts.contextualFallback;

            const extractResult = await this.runExtractStrategy({
                primarySourceUrl,
                primaryRegistrationUrl,
                siteAnalysis,
                semanticSchema,
                extractionPrompt,
                priorityUrls: allPriorityUrls,
                techMemeCandidates: techMemeSourceCandidates,
            });

            sourceResult = extractResult.sourceResult;
            sourcePages = extractResult.sourcePages;
            pagesScraped = extractResult.pagesProcessed;
            creditsUsed = typeof extractResult.creditsUsed === 'number' ? extractResult.creditsUsed : pagesScraped;
            const extractUrls = extractResult.extractUrls;

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
            const normalizedExtractedData = this.extractEventFields(
                sourceResult,
                sourcePages.length > 0 ? sourcePages : undefined,
                existingDescription
            );
            
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
            const fieldsUpdated = await this.updateEventFields(eventId, normalizedExtractedData, supabaseClient);

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

            // Calculate quality score
            const qualityScore = calculateQualityScore(normalizedExtractedData);

            // Update status to completed
            await this.updateEnrichmentStatus(
                eventId,
                'completed',
                {
                    attempted_at: metadata.attempted_at || new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                    urls_scraped: extractUrls,
                    original_urls: {
                        source_url: sourceUrl, // Original TechMeme redirect URL
                        registration_url: registrationUrl || null,
                    },
                    effective_urls: {
                        source_url: primarySourceUrl,
                        registration_url: primaryRegistrationUrl || null,
                    },
                    resolved_urls: {
                        source_url: finalSourceUrl, // Final URL after Firecrawl followed redirects
                        registration_url: finalRegistrationUrl,
                    },
                    fields_updated: uniqueFieldsUpdated,
                    retry_count: retryCount + 1,
                    enrichment_strategy: 'extract',
                    site_complexity: siteAnalysis.complexity,
                    pages_crawled: pagesScraped,
                    credits_used: creditsUsed,
                    extraction_quality_score: qualityScore,
                },
                null,
                supabaseClient
            );

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

            return { success: false, error: errorMessage };
        }
    }

    private static async runExtractStrategy(params: ExtractStrategyParams): Promise<ExtractStrategyResult> {
        const extractUrls = this.buildExtractUrlList(
            params.primarySourceUrl,
            params.primaryRegistrationUrl,
            params.priorityUrls,
            params.techMemeCandidates
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

        const sourceResult: FirecrawlScrapeResponse = {
            success: true,
            data: {
                json: representative,
                metadata: {
                    url: usablePages[0]?.url || params.primarySourceUrl,
                },
            },
            creditsUsed: extractResult.creditsUsed,
        };

        return {
            sourceResult,
            sourcePages: usablePages,
            pagesProcessed: usablePages.length,
            creditsUsed: extractResult.creditsUsed || usablePages.length,
            extractUrls,
        };
    }

    private static buildExtractUrlList(
        primarySourceUrl: string,
        primaryRegistrationUrl: string | null | undefined,
        priorityUrls: string[],
        techMemeCandidates: string[]
    ): string[] {
        const urls: string[] = [];
        const seen = new Set<string>();
        const addCandidate = (candidate?: string | null) => {
            if (!candidate) {
                return;
            }
            try {
                const normalized = normalizeUrl(candidate);
                if (!normalized || seen.has(normalized)) {
                    return;
                }
                urls.push(candidate);
                seen.add(normalized);
            } catch {
                // Ignore invalid URLs
            }
        };

        addCandidate(primarySourceUrl);

        if (shouldScrapeRegistrationUrl(primarySourceUrl, primaryRegistrationUrl)) {
            addCandidate(primaryRegistrationUrl);
        }

        for (const candidate of priorityUrls) {
            if (urls.length >= FIRECRAWL_EXTRACT_CONFIG.MAX_URLS) break;
            addCandidate(candidate);
        }

        for (const candidate of techMemeCandidates) {
            if (urls.length >= FIRECRAWL_EXTRACT_CONFIG.MAX_URLS) break;
            addCandidate(candidate);
        }

        return urls.slice(0, FIRECRAWL_EXTRACT_CONFIG.MAX_URLS);
    }

    private static flattenExtractResults(
        rawData: unknown,
        fallbackUrl: string
    ): {
        merged?: ExtractedEventData;
        pages: Array<{ url: string; markdown?: string; html?: string; json?: unknown }>;
    } {
        const pages: Array<{ url: string; markdown?: string; html?: string; json?: unknown }> = [];
        const payloads: ExtractedEventData[] = [];

        const pushEntry = (urlCandidate: unknown, data: unknown) => {
            if (!data || typeof data !== 'object') {
                return;
            }
            const url =
                typeof urlCandidate === 'string' && urlCandidate.trim().length > 0
                    ? urlCandidate
                    : fallbackUrl;
            const typed = data as ExtractedEventData;
            payloads.push(typed);
            pages.push({ url, json: typed });
        };

        const processValue = (value: unknown) => {
            if (Array.isArray(value)) {
                value.forEach(processValue);
                return;
            }

            if (value && typeof value === 'object') {
                const record = value as { url?: unknown; data?: unknown };
                if (record.data && typeof record.data === 'object') {
                    pushEntry(record.url, record.data);
                } else {
                    pushEntry(record.url, record);
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
        sourcePages?: Array<{ url: string; markdown?: string; html?: string; json?: unknown }>,
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
                if (!extracted.startTime && typeof payload.startTime === 'string') {
                    extracted.startTime = payload.startTime;
                }
                if (!extracted.endTime && typeof payload.endTime === 'string') {
                    extracted.endTime = payload.endTime;
                }
                if (!jsonDescription && typeof payload.description === 'string') {
                    jsonDescription = payload.description;
                }
                if (!extracted.imageUrl) {
                    const imageCandidate =
                        payload.imageUrl ??
                        (payload as { image_url?: unknown }).image_url ??
                        (payload as { heroImage?: unknown }).heroImage ??
                        (payload as { hero_image?: unknown }).hero_image;
                    if (typeof imageCandidate === 'string') {
                        extracted.imageUrl = imageCandidate;
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

        return extracted;
    }

    /**
     * Normalize daily schedule entries returned by Firecrawl into the format expected by events.daily_schedule
     * Handles partial data: accepts entries with only start time or only end time
     */
    private static normalizeDailySchedule(
        entries: EventDailyScheduleEntry[],
        timezone?: string | null
    ): Database['public']['Tables']['events']['Insert']['daily_schedule'] {
        if (!entries || entries.length === 0) {
            return null;
        }

        interface NormalizedScheduleEntry {
            day: number;
            start?: string;
            end?: string;
        }
        const normalizedEntries: NormalizedScheduleEntry[] = [];

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

        const jsonEntries = normalizedEntries.map((entry) => ({
            day: entry.day,
            ...(entry.start ? { start: entry.start } : {}),
            ...(entry.end ? { end: entry.end } : {}),
        }));

        const schedulePayload = {
            type: (allSameStart && allSameEnd ? 'daily_recurring' : 'daily_custom') as
                | 'daily_recurring'
                | 'daily_custom',
            custom_schedule: jsonEntries,
        } as Record<string, unknown>;

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

        return schedulePayload as Database['public']['Tables']['events']['Insert']['daily_schedule'];
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
    ): Promise<string[]> {
        const fieldsUpdated: string[] = [];

        try {
            // Get existing event times for validation
            const { data: existingEvent } = await supabaseClient
                .from('events')
                .select('start_time, end_time, daily_schedule, timezone, description')
                .eq('id', eventId)
                .single();

            const existingStartTime = (existingEvent?.start_time as string) || null;
            const existingEndTime = (existingEvent?.end_time as string) || null;
            const existingDailySchedule = existingEvent?.daily_schedule as Record<string, unknown> | null | undefined;
            const eventTimezone = (existingEvent?.timezone as string) || null;

            // Update start_time if provided and valid
            if (extractedData.startTime) {
                // Validate with original time - only reject if it exactly matches
                const validatedStartTime = this.validateAndNormalizeTime(extractedData.startTime, existingStartTime);
                
                if (validatedStartTime && validatedStartTime !== existingStartTime) {
                    await supabaseClient
                        .from('events')
                        .update({ start_time: validatedStartTime })
                        .eq('id', eventId);
                    fieldsUpdated.push('start_time');
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
                    await supabaseClient
                        .from('events')
                        .update({ end_time: validatedEndTime })
                        .eq('id', eventId);
                    fieldsUpdated.push('end_time');
                    console.log(`[FirecrawlEnrichmentService] Updated end_time for event ${eventId} from ${existingEndTime || 'null'} to ${validatedEndTime}`);
                } else if (!validatedEndTime) {
                    console.log(`[FirecrawlEnrichmentService] Rejected end_time for event ${eventId}: ${extractedData.endTime} (validation failed)`);
                } else {
                    console.log(`[FirecrawlEnrichmentService] Skipped end_time update for event ${eventId}: extracted time matches existing`);
                }
            }

            // Update description if provided
            if (extractedData.description) {
                const existingDescription = (existingEvent?.description as string) || '';
                const newDescription = extractedData.description;

                // Use normalized description (already has nav/footer filtered out)
                // normalizeDescription already does smart merging internally
                const mergedDescription = newDescription;

                if (mergedDescription !== existingDescription) {
                    await supabaseClient
                        .from('events')
                        .update({ description: mergedDescription })
                        .eq('id', eventId);
                    fieldsUpdated.push('description');
                    console.log(`[FirecrawlEnrichmentService] Updated description for event ${eventId} (${newDescription.length} chars, normalized)`);
                } else {
                    console.log(`[FirecrawlEnrichmentService] Skipped description update for event ${eventId} (no change after normalization)`);
                }
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
                        fieldsUpdated.push('daily_schedule');
                        console.log(`[FirecrawlEnrichmentService] Updated daily_schedule for event ${eventId}`);
                    } else {
                        console.log(`[FirecrawlEnrichmentService] Skipped daily_schedule update for event ${eventId}: no change detected`);
                    }
                } else {
                    console.log(`[FirecrawlEnrichmentService] Skipped daily_schedule update for event ${eventId}: unable to normalize extracted schedule`);
                }
            }

            // Update event image if provided
            if (extractedData.imageUrl) {
                await supabaseClient
                    .from('events')
                    .update({ event_image_url: extractedData.imageUrl })
                    .eq('id', eventId);
                fieldsUpdated.push('event_image_url');
                console.log(`[FirecrawlEnrichmentService] Updated event_image_url for event ${eventId}`);
            }

            // Create/update agenda items
            if (extractedData.agenda && extractedData.agenda.length > 0) {
                const agendaItems = extractedData.agenda.flatMap((item, index) => {
                    const title = (item.title ?? '').trim();

                    if (!title) {
                        return [];
                    }

                    // Convert ISO timestamps to TIME format (HH:MM:SS) if needed
                    // The database expects TIME type, but Firecrawl may return ISO timestamps
                    let startTime = item.startTime;
                    let endTime = item.endTime;
                    
                    // Convert startTime if it's an ISO timestamp
                    if (startTime && typeof startTime === 'string' && startTime.includes('T')) {
                        try {
                            const date = new Date(startTime);
                            if (!isNaN(date.getTime())) {
                                const hours = String(date.getUTCHours()).padStart(2, '0');
                                const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                                const converted = `${hours}:${minutes}:${seconds}`;
                                console.log(`[FirecrawlEnrichmentService] Converting agenda startTime: ${startTime} -> ${converted}`);
                                startTime = converted;
                            }
                        } catch (error) {
                            console.warn(`[FirecrawlEnrichmentService] Failed to parse agenda startTime: ${item.startTime}`, error);
                        }
                    }
                    
                    // Convert endTime if it's an ISO timestamp
                    if (endTime && typeof endTime === 'string' && endTime.includes('T')) {
                        try {
                            const date = new Date(endTime);
                            if (!isNaN(date.getTime())) {
                                const hours = String(date.getUTCHours()).padStart(2, '0');
                                const minutes = String(date.getUTCMinutes()).padStart(2, '0');
                                const seconds = String(date.getUTCSeconds()).padStart(2, '0');
                                const converted = `${hours}:${minutes}:${seconds}`;
                                console.log(`[FirecrawlEnrichmentService] Converting agenda endTime: ${endTime} -> ${converted}`);
                                endTime = converted;
                            }
                        } catch (error) {
                            console.warn(`[FirecrawlEnrichmentService] Failed to parse agenda endTime: ${item.endTime}`, error);
                        }
                    }
                    if (!startTime) {
                        return [];
                    }

                    if (!endTime) {
                        endTime = startTime;
                    }
                    
                    return [{
                        title,
                        startTime,
                        endTime,
                        type: item.track || 'other',
                        description: item.description ?? undefined,
                        location: item.location ?? undefined,
                        dayNumber: 1,
                        sortOrder: index,
                    }];
                });

                if (agendaItems.length > 0) {
                    await EventEnrichmentService.createOrUpdateAgendaItems(
                        eventId,
                        agendaItems,
                        supabaseClient
                    );
                    fieldsUpdated.push('agenda');
                    console.log(`[FirecrawlEnrichmentService] Updated agenda for event ${eventId} (${agendaItems.length} items)`);
                } else {
                    console.log(
                        `[FirecrawlEnrichmentService] Skipped agenda update for event ${eventId}: no agenda entries with valid title/start time`
                    );
                }
            }

            // Create/update speakers
            if (extractedData.speakers && extractedData.speakers.length > 0) {
                const speakers = extractedData.speakers.flatMap((speaker) => {
                    const name = (speaker.name ?? '').trim();
                    if (!name) {
                        return [];
                    }

                    return [
                        {
                            name,
                            title: speaker.title ?? undefined,
                            company: speaker.company ?? undefined,
                            bio: speaker.bio ?? undefined,
                            linkedinUrl: speaker.linkedinUrl ?? undefined,
                            photoUrl: speaker.photoUrl ?? undefined,
                            twitterUrl: speaker.twitterUrl ?? undefined,
                            websiteUrl: speaker.websiteUrl ?? undefined,
                        },
                    ];
                });

                if (speakers.length > 0) {
                    await EventEnrichmentService.createOrUpdateSpeakers(
                        eventId,
                        speakers,
                        supabaseClient
                    );
                    fieldsUpdated.push('speakers');
                    console.log(
                        `[FirecrawlEnrichmentService] Updated speakers for event ${eventId} (${speakers.length} speakers)`
                    );
                } else {
                    console.log(
                        `[FirecrawlEnrichmentService] Skipped speakers update for event ${eventId}: no speakers with valid names`
                    );
                }
            }

            // Update pricing if provided
            if (extractedData.pricing) {
                const updateData: Record<string, unknown> = {};
                
                if (extractedData.pricing.priceMin !== undefined) {
                    updateData.price_min = extractedData.pricing.priceMin;
                }
                if (extractedData.pricing.priceMax !== undefined) {
                    updateData.price_max = extractedData.pricing.priceMax;
                }
                if (extractedData.pricing.currency) {
                    updateData.currency = extractedData.pricing.currency;
                }
                if (extractedData.pricing.pricingType) {
                    updateData.pricing_type = extractedData.pricing.pricingType;
                }

                if (Object.keys(updateData).length > 0) {
                    await supabaseClient
                        .from('events')
                        .update(updateData)
                        .eq('id', eventId);
                    fieldsUpdated.push('pricing');
                    console.log(`[FirecrawlEnrichmentService] Updated pricing for event ${eventId}:`, updateData);
                }
            }

            // Create/update venue if provided
            if (extractedData.venue) {
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
                    fieldsUpdated.push('venue');
                    console.log(`[FirecrawlEnrichmentService] Updated venue for event ${eventId} (venue_id: ${venueResult.venueId})`);
                }
            }

            if (fieldsUpdated.length === 0) {
                console.log(`[FirecrawlEnrichmentService] No fields updated for event ${eventId} (extracted data: description=${!!extractedData.description}, image=${!!extractedData.imageUrl}, agenda=${extractedData.agenda?.length || 0}, speakers=${extractedData.speakers?.length || 0}, pricing=${!!extractedData.pricing}, venue=${!!extractedData.venue})`);
            }
        } catch (error) {
            console.error(`[FirecrawlEnrichmentService] Error updating event fields for ${eventId}:`, error);
            Sentry.captureException(error, {
                extra: { function: 'updateEventFields', eventId, extractedData },
            });
        }

        return fieldsUpdated;
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
                    firecrawl_enrichment_metadata:
                        metadata as Database['public']['Tables']['events']['Update']['firecrawl_enrichment_metadata'],
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
