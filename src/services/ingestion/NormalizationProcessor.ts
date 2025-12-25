/**
 * Normalization Processor
 * 
 * Processes pending source_events through the normalization pipeline.
 * Can be called from orchestrator or run as a separate batch job.
 */

import type { SupabaseClientType } from '@/types';
import type { Database } from '@/types/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import { EventNormalizer } from './EventNormalizer';
import { OrganizerEnrichmentService } from './OrganizerEnrichmentService';
import { EventDeduplicationService } from './EventDeduplicationService';
import { QualityScoringService } from './QualityScoringService';
import { EventFilterService } from './EventFilterService';
import { IngestionSourceService } from './IngestionSourceService';
import { EventUpdateService } from './EventUpdateService';
import type { EventSourceRecord } from '@/types/ingestion';
import { RETRY_CONFIG } from '@/config/ingestionConstants';
import { applyUrlCanonicalization } from './utils/urlCanonicalizer';
import * as Sentry from '@sentry/nextjs';
import { cleanEventDescription } from '@/utils/ingestion/DescriptionCleaner';
import { isDescriptionThin } from '@/utils/ingestion/DescriptionHeuristics';

const PER_EVENT_TIMEOUT_MS = 90_000; // 90s safety guard per event

export interface NormalizationResult {
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ sourceEventId: string; error: string }>;
}

// Retry metadata interface
interface RetryMetadata {
    error: string;
    retry_count: number;
    last_retry_at?: string;
    next_retry_at: string;
}

/**
 * Encode retry metadata into error_message field as JSON string
 */
function encodeRetryMetadata(error: string, retryCount: number, lastRetryAt?: string): string {
    const now = new Date();
    const delay = Math.min(
        RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS
    );
    const nextRetryAt = new Date(now.getTime() + delay);

    const metadata: RetryMetadata = {
        error,
        retry_count: retryCount,
        last_retry_at: lastRetryAt || now.toISOString(),
        next_retry_at: nextRetryAt.toISOString(),
    };

    return JSON.stringify(metadata);
}

/**
 * Decode retry metadata from error_message field
 */
function decodeRetryMetadata(errorMessage: string | null): RetryMetadata | null {
    if (!errorMessage) return null;

    try {
        const parsed = JSON.parse(errorMessage);
        // Check if it has retry metadata structure
        if (parsed && typeof parsed === 'object' && 'retry_count' in parsed && 'next_retry_at' in parsed) {
            return parsed as RetryMetadata;
        }
    } catch {
        // Not JSON or not retry metadata - return null
    }

    return null;
}

/**
 * Check if an event with error status should be retried
 */
function shouldRetry(errorMessage: string | null): boolean {
    const metadata = decodeRetryMetadata(errorMessage);
    if (!metadata) {
        // No retry metadata means first failure - eligible for retry
        return true;
    }

    // Check if max retries exceeded
    if (metadata.retry_count >= RETRY_CONFIG.MAX_ATTEMPTS_NORMALIZATION) {
        return false;
    }

    // Check if next retry time has passed
    const nextRetryAt = new Date(metadata.next_retry_at);
    const now = new Date();
    return now >= nextRetryAt;
}

type ClaimPendingSourceEventsReturn = Database['public']['Functions']['claim_pending_source_events']['Returns'];
type ClaimedSourceEvent = {
    id: string;
    source_id: string;
    fetch_job_id: string | null;
    raw_payload: Database['public']['Tables']['source_events']['Row']['raw_payload'];
    checksum: string;
    fetch_status: string;
    normalized_event_id: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
};

type FallbackSourceEventRow = Database['public']['Tables']['source_events']['Row'];

const mapToClaimedEvents = (
    events: Array<ClaimPendingSourceEventsReturn[number] | FallbackSourceEventRow>
): ClaimedSourceEvent[] =>
    events.map((event) => ({
        id: event.id,
        source_id: event.source_id,
        fetch_job_id: (event as { fetch_job_id?: string | null }).fetch_job_id ?? null,
        raw_payload: event.raw_payload,
        checksum: event.checksum,
        fetch_status: event.fetch_status,
        normalized_event_id: (event as { normalized_event_id?: string | null }).normalized_event_id ?? null,
        error_message: (event as { error_message?: string | null }).error_message ?? null,
        created_at: event.created_at,
        updated_at: (event as { updated_at?: string }).updated_at ?? event.created_at,
    }));

/**
 * Wrap a promise with a timeout to avoid long-running per-event work.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout: per-event limit exceeded')), ms);
        promise
            .then((val) => {
                clearTimeout(timer);
                resolve(val);
            })
            .catch((err) => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

type FilterAnalyticsInsert = {
    source_event_id: string;
    source_id: string;
    filter_reason: string;
    matched_pattern: string | null;
    filter_category: string | null;
};

const insertFilterAnalytics = async (
    supabaseClient: SupabaseClientType,
    payload: FilterAnalyticsInsert
): Promise<void> => {
    const extendedClient = supabaseClient as unknown as {
        from: (
            relation: 'ingestion_events_filters'
        ) => {
            insert(values: FilterAnalyticsInsert): Promise<{ error: PostgrestError | null }>;
        };
    };

    const { error } = await extendedClient
        .from('ingestion_events_filters')
        .insert(payload);

    if (error) {
        throw error;
    }
};

export class NormalizationProcessor {
    /**
     * Process all pending source_events
     * 
     * Uses atomic UPDATE to mark events as "processing" before normalization
     * to prevent race conditions when multiple cron jobs run simultaneously.
     */
    static async processPendingEvents(
        supabaseClient: SupabaseClientType,
        limit: number = 100
    ): Promise<NormalizationResult> {
        try {
            // First, get error events eligible for retry and reset them to pending
            const { data: errorEvents } = await supabaseClient
                .from('source_events')
                .select('id, error_message')
                .eq('fetch_status', 'error')
                .limit(limit);

            if (errorEvents && errorEvents.length > 0) {
                const eligibleForRetry: string[] = [];
                const now = new Date();

                for (const event of errorEvents) {
                    if (shouldRetry(event.error_message)) {
                        const metadata = decodeRetryMetadata(event.error_message);
                        const newRetryCount = metadata ? metadata.retry_count + 1 : 1;
                        const newErrorMessage = encodeRetryMetadata(
                            metadata?.error || event.error_message || 'Unknown error',
                            newRetryCount,
                            now.toISOString()
                        );

                        // Reset status to pending with updated retry metadata
                        await supabaseClient
                            .from('source_events')
                            .update({
                                fetch_status: 'pending',
                                error_message: newErrorMessage,
                            })
                            .eq('id', event.id);

                        eligibleForRetry.push(event.id);
                    }
                }

                if (eligibleForRetry.length > 0) {
                    console.log(`[NormalizationProcessor] Reset ${eligibleForRetry.length} error event(s) to pending for retry`);
                }
            }

            // Atomically claim pending events by updating their status to "processing"
            // This prevents race conditions when multiple cron jobs run simultaneously
            // Using raw SQL for atomic UPDATE ... WHERE ... RETURNING pattern
            const { data: sourceEvents, error: fetchError } = await supabaseClient
                .rpc('claim_pending_source_events', {
                    p_limit: limit,
                    p_processing_status: 'processing',
                });

            // Fallback: If RPC doesn't exist, use improved client-side update pattern
            // This fallback uses a more atomic approach with row-level locking simulation
            if (fetchError && (fetchError.message.includes('does not exist') || fetchError.message.includes('function'))) {
                console.warn(
                    '[NormalizationProcessor] claim_pending_source_events RPC function not found. ' +
                    'Using improved fallback method. Run migration 20250101000004_add_claim_pending_events_function.sql ' +
                    'for proper atomic locking.'
                );
                
                // Improved fallback: Fetch pending events first, then update them atomically
                // This reduces (but doesn't eliminate) the race condition window
                const { data: pendingEvents, error: fetchPendingError } = await supabaseClient
                    .from('source_events')
                    .select('id')
                    .eq('fetch_status', 'pending')
                    .order('created_at', { ascending: true })
                    .limit(limit);

                if (fetchPendingError) {
                    throw new Error(`Failed to fetch pending events: ${fetchPendingError.message}`);
                }

                if (!pendingEvents || pendingEvents.length === 0) {
                    return { processed: 0, succeeded: 0, failed: 0, errors: [] };
                }

                // Update each event individually to minimize race condition window
                // Use .in() with the fetched IDs for better atomicity
                const pendingIds = pendingEvents.map(e => e.id);
                const { data: claimedEvents, error: claimError } = await supabaseClient
                    .from('source_events')
                    .update({ fetch_status: 'processing' })
                    .in('id', pendingIds)
                    .eq('fetch_status', 'pending') // Double-check status hasn't changed
                    .select('*');

                if (claimError) {
                    throw new Error(`Failed to claim pending events: ${claimError.message}`);
                }

                // Only process events that were successfully claimed
                if (!claimedEvents || claimedEvents.length === 0) {
                    console.warn('[NormalizationProcessor] No events were successfully claimed (possible race condition)');
                    return { processed: 0, succeeded: 0, failed: 0, errors: [] };
                }

                return await this.processClaimedEvents(
                    mapToClaimedEvents(claimedEvents),
                    supabaseClient
                );
            }

            if (fetchError) {
                throw new Error(`Failed to fetch pending events: ${fetchError.message}`);
            }

            if (!sourceEvents || (Array.isArray(sourceEvents) && sourceEvents.length === 0)) {
                return { processed: 0, succeeded: 0, failed: 0, errors: [] };
            }
            
            if (!sourceEvents || sourceEvents.length === 0) {
                return { processed: 0, succeeded: 0, failed: 0, errors: [] };
            }

            return await this.processClaimedEvents(
                mapToClaimedEvents(sourceEvents),
                supabaseClient
            );
        } catch (error) {
            console.error('Error processing pending events:', error);
            Sentry.captureException(error, {
                extra: { function: 'processPendingEvents' },
            });

            throw error;
        }
    }

    /**
     * Process events that have been claimed (marked as "processing")
     */
    private static async processClaimedEvents(
        sourceEvents: ClaimedSourceEvent[],
        supabaseClient: SupabaseClientType
    ): Promise<NormalizationResult> {
        try {
            const errors: Array<{ sourceEventId: string; error: string }> = [];
            let succeeded = 0;
            let updatedCount = 0;
            let filteredCount = 0;
            let duplicateCount = 0;

            // Process each source event with a per-event timeout
            let processedCount = 0;
            const logEvery = 25;

            for (const sourceEvent of sourceEvents) {
                try {
                    await withTimeout(
                        (async () => {
                            // Extract record from raw_payload
                            const rawPayload = sourceEvent.raw_payload as unknown as {
                                record: EventSourceRecord;
                                provenance?: unknown;
                                rawItem?: unknown;
                            };

                            if (!rawPayload?.record) {
                                throw new Error('Invalid raw_payload structure');
                            }

                            const record = rawPayload.record as EventSourceRecord;

                            applyUrlCanonicalization(record);

                            if (record.description) {
                                const sanitizedDescription = cleanEventDescription(record.description);
                                if (sanitizedDescription !== undefined) {
                                    record.description = sanitizedDescription;
                                } else {
                                    record.description = record.description.trim();
                                }
                            }

                            // Secondary filter check (for sophisticated rules that may require source metadata)
                            // Collector already does basic filtering, but this allows more complex rules
                            const source = await IngestionSourceService.getSourceById(
                                sourceEvent.source_id,
                                supabaseClient
                            );
                            const filterResult = EventFilterService.shouldFilterEvent(
                                record,
                                source?.metadata as unknown as Record<string, unknown> | undefined
                            );
                            if (filterResult.filtered) {
                                // Mark as filtered with reason for audit trail
                                await supabaseClient
                                    .from('source_events')
                                    .update({
                                        fetch_status: 'filtered',
                                        error_message: `Filtered: ${filterResult.reason || 'Unknown reason'}`,
                                    })
                                    .eq('id', sourceEvent.id);

                                // Log to analytics table for pattern detection
                                try {
                                    await insertFilterAnalytics(supabaseClient, {
                                        source_event_id: sourceEvent.id,
                                        source_id: sourceEvent.source_id,
                                        filter_reason: filterResult.reason || 'Unknown reason',
                                        matched_pattern: filterResult.matchedPattern || null,
                                        filter_category: filterResult.category || null,
                                    });
                                } catch (analyticsError) {
                                    console.warn('Failed to log filtered event to analytics:', analyticsError);
                                }

                                filteredCount++;
                                processedCount++;
                                if (processedCount % logEvery === 0) {
                                    console.log(
                                        `[NormalizationProcessor] Processed ${processedCount}/${sourceEvents.length} in current batch`
                                    );
                                }
                                return;
                            }

                            if (isDescriptionThin(record.description, record.title) && record.sourceUrl) {
                                // TODO: Implement alternative description enrichment or remove this block
                            }

                            // Check for duplicates before normalizing
                            const duplicateCheck = await EventDeduplicationService.checkDuplicate(
                                record,
                                sourceEvent.id,
                                supabaseClient
                            );

                            if (duplicateCheck.isDuplicate && duplicateCheck.existingEventId) {
                                // Get existing event data (including relationships)
                                const existingEvent = await EventUpdateService.fetchEventWithRelationships(
                                    duplicateCheck.existingEventId,
                                    supabaseClient
                                );

                                if (!existingEvent) {
                                    // Event not found, treat as new
                                    console.warn(
                                        `[NormalizationProcessor] Duplicate event ${duplicateCheck.existingEventId} not found, treating as new event`
                                    );
                                    // Continue with normalization
                                } else {
                                    // Compare fields and determine update strategy (includes relationship fields)
                                    const fieldDiffs = await EventUpdateService.compareEventFields(
                                        record,
                                        existingEvent
                                    );

                                    // If no changes detected, mark as duplicate and skip
                                    if (fieldDiffs.filter(d => d.hasChanged).length === 0) {
                                        await EventDeduplicationService.markAsDuplicate(
                                            sourceEvent.id,
                                            duplicateCheck.existingEventId,
                                            supabaseClient
                                        );
                                        duplicateCount++;
                                        processedCount++;
                                        if (processedCount % logEvery === 0) {
                                            console.log(
                                                `[NormalizationProcessor] Processed ${processedCount}/${sourceEvents.length} in current batch`
                                            );
                                        }
                                        return;
                                    }

                                    const protectionStatus = await EventUpdateService.partitionFieldsByProtection(
                                        fieldDiffs,
                                        duplicateCheck.existingEventId,
                                        supabaseClient
                                    );

                                    // Apply auto-updates immediately
                                    if (protectionStatus.autoUpdate.length > 0) {
                                        const autoUpdateResult = await EventUpdateService.applyAutoUpdates(
                                            duplicateCheck.existingEventId,
                                            protectionStatus.autoUpdate,
                                            supabaseClient
                                        );

                                        if (autoUpdateResult.success) {
                                            // Log auto-update (even if review queue is also created)
                                            await EventUpdateService.logAutoUpdate(
                                                duplicateCheck.existingEventId,
                                                sourceEvent.id,
                                                protectionStatus.autoUpdate.map(f => f.fieldName),
                                                supabaseClient
                                            );
                                        }
                                    }

                                    // Queue fields requiring review (or create queue for tracking if all auto-applied)
                                    if (protectionStatus.reviewRequired.length > 0 || protectionStatus.protected.length > 0) {
                                        await EventUpdateService.queueForReview(
                                            duplicateCheck.existingEventId,
                                            sourceEvent.id,
                                            [...protectionStatus.reviewRequired, ...protectionStatus.protected],
                                            supabaseClient
                                        );
                                    } else if (protectionStatus.autoUpdate.length > 0) {
                                        // All fields auto-applied, no review needed - already logged above
                                    }

                                    // Mark source_event as 'updated'
                                    await supabaseClient
                                        .from('source_events')
                                        .update({
                                            fetch_status: 'updated',
                                            normalized_event_id: duplicateCheck.existingEventId,
                                        })
                                        .eq('id', sourceEvent.id);

                                    updatedCount++;
                                    processedCount++;
                                    if (processedCount % logEvery === 0) {
                                        console.log(
                                            `[NormalizationProcessor] Processed ${processedCount}/${sourceEvents.length} in current batch`
                                        );
                                    }
                                    return;
                                }
                            }

                            // Find or create organizer - only if we have a valid organizer name
                            // Don't create organizers with placeholder names like "Unknown"
                            const organizerName = record.organizer?.trim();
                            const hasValidOrganizer = organizerName && 
                                organizerName !== '' && 
                                organizerName !== 'Unknown' &&
                                organizerName.toLowerCase() !== 'unknown organizer' &&
                                organizerName.toLowerCase() !== 'tbd' &&
                                organizerName.toLowerCase() !== 'tba';
                            
                            const organizerId = hasValidOrganizer
                                ? await OrganizerEnrichmentService.findOrCreateOrganizer(
                                    {
                                        name: organizerName,
                                        domain: record.organizerDomain,
                                        websiteUrl: record.sourceUrl,
                                        sourceUrl: record.sourceUrl, // For og:image extraction
                                    },
                                    supabaseClient
                                )
                                : null;

                            // Calculate quality score before normalizing
                            const qualityScore = await QualityScoringService.calculateQualityScore(
                                record,
                                record.provenance.source_id,
                                supabaseClient
                            );

                            // Sanity check: warn if sourceUrl matches feed URL (indicates fallback was used)
                            if (source && record.sourceUrl === source.source_url) {
                                console.warn(
                                    `[NormalizationProcessor] Event "${record.title}" sourceUrl matches feed URL. ` +
                                    `This may indicate the collector fell back to feed URL. Feed: ${source.source_url}`
                                );
                            }

                            // Normalize event
                            const result = await EventNormalizer.normalizeEvent(
                                {
                                    sourceEventId: sourceEvent.id,
                                    record,
                                    organizerId,
                                    eventTypeId: null, // TODO: Infer from tags/categories
                                },
                                supabaseClient
                            );

                            if (result.success) {
                                // Store quality score in event
                                await QualityScoringService.storeQualityScore(
                                    result.eventId,
                                    qualityScore,
                                    supabaseClient
                                );

                                // Queue for moderation if required
                                if (qualityScore.requiresModeration || !qualityScore.shouldAutoPublish) {
                                    await QualityScoringService.queueForModeration(
                                        sourceEvent.id,
                                        result.eventId,
                                        qualityScore,
                                        supabaseClient
                                    );
                                }

                                succeeded++;
                                processedCount++;
                                if (processedCount % logEvery === 0) {
                                    console.log(
                                        `[NormalizationProcessor] Processed ${processedCount}/${sourceEvents.length} in current batch`
                                    );
                                }
                            } else {
                                const errorMessage = result.error || 'Unknown error';
                                errors.push({
                                    sourceEventId: sourceEvent.id,
                                    error: errorMessage,
                                });

                                // Check existing retry metadata to determine retry count
                                const existingMetadata = decodeRetryMetadata(sourceEvent.error_message);
                                const retryCount = existingMetadata ? existingMetadata.retry_count : 0;
                                const retryErrorMessage = encodeRetryMetadata(errorMessage, retryCount);

                                // Mark as error status with retry metadata
                                await supabaseClient
                                    .from('source_events')
                                    .update({ 
                                        fetch_status: 'error', 
                                        error_message: retryErrorMessage 
                                    })
                                    .eq('id', sourceEvent.id);
                            }
                        })(),
                        PER_EVENT_TIMEOUT_MS
                    );
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push({
                        sourceEventId: sourceEvent.id,
                        error: errorMessage,
                    });

                    // Check existing retry metadata to determine retry count
                    const existingMetadata = decodeRetryMetadata(sourceEvent.error_message);
                    const retryCount = existingMetadata ? existingMetadata.retry_count : 0;
                    const retryErrorMessage = encodeRetryMetadata(errorMessage, retryCount);

                    // Mark as error status with retry metadata
                    try {
                        await supabaseClient
                            .from('source_events')
                            .update({ 
                                fetch_status: 'error', 
                                error_message: retryErrorMessage 
                            })
                            .eq('id', sourceEvent.id);
                    } catch {
                        // Ignore errors in error handling
                    }

                    Sentry.captureException(error, {
                        extra: {
                            function: 'processClaimedEvents',
                            sourceEventId: sourceEvent.id,
                        },
                    });
                }
            }

            console.log(
                `[NormalizationProcessor] Batch outcome: processed=${sourceEvents.length}, normalized=${succeeded}, updated=${updatedCount}, duplicates=${duplicateCount}, filtered=${filteredCount}, failed=${errors.length}`
            );

            return {
                processed: sourceEvents.length,
                succeeded,
                failed: errors.length,
                errors,
            };
        } catch (error) {
            console.error('Error processing claimed events:', error);
            Sentry.captureException(error, {
                extra: { function: 'processClaimedEvents' },
            });

            throw error;
        }
    }
}

