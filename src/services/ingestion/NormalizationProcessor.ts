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
import * as Sentry from '@sentry/nextjs';

export interface NormalizationResult {
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ sourceEventId: string; error: string }>;
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
            // Atomically claim pending events by updating their status to "processing"
            // This prevents race conditions when multiple cron jobs run simultaneously
            // Using raw SQL for atomic UPDATE ... WHERE ... RETURNING pattern
            const { data: sourceEvents, error: fetchError } = await supabaseClient
                .rpc('claim_pending_source_events', {
                    p_limit: limit,
                    p_processing_status: 'processing',
                });

            // Fallback: If RPC doesn't exist, use client-side update pattern
            // Note: This fallback has a small race condition window. Run migration
            // 20250101000004_add_claim_pending_events_function.sql for proper atomic locking.
            if (fetchError && (fetchError.message.includes('does not exist') || fetchError.message.includes('function'))) {
                console.warn(
                    'claim_pending_source_events RPC function not found. Using fallback method which may have race conditions. ' +
                    'Run migration 20250101000004_add_claim_pending_events_function.sql for proper atomic locking.'
                );
                
                // Fallback: UPDATE with RETURNING using Supabase query builder
                // This is less safe than the RPC function but better than nothing
                const { data: claimedEvents, error: claimError } = await supabaseClient
                    .from('source_events')
                    .update({ fetch_status: 'processing' })
                    .eq('fetch_status', 'pending')
                    .select('*')
                    .limit(limit)
                    .order('created_at', { ascending: true });

                if (claimError) {
                    throw new Error(`Failed to claim pending events: ${claimError.message}`);
                }

                // Cast the RPC result or fallback result to expected type
                return await this.processClaimedEvents(
                    mapToClaimedEvents(claimedEvents ?? []),
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

            // Process each source event
            for (const sourceEvent of sourceEvents) {
                try {
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

                        continue;
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
                                continue;
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

                            continue;
                        }
                    }

                    // Find or create organizer
                    const organizerId = await OrganizerEnrichmentService.findOrCreateOrganizer(
                        {
                            name: record.organizer || 'Unknown',
                            domain: record.organizerDomain,
                            websiteUrl: record.sourceUrl,
                        },
                        supabaseClient
                    );

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
                    } else {
                        errors.push({
                            sourceEventId: sourceEvent.id,
                            error: result.error || 'Unknown error',
                        });

                        // Mark as error status
                        await supabaseClient
                            .from('source_events')
                            .update({ fetch_status: 'error', error_message: result.error })
                            .eq('id', sourceEvent.id);
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push({
                        sourceEventId: sourceEvent.id,
                        error: errorMessage,
                    });

                    // Mark as error status
                    try {
                        await supabaseClient
                            .from('source_events')
                            .update({ fetch_status: 'error', error_message: errorMessage })
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

