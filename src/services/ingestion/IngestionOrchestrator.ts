/**
 * Ingestion Orchestrator
 * 
 * Orchestrates collector execution, maintains checkpoints, handles retries,
 * and persists results to source_events staging table.
 */

import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import { IngestionSourceService } from './IngestionSourceService';
import { RssCollector } from './collectors/RssCollector';
import { IcsCollector } from './collectors/IcsCollector';
import { ConfsTechCollector } from './collectors/ConfsTechCollector';
import { DevelopersEventsCollector } from './collectors/DevelopersEventsCollector';
import { MicrosoftEventsCollector } from './collectors/MicrosoftEventsCollector';
import { HtmlCollector } from './collectors/HtmlCollector';
import type { BaseCollector } from './collectors/BaseCollector';
import { FILTERING_CONFIG } from '@/config/ingestionConstants';
import * as Sentry from '@sentry/nextjs';
import { applyIngestionRecordCleanup } from './utils/recordCleanup';

// Supported collector types - only these can be processed
const SUPPORTED_COLLECTOR_TYPES = ['RSS', 'ICS', 'API', 'HTML'] as const;

/**
 * Validate source type is supported
 */
function validateSourceType(sourceType: string): void {
    if (!SUPPORTED_COLLECTOR_TYPES.includes(sourceType as typeof SUPPORTED_COLLECTOR_TYPES[number])) {
        throw new Error(
            `Unsupported source type: ${sourceType}. ` +
            `Supported types: ${SUPPORTED_COLLECTOR_TYPES.join(', ')}. ` +
            `Please use one of the supported types or implement a collector for this type.`
        );
    }
}

export interface OrchestratorResult {
    sourceId: string;
    sourceName: string;
    success: boolean;
    eventsFetched: number;
    recordsQueued: number;
    eventsNormalized: number;
    errors: number;
    errorMessage?: string;
}

export class IngestionOrchestrator {
    /**
     * Run ingestion for a single source
     */
    static async runSourceIngestion(
        sourceId: string,
        supabaseClient: SupabaseClientType
    ): Promise<OrchestratorResult> {
        const jobId = crypto.randomUUID();
        let eventsFetched = 0;
        let recordsQueued = 0;
        let errors = 0;

        try {
            // Get source configuration
            const source = await IngestionSourceService.getSourceById(sourceId, supabaseClient);
            if (!source) {
                throw new Error(`Source not found: ${sourceId}`);
            }

            if (!source.is_active) {
                return {
                    sourceId,
                    sourceName: source.name,
                    success: false,
                    eventsFetched: 0,
                    recordsQueued: 0,
                    eventsNormalized: 0,
                    errors: 0,
                    errorMessage: 'Source is not active',
                };
            }

            // Check blocklist
            const isBlocklisted = await IngestionSourceService.isBlocklisted(sourceId, supabaseClient);
            if (isBlocklisted) {
                return {
                    sourceId,
                    sourceName: source.name,
                    success: false,
                    eventsFetched: 0,
                    recordsQueued: 0,
                    eventsNormalized: 0,
                    errors: 0,
                    errorMessage: 'Source is blocklisted',
                };
            }

            // Create ingestion job record
            const { error: jobError } = await supabaseClient
                .from('ingestion_jobs')
                .insert({
                    id: jobId,
                    source_id: sourceId,
                    status: 'running',
                });

            if (jobError) {
                throw new Error(`Failed to create job: ${jobError.message}`);
            }

            try {
                // Get appropriate collector
                const collector = this.getCollector(source);

                console.log(`[IngestionOrchestrator] Starting collection for ${source.name} from ${source.source_url}`);
                
                // Collect events
                const result = await collector.collect();
                eventsFetched = result.records.length;
                
                console.log(`[IngestionOrchestrator] Collected ${eventsFetched} events, ${result.errors.length} errors from ${source.name}`);

                // Persist to source_events staging table
                console.log(`[IngestionOrchestrator] Persisting ${result.records.length} records to source_events`);
                
                for (const { record, rawItem } of result.records) {
                    try {
                        const stagedRecord = structuredClone(record);
                        applyIngestionRecordCleanup(stagedRecord);

                        // Use provenance hash directly (already calculated from stable fields by collector)
                        // This ensures consistency and avoids recalculation issues
                        const checksum = record.provenance.raw_hash;

                        // Insert into source_events
                        const { error: insertError } = await supabaseClient
                            .from('source_events')
                            .insert({
                                source_id: sourceId,
                                fetch_job_id: jobId,
                                raw_payload: {
                                    record: stagedRecord,
                                    provenance: stagedRecord.provenance,
                                    rawItem, // Store raw item for reprocessing if needed
                                } as unknown as Database['public']['Tables']['source_events']['Insert']['raw_payload'],
                                checksum,
                                fetch_status: 'pending', // Will be processed by normalizer
                            });

                        if (insertError) {
                            console.error('Error inserting source event:', insertError);
                            errors++;
                            await this.logError(
                                sourceId,
                                jobId,
                                supabaseClient,
                                'insert_error',
                                `Failed to insert source event: ${insertError.message}`
                            );
                        } else {
                            recordsQueued++;
                            if (recordsQueued % 10 === 0) {
                                console.log(`[IngestionOrchestrator] Queued ${recordsQueued}/${result.records.length} source events for normalization`);
                            }
                        }
                    } catch (error) {
                        console.error('Error processing record:', error);
                        errors++;
                        await this.logError(
                            sourceId,
                            jobId,
                            supabaseClient,
                            'processing_error',
                            error instanceof Error ? error.message : 'Unknown error'
                        );
                    }
                }

                // Log collection errors
                if (result.errors.length > 0) {
                    console.log(`[IngestionOrchestrator] Logging ${result.errors.length} collection error(s)`);
                }
                for (const error of result.errors) {
                    await this.logError(
                        sourceId,
                        jobId,
                        supabaseClient,
                        error.type,
                        error.message,
                        error.details
                    );
                    errors++;
                }

                // Update job status
                console.log(`[IngestionOrchestrator] Job ${jobId} completed: ${eventsFetched} fetched, ${recordsQueued} queued, ${errors} errors`);
                await supabaseClient
                    .from('ingestion_jobs')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString(),
                        events_fetched: eventsFetched,
                        events_normalized: recordsQueued,
                        errors_count: errors,
                    })
                    .eq('id', jobId);

                // Update last_fetched timestamp
                await IngestionSourceService.updateLastFetched(sourceId, supabaseClient);

                // Process normalization for newly fetched events (optional - can be done separately)
                // For now, we'll normalize in a separate step, but this could be done here
                // const normalizationResult = await NormalizationProcessor.processPendingEvents(supabaseClient, recordsQueued);

                return {
                    sourceId,
                    sourceName: source.name,
                    success: true,
                    eventsFetched,
                    recordsQueued,
                    eventsNormalized: recordsQueued,
                    errors,
                };
            } catch (collectionError) {
                // Mark job as failed
                await supabaseClient
                    .from('ingestion_jobs')
                    .update({
                        status: 'failed',
                        completed_at: new Date().toISOString(),
                        errors_count: errors + 1,
                    })
                    .eq('id', jobId);

                throw collectionError;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Orchestrator error:', error);
            
            Sentry.captureException(error, {
                extra: { function: 'runSourceIngestion', sourceId },
            });

            return {
                sourceId,
                sourceName: 'Unknown',
                success: false,
                eventsFetched,
                recordsQueued,
                eventsNormalized: recordsQueued,
                errors: errors + 1,
                errorMessage,
            };
        }
    }

    /**
     * Run ingestion for all active sources
     * @param forceFetch - If true, bypass fetch_interval_minutes check (useful for manual triggers)
     */
    static async runAllActiveSources(
        supabaseClient: SupabaseClientType,
        forceFetch: boolean = false
    ): Promise<OrchestratorResult[]> {
        const sources = await IngestionSourceService.getActiveSources(supabaseClient);
        const results: OrchestratorResult[] = [];

        console.log(`[IngestionOrchestrator] Found ${sources.length} active source(s), forceFetch: ${forceFetch}`);

        for (const source of sources) {
            // Check if source needs fetching (based on fetch_interval_minutes)
            // Skip this check if forceFetch is true (for manual triggers)
            if (!forceFetch && source.last_fetched_at) {
                const lastFetched = new Date(source.last_fetched_at);
                const now = new Date();
                const minutesSinceLastFetch = (now.getTime() - lastFetched.getTime()) / (1000 * 60);

                if (minutesSinceLastFetch < source.fetch_interval_minutes) {
                    // Skip if not enough time has passed
                    console.log(`[IngestionOrchestrator] Skipping ${source.name}: fetched ${minutesSinceLastFetch.toFixed(1)}m ago, interval is ${source.fetch_interval_minutes}m`);
                    continue;
                }
            }

            console.log(`[IngestionOrchestrator] Processing source: ${source.name} (${source.source_type})`);
            const result = await this.runSourceIngestion(source.id, supabaseClient);
            results.push(result);

            // Small delay between sources to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, FILTERING_CONFIG.SOURCE_DELAY_MS));
        }

        console.log(`[IngestionOrchestrator] Completed processing ${results.length} source(s)`);
        return results;
    }

    /**
     * Get appropriate collector instance for source type
     */
    private static getCollector(
        source: Awaited<ReturnType<typeof IngestionSourceService.getSourceById>>
    ): BaseCollector {
        if (!source) {
            throw new Error('Source is required');
        }

        // Validate source type before creating collector
        validateSourceType(source.source_type);

        switch (source.source_type) {
            case 'RSS':
                return new RssCollector({
                    sourceId: source.id,
                    sourceUrl: source.source_url,
                    metadata: source.metadata as unknown as Record<string, unknown>,
                });
            case 'ICS':
                return new IcsCollector({
                    sourceId: source.id,
                    sourceUrl: source.source_url,
                    metadata: source.metadata as unknown as Record<string, unknown>,
                });
            case 'API': {
                const metadata = (source.metadata ?? {}) as Record<string, unknown>;
                if ((metadata.provider as string | undefined) === 'confs.tech') {
                    return new ConfsTechCollector({
                        sourceId: source.id,
                        sourceUrl: source.source_url,
                        metadata,
                    });
                }
                if ((metadata.provider as string | undefined) === 'developers.events') {
                    return new DevelopersEventsCollector({
                        sourceId: source.id,
                        sourceUrl: source.source_url,
                        metadata,
                    });
                }
                if ((metadata.provider as string | undefined) === 'microsoft.events') {
                    return new MicrosoftEventsCollector({
                        sourceId: source.id,
                        sourceUrl: source.source_url,
                        metadata,
                    });
                }
                throw new Error(`Unsupported API provider for source ${source.name}`);
            }
            case 'HTML':
                return new HtmlCollector({
                    sourceId: source.id,
                    sourceUrl: source.source_url,
                    metadata: source.metadata as unknown as Record<string, unknown>,
                });
            default:
                // This should never happen due to validateSourceType, but TypeScript requires it
                throw new Error(`Collector not implemented for type: ${source.source_type}`);
        }
    }


    /**
     * Log error to ingestion_errors table
     */
    private static async logError(
        sourceId: string,
        jobId: string | null,
        supabaseClient: SupabaseClientType,
        errorType: string,
        errorMessage: string,
        errorDetails?: Record<string, unknown>
    ): Promise<void> {
        try {
            await supabaseClient
                .from('ingestion_errors')
                .insert({
                    source_id: sourceId,
                    job_id: jobId,
                    error_type: errorType,
                    error_message: errorMessage,
                    error_details: (errorDetails || {}) as unknown as Database['public']['Tables']['ingestion_errors']['Insert']['error_details'],
                });
        } catch (error) {
            console.error('Failed to log error:', error);
            // Don't throw - error logging should not break the pipeline
        }
    }
}
