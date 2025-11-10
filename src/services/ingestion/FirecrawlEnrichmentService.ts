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
    EventDailyScheduleEntry,
    FirecrawlScrapeResponse,
    FirecrawlExtractResponse,
} from '@/types/firecrawl';
import { EventEnrichmentService } from './EventEnrichmentService';
import { FirecrawlSiteAnalyzer, type SiteAnalysis } from './FirecrawlSiteAnalyzer';
import { calculateQualityScore } from './FirecrawlDataNormalizer';
import { extractionPrompts, getSemanticEventSchema } from './FirecrawlExtractionPrompts';
import {
    RETRY_CONFIG,
    FIRECRAWL_EXTRACT_CONFIG,
    FIRECRAWL_EXTRACT_DEFAULTS,
    getFirecrawlConfig,
    getFirecrawlTimeout,
    isBlockedDomain as isBlockedDomainConfig,
} from '@/config/ingestionConstants';
import { normalizeUrl, resolveTechMemeRedirect, isTechMemeRedirect } from './utils/urlResolver';
import {
    resolveMetadataUrl,
    shouldScrapeRegistrationUrl,
    validateAndNormalizeTime,
    convertToHHMM,
    formatDateToHHMM,
    calculateNextRetryAt,
    createTimeoutPromise,
} from './utils/firecrawlHelpers';
import { flattenExtractResults, extractEventFields } from './utils/dataExtraction';
import { firecrawlCircuitBreaker } from './utils/circuitBreaker';
import * as Sentry from '@sentry/nextjs';

interface ExtractStrategyParams {
    primarySourceUrl: string;
    primaryRegistrationUrl?: string | null;
    siteAnalysis: SiteAnalysis;
    semanticSchema: { type: string; properties: Record<string, unknown> };
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

/**
 * Firecrawl client adapter with retry and timeout handling
 */
class FirecrawlClientAdapter {
    private client: Firecrawl | null = null;
    private config: ReturnType<typeof getFirecrawlConfig> | null = null;

    /**
     * Get or initialize the Firecrawl client (lazy initialization)
     */
    private getClient(): Firecrawl | null {
        // Re-check config on each call in case env vars were loaded after module import
        const currentConfig = getFirecrawlConfig();
        
        if (!this.config) {
            this.config = currentConfig;
        } else {
            // Re-check config to handle cases where env vars are loaded late
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
     * Poll for extract job status until completion or timeout
     */
    private async pollExtractStatus(
        client: Firecrawl,
        jobId: string,
        expiresAt?: string
    ): Promise<ExtractApiResult> {
        const maxAttempts = FIRECRAWL_EXTRACT_CONFIG.POLL_MAX_ATTEMPTS;
        const pollInterval = FIRECRAWL_EXTRACT_CONFIG.POLL_INTERVAL_MS;

        // Check if job has expired
        if (expiresAt) {
            const expiresDate = new Date(expiresAt);
            if (expiresDate < new Date()) {
                throw new Error(`Extract job ${jobId} has expired (expiresAt: ${expiresAt})`);
            }
        }

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));

            try {
                const statusResult = await client.getExtractStatus(jobId);
                const result = statusResult as ExtractApiResult;

                Sentry.addBreadcrumb({
                    message: `Polling extract job ${jobId}`,
                    level: 'info',
                    data: {
                        attempt: attempt + 1,
                        status: result.status,
                        jobId,
                    },
                });

                if (result.status === 'completed') {
                    return result;
                }

                if (result.status === 'failed' || result.status === 'cancelled') {
                    return {
                        ...result,
                        success: false,
                        error: result.error || `Job ${result.status}`,
                    };
                }

                // Check expiration again
                if (result.expiresAt) {
                    const expiresDate = new Date(result.expiresAt);
                    if (expiresDate < new Date()) {
                        throw new Error(`Extract job ${jobId} expired during polling (expiresAt: ${result.expiresAt})`);
                    }
                }

                // Continue polling if still processing
                if (result.status === 'processing') {
                    continue;
                }

                // Unknown status, return as-is
                return result;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                console.warn(
                    `[FirecrawlEnrichmentService] Error polling job ${jobId} (attempt ${attempt + 1}/${maxAttempts}):`,
                    errorMessage
                );

                // On last attempt, throw the error
                if (attempt === maxAttempts - 1) {
                    throw new Error(`Failed to poll extract job ${jobId} after ${maxAttempts} attempts: ${errorMessage}`);
                }
            }
        }

        throw new Error(`Extract job ${jobId} did not complete within ${maxAttempts} polling attempts`);
    }

    /**
     * Extract structured data from one or more URLs using the /extract endpoint
     * This endpoint handles crawling and extraction in a single call
     * Uses SDK object form with scrapeOptions for better JSON extraction
     */
    async extractFromUrls(
        urls: string[],
        jsonSchema: { type: string; properties: Record<string, unknown> } | null,
        prompt: string | null,
        options?: {
            enableWebSearch?: boolean;
            agent?: { model?: string };
        }
    ): Promise<{ success: boolean; data?: unknown; error?: string; creditsUsed?: number; status?: string; id?: string; expiresAt?: string }> {
        // Check circuit breaker
        if (!firecrawlCircuitBreaker.canProceed()) {
            return {
                success: false,
                error: 'Circuit breaker is open - Firecrawl API is temporarily unavailable',
            };
        }

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
            // Extract endpoint can take longer, especially with multiple URLs
            const extractTimeout = getFirecrawlTimeout('extract') * 2;
            const timeoutPromise = createTimeoutPromise<ExtractApiResult>(extractTimeout, 'extract');

            // Build extract options in SDK object form
            const extractOptions: {
                urls: string[];
                prompt?: string;
                schema?: { type: string; properties: Record<string, unknown> };
                scrapeOptions?: {
                    formats: Array<{
                        type: 'json';
                        prompt?: string;
                        schema?: { type: string; properties: Record<string, unknown> };
                    }>;
                };
                enableWebSearch?: boolean;
                agent?: { model?: string };
            } = {
                urls,
            };

            // Add prompt and schema if provided
            if (prompt) {
                extractOptions.prompt = prompt;
            }
            if (jsonSchema) {
                extractOptions.schema = jsonSchema;
            }

            // Add scrapeOptions with JSON format for better extraction
            if (jsonSchema || prompt) {
                extractOptions.scrapeOptions = {
                    formats: [
                        {
                            type: 'json',
                            ...(prompt && { prompt }),
                            ...(jsonSchema && { schema: jsonSchema }),
                        },
                    ],
                };
            }

            // Add enableWebSearch if provided
            if (options?.enableWebSearch !== undefined) {
                extractOptions.enableWebSearch = options.enableWebSearch;
            }

            // Add agent if provided
            if (options?.agent) {
                extractOptions.agent = options.agent;
            }

            // Log request (without sensitive data)
            console.log(`[FirecrawlEnrichmentService] Extracting from ${urls.length} URL(s)`, {
                urlCount: urls.length,
                hasSchema: !!jsonSchema,
                hasPrompt: !!prompt,
                enableWebSearch: extractOptions.enableWebSearch,
                useAgent: !!extractOptions.agent,
            });

            Sentry.addBreadcrumb({
                message: 'Starting Firecrawl extract',
                level: 'info',
                data: {
                    urlCount: urls.length,
                    hasSchema: !!jsonSchema,
                    hasPrompt: !!prompt,
                    enableWebSearch: extractOptions.enableWebSearch,
                    useAgent: !!extractOptions.agent,
                },
            });

            const extractPromise = client.extract(extractOptions as unknown as Parameters<typeof client.extract>[0]);
            const raceResult = await Promise.race([extractPromise, timeoutPromise]);
            let result = raceResult as ExtractApiResult;

            // Handle async job status - poll if processing
            if (result.status === 'processing' && result.id) {
                console.log(`[FirecrawlEnrichmentService] Extract job ${result.id} is processing, starting polling...`);
                Sentry.addBreadcrumb({
                    message: 'Extract job started, polling for completion',
                    level: 'info',
                    data: {
                        jobId: result.id,
                        expiresAt: result.expiresAt,
                    },
                });

                try {
                    result = await this.pollExtractStatus(client, result.id, result.expiresAt);
                    console.log(`[FirecrawlEnrichmentService] Extract job ${result.id} completed with status: ${result.status}`);
                } catch (pollError) {
                    firecrawlCircuitBreaker.recordFailure();
                    const pollErrorMessage = pollError instanceof Error ? pollError.message : 'Unknown error';
                    console.error(`[FirecrawlEnrichmentService] Polling failed for job ${result.id}:`, pollErrorMessage);

                    Sentry.captureException(pollError, {
                        extra: {
                            jobId: result.id,
                            operation: 'pollExtractStatus',
                        },
                    });

                    return {
                        success: false,
                        error: `Polling failed: ${pollErrorMessage}`,
                        status: 'failed',
                        id: result.id,
                        expiresAt: result.expiresAt,
                    };
                }
            }

            if (!result.success) {
                firecrawlCircuitBreaker.recordFailure();
                return {
                    success: false,
                    error: result.error || 'Extract failed',
                    status: result.status,
                    id: result.id,
                    expiresAt: result.expiresAt,
                };
            }

            firecrawlCircuitBreaker.recordSuccess();
            Sentry.addBreadcrumb({
                message: 'Extract job completed successfully',
                level: 'info',
                data: {
                    jobId: result.id,
                    creditsUsed: result.creditsUsed,
                },
            });

            return {
                success: true,
                data: result.data,
                creditsUsed: result.creditsUsed,
                status: result.status || 'completed',
                id: result.id,
                expiresAt: result.expiresAt,
            };
        } catch (error) {
            firecrawlCircuitBreaker.recordFailure();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(
                `[FirecrawlEnrichmentService] Extract failed for URLs ${urls.join(', ')}:`,
                errorMessage
            );

            Sentry.captureException(error, {
                extra: {
                    urls,
                    operation: 'extractFromUrls',
                },
            });

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    isEnabled(): boolean {
        const config = this.config || getFirecrawlConfig();
        return config.enabled;
    }
}

// Singleton client adapter
const firecrawlClient = new FirecrawlClientAdapter();

export class FirecrawlEnrichmentService {
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
        const config = getFirecrawlConfig();

        // Early exit if disabled or no API key
        if (!config.enabled) {
            console.log(`[FirecrawlEnrichmentService] Enrichment disabled or no API key. enabled=${config.enabled}, hasApiKey=${!!config.apiKey}`);
            return;
        }

        console.log(`[FirecrawlEnrichmentService] Enqueueing enrichment for event ${eventId}, sourceUrl=${sourceUrl}`);

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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[FirecrawlEnrichmentService] Failed to enqueue enrichment for event ${eventId}:`, errorMessage);
            Sentry.captureException(error, {
                extra: {
                    eventId,
                    sourceUrl,
                    operation: 'enqueueEnrichment',
                },
            });
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
        const config = getFirecrawlConfig();

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

        // Type guard for event data
        const eventData = event as unknown as {
            id: string;
            source_url: string | null;
            registration_url: string | null;
            description: string | null;
            firecrawl_enrichment_metadata: unknown;
        };

        // Check retry count and exponential backoff
        const metadata = (eventData.firecrawl_enrichment_metadata as FirecrawlEnrichmentMetadata) || {};
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

        // Check circuit breaker
        if (!firecrawlCircuitBreaker.canProceed()) {
            const nextRetryAt = calculateNextRetryAt(retryCount);
            await this.updateEnrichmentStatus(
                eventId,
                'pending',
                {
                    ...metadata,
                    next_retry_at: nextRetryAt.toISOString(),
                    retry_count: retryCount,
                },
                null,
                supabaseClient
            );
            return {
                success: false,
                error: 'Circuit breaker is open - Firecrawl API is temporarily unavailable',
            };
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
            const sourceUrl = eventData.source_url as string;
            const registrationUrl = eventData.registration_url as string | null | undefined;

            if (!sourceUrl) {
                throw new Error(`Event has no source_url: ${eventId}`);
            }

            let primarySourceUrl = sourceUrl;
            const techMemeSourceCandidates = isTechMemeRedirect(sourceUrl as string)
                ? resolveTechMemeRedirect(sourceUrl as string)
                : [];

            if (techMemeSourceCandidates.length > 0) {
                primarySourceUrl = techMemeSourceCandidates[0];
                console.log(
                    `[FirecrawlEnrichmentService] Resolved TechMeme source redirect for event ${eventId}: ${sourceUrl} -> ${primarySourceUrl}`
                );
            }

            let primaryRegistrationUrl = registrationUrl;
            if (registrationUrl && isTechMemeRedirect(registrationUrl as string)) {
                const registrationCandidates = resolveTechMemeRedirect(registrationUrl as string);
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
            const semanticSchema = getSemanticEventSchema();

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
                resolveMetadataUrl(sourceResult?.data?.metadata) ||
                (eventData.source_url || primarySourceUrl);
            const finalRegistrationUrl = primaryRegistrationUrl || eventData.registration_url || null;

            // Log redirect chain
            if (finalSourceUrl !== primarySourceUrl) {
                console.log(`[FirecrawlEnrichmentService] Redirect chain for source URL: ${primarySourceUrl} -> ${finalSourceUrl}`);
            }
            if (primaryRegistrationUrl && finalRegistrationUrl && finalRegistrationUrl !== primaryRegistrationUrl) {
                console.log(`[FirecrawlEnrichmentService] Redirect chain for registration URL: ${primaryRegistrationUrl} -> ${finalRegistrationUrl}`);
            }

            // Check if final URLs are in blocklist
            if (isBlockedDomainConfig(finalSourceUrl)) {
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
            const existingDescription = (eventData.description as string) || undefined;
            const normalizedExtractedData = extractEventFields(
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
            const nextRetryAt = calculateNextRetryAt(retryCount);

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
            params.techMemeCandidates,
            params.siteAnalysis
        );

        // Determine enableWebSearch based on site complexity and defaults
        const enableWebSearch =
            FIRECRAWL_EXTRACT_DEFAULTS.ENABLE_WEB_SEARCH ||
            params.siteAnalysis.complexity === 'COMPLEX' ||
            params.siteAnalysis.needsMultiPageCrawl;

        // Determine agent usage based on complexity and defaults
        const useAgent =
            FIRECRAWL_EXTRACT_DEFAULTS.USE_AGENT &&
            params.siteAnalysis.complexity === 'COMPLEX';

        const agentOptions = useAgent
            ? {
                  model: FIRECRAWL_EXTRACT_DEFAULTS.AGENT_MODEL || 'FIRE-1',
              }
            : undefined;

        console.log(
            `[FirecrawlEnrichmentService] Extract options for ${params.primarySourceUrl}:`,
            {
                enableWebSearch,
                useAgent: !!agentOptions,
                complexity: params.siteAnalysis.complexity,
                needsMultiPageCrawl: params.siteAnalysis.needsMultiPageCrawl,
            }
        );

        const extractResult = await firecrawlClient.extractFromUrls(
            extractUrls,
            params.semanticSchema,
            params.extractionPrompt,
            {
                enableWebSearch,
                agent: agentOptions,
            }
        );

        if (!extractResult.success || !extractResult.data) {
            throw new Error(
                `Firecrawl extract failed for ${params.primarySourceUrl}: ${
                    extractResult.error || extractResult.status || 'unknown error'
                }`
            );
        }

        const { merged, pages } = flattenExtractResults(extractResult.data, params.primarySourceUrl);
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
        techMemeCandidates: string[],
        siteAnalysis?: SiteAnalysis
    ): string[] {
        // Optional wildcard support: if site is clearly multi-page with high confidence,
        // we could use a wildcard pattern like `${origin}/*` instead of specific URLs.
        // For now, we use precise URL lists for better cost control and predictability.
        // To enable wildcards, set FIRECRAWL_USE_WILDCARDS=true and ensure high confidence.
        const useWildcards = process.env.FIRECRAWL_USE_WILDCARDS === 'true' &&
            siteAnalysis &&
            siteAnalysis.complexity === 'COMPLEX' &&
            siteAnalysis.confidence > 0.8;

        if (useWildcards) {
            try {
                const urlObj = new URL(primarySourceUrl);
                const wildcardUrl = `${urlObj.origin}/*`;
                console.log(`[FirecrawlEnrichmentService] Using wildcard URL pattern: ${wildcardUrl}`);
                return [wildcardUrl];
            } catch {
                // Fall through to precise URL list if wildcard construction fails
            }
        }

        // Default: precise URL list for cost control and predictability
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


    /**
     * Normalize daily schedule entries returned by Firecrawl into the format expected by events.daily_schedule
     * Handles partial data: accepts entries with only start time or only end time
     */
    private static normalizeDailySchedule(
        entries: EventDailyScheduleEntry[],
        timezone?: string | null
    ): Record<string, unknown> | null {
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
            const start = entry.startTime ? convertToHHMM(entry.startTime, timezone) : null;
            const end = entry.endTime ? convertToHHMM(entry.endTime, timezone) : null;

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

        return schedulePayload;
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
                return formatDateToHHMM(date, timezone);
            }
        }

        return null;
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

            const existingEventData = existingEvent as unknown as {
                start_time: string | null;
                end_time: string | null;
                daily_schedule: unknown;
                timezone: string | null;
                description: string | null;
            } | null;

            const existingStartTime = existingEventData?.start_time || null;
            const existingEndTime = existingEventData?.end_time || null;
            const existingDailySchedule = existingEventData?.daily_schedule as Record<string, unknown> | null | undefined;
            const eventTimezone = existingEventData?.timezone || null;

            // Update start_time if provided and valid
            if (extractedData.startTime) {
                // Validate with original time - only reject if it exactly matches
                const validatedStartTime = validateAndNormalizeTime(extractedData.startTime, existingStartTime);
                
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
                const validatedEndTime = validateAndNormalizeTime(extractedData.endTime, existingEndTime);
                
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
                const existingDescription = existingEventData?.description || '';
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
                            .update({ daily_schedule: normalizedSchedule as unknown as Record<string, unknown> })
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
                const agendaItems = extractedData.agenda.map((item, index) => {
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
                    
                    return {
                        title: item.title!,
                        startTime: startTime || '',
                        endTime: endTime || '',
                        type: item.track || 'other',
                        description: item.description || undefined,
                        location: item.location || undefined,
                        dayNumber: 1,
                        sortOrder: index,
                    };
                });

                await EventEnrichmentService.createOrUpdateAgendaItems(
                    eventId,
                    agendaItems,
                    supabaseClient
                );
                fieldsUpdated.push('agenda');
                console.log(`[FirecrawlEnrichmentService] Updated agenda for event ${eventId} (${extractedData.agenda.length} items)`);
            }

            // Create/update speakers
            if (extractedData.speakers && extractedData.speakers.length > 0) {
                const speakers = extractedData.speakers
                    .filter(speaker => speaker.name) // Filter out speakers without required name
                    .map(speaker => ({
                        name: speaker.name!,
                        title: speaker.title || undefined,
                        company: speaker.company || undefined,
                        bio: speaker.bio || undefined,
                        linkedinUrl: speaker.linkedinUrl || undefined,
                        photoUrl: speaker.photoUrl || undefined,
                        twitterUrl: speaker.twitterUrl || undefined,
                        websiteUrl: speaker.websiteUrl || undefined,
                    }));

                await EventEnrichmentService.createOrUpdateSpeakers(
                    eventId,
                    speakers,
                    supabaseClient
                );
                fieldsUpdated.push('speakers');
                console.log(`[FirecrawlEnrichmentService] Updated speakers for event ${eventId} (${extractedData.speakers.length} speakers)`);
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
                    firecrawl_enrichment_metadata: metadata as unknown as Record<string, unknown>,
                } as Record<string, unknown>)
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
                const eventData = event as unknown as {
                    firecrawl_enrichment_status: string | null;
                    firecrawl_enrichment_metadata: unknown;
                };
                const metadata = eventData.firecrawl_enrichment_metadata as FirecrawlEnrichmentMetadata | null;
                if (!metadata) continue;

                const credits = metadata.credits_used || 0;
                const status = eventData.firecrawl_enrichment_status || 'unknown';

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
