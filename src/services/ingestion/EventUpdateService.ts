/**
 * Event Update Service
 * 
 * Handles field-level comparison, protection status checking, and update queuing
 * when duplicate events are detected during re-ingestion.
 */

import type { SupabaseClientType } from '@/types';
import type { EventSourceRecord } from '@/types/ingestion';
import * as Sentry from '@sentry/nextjs';

export interface FieldDiff {
    fieldName: string;
    oldValue: unknown;
    newValue: unknown;
    hasChanged: boolean;
    confidence?: number;
}

export interface ProtectionStatus {
    autoUpdate: FieldDiff[];
    protected: FieldDiff[];
    reviewRequired: FieldDiff[];
}

export interface ExistingEventWithRelationships {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    timezone: string | null;
    location: string | null;
    source_url: string | null;
    registration_url: string | null;
    livestream_url: string | null;
    event_image_url: string | null;
    event_type_id: string | null;
    venue_id: string | null;
    series_id: string | null;
    speaker_lineup: unknown;
    // Relationships
    tagIds: string[];
    audienceIds: string[];
    prerequisiteIds: string[];
    agendaItems: Array<{ id: string; title: string; start_time: string; end_time: string }>;
}

export class EventUpdateService {
    /**
     * Ensure end_time is after start_time for updates.
     * If end_time is missing or invalid, leaves untouched.
     * If end_time <= start_time, bump end_time by 1 hour.
     */
    private static async ensureValidTimesForUpdate(
        eventId: string,
        updateData: Record<string, unknown>,
        supabaseClient: SupabaseClientType
    ): Promise<Record<string, unknown>> {
        // Only care if end_time might be updated or used in comparison
        const hasEndUpdate = 'end_time' in updateData;
        const hasStartUpdate = 'start_time' in updateData;
        if (!hasEndUpdate && !hasStartUpdate) {
            return updateData;
        }

        // Fetch existing times to compare when only one side is being updated
        const { data: existingEvent } = await supabaseClient
            .from('events')
            .select('start_time, end_time')
            .eq('id', eventId)
            .single();

        const startCandidate = (updateData.start_time as string | undefined) ?? existingEvent?.start_time ?? null;
        const endCandidate = (updateData.end_time as string | undefined) ?? existingEvent?.end_time ?? null;

        if (!startCandidate || !endCandidate) {
            return updateData;
        }

        const start = new Date(startCandidate);
        const end = new Date(endCandidate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return updateData;
        }

        if (end <= start) {
            const correctedEnd = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
            updateData.end_time = correctedEnd;
            console.warn(
                `[EventUpdateService] Adjusted end_time after start_time for event ${eventId}`
            );
        }

        return updateData;
    }
    /**
     * Fetch event with all relationships for comparison
     */
    static async fetchEventWithRelationships(
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<ExistingEventWithRelationships | null> {
        try {
            // Fetch event
            const { data: event, error: eventError } = await supabaseClient
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (eventError || !event) {
                return null;
            }

            // Fetch relationships in parallel
            const [tagsResult, audiencesResult, prerequisitesResult, agendaResult] = await Promise.all([
                // Tags
                supabaseClient
                    .from('event_tag_relations')
                    .select('tag_id')
                    .eq('event_id', eventId),
                // Audiences
                supabaseClient
                    .from('event_target_audiences')
                    .select('audience_id')
                    .eq('event_id', eventId),
                // Prerequisites
                supabaseClient
                    .from('event_prerequisites')
                    .select('prerequisite_id')
                    .eq('event_id', eventId),
                // Agenda items
                supabaseClient
                    .from('event_agenda')
                    .select('id, title, start_time, end_time')
                    .eq('event_id', eventId)
                    .order('start_time', { ascending: true }),
            ]);

            return {
                id: event.id,
                title: event.title || '',
                description: event.description,
                start_time: event.start_time,
                end_time: event.end_time,
                timezone: event.timezone,
                location: event.location,
                source_url: event.source_url,
                registration_url: event.registration_url,
                livestream_url: event.livestream_url,
                event_image_url: event.event_image_url,
                event_type_id: event.event_type_id,
                venue_id: event.venue_id,
                series_id: event.series_id,
                speaker_lineup: event.speaker_lineup,
                tagIds: (tagsResult.data || []).map(t => t.tag_id),
                audienceIds: (audiencesResult.data || []).map(a => a.audience_id),
                prerequisiteIds: (prerequisitesResult.data || []).map(p => p.prerequisite_id),
                agendaItems: (agendaResult.data || []) as Array<{ id: string; title: string; start_time: string; end_time: string }>,
            };
        } catch (error) {
            console.error('Error fetching event with relationships:', error);
            Sentry.captureException(error, {
                extra: { function: 'fetchEventWithRelationships', eventId },
            });
            return null;
        }
    }

    /**
     * Compare EventSourceRecord with existing event
     * Handles scalar fields, JSONB fields, and relationship fields
     */
    static async compareEventFields(
        record: EventSourceRecord,
        existingEvent: ExistingEventWithRelationships
    ): Promise<FieldDiff[]> {
        const diffs: FieldDiff[] = [];

        // Helper to compare arrays (for relationships)
        const compareArrays = (oldArr: unknown[], newArr: unknown[]): boolean => {
            if (oldArr.length !== newArr.length) return true;
            const oldSet = new Set(oldArr.map(String));
            const newSet = new Set(newArr.map(String));
            if (oldSet.size !== newSet.size) return true;
            for (const item of oldSet) {
                if (!newSet.has(item)) return true;
            }
            return false;
        };

        // Helper to compare JSONB (for speaker_lineup)
        const compareJSONB = (oldVal: unknown, newVal: unknown): boolean => {
            return JSON.stringify(oldVal || null) !== JSON.stringify(newVal || null);
        };

        // Scalar fields
        const scalarFields: Array<{ field: keyof EventSourceRecord; dbField: string }> = [
            { field: 'title', dbField: 'title' },
            { field: 'description', dbField: 'description' },
            { field: 'startTime', dbField: 'start_time' },
            { field: 'endTime', dbField: 'end_time' },
            { field: 'timezone', dbField: 'timezone' },
            { field: 'location', dbField: 'location' },
            { field: 'sourceUrl', dbField: 'source_url' },
            { field: 'registrationUrl', dbField: 'registration_url' },
            { field: 'livestreamUrl', dbField: 'livestream_url' },
        ];

        for (const { field, dbField } of scalarFields) {
            const oldValue = existingEvent[dbField as keyof ExistingEventWithRelationships];
            const newValue = record[field];
            const hasChanged = String(oldValue || '') !== String(newValue || '');

            if (hasChanged || newValue !== undefined) {
                diffs.push({
                    fieldName: dbField,
                    oldValue,
                    newValue: newValue || null,
                    hasChanged,
                });
            }
        }

        // JSONB fields (speaker_lineup)
        if (record.speakerLineup !== undefined) {
            const hasChanged = compareJSONB(existingEvent.speaker_lineup, record.speakerLineup);
            diffs.push({
                fieldName: 'speaker_lineup',
                oldValue: existingEvent.speaker_lineup,
                newValue: record.speakerLineup,
                hasChanged,
            });
        }

        // Relationship fields - need to fetch current values
        // Tags
        const newTagIds = record.tags || [];
        const hasTagChange = compareArrays(existingEvent.tagIds, newTagIds);
        if (hasTagChange || newTagIds.length > 0) {
            diffs.push({
                fieldName: 'tags',
                oldValue: existingEvent.tagIds,
                newValue: newTagIds,
                hasChanged: hasTagChange,
            });
        }

        // Note: EventSourceRecord doesn't have audiences/prerequisites yet, but we'll add them when needed
        // For now, we'll compare empty arrays

        // Foreign key fields
        // Note: EventSourceRecord doesn't have these yet, but we'll add comparison when they're available
        // event_type_id, venue_id, series_id comparison would go here

        return diffs;
    }

    /**
     * Get protection mode for a field using the database function
     */
    static async getFieldProtectionStatus(
        eventId: string,
        fieldName: string,
        supabaseClient: SupabaseClientType
    ): Promise<'auto_update' | 'protected' | 'review_required'> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rpcClient = supabaseClient as any;
            const { data, error } = await rpcClient.rpc('get_field_protection_mode', {
                p_field_name: fieldName,
                p_event_id: eventId,
            });

            if (error) {
                console.warn('Error calling get_field_protection_mode, using fallback:', error);
                return 'review_required'; // Safe fallback
            }

            return (data as 'auto_update' | 'protected' | 'review_required') || 'review_required';
        } catch (error) {
            console.error('Error getting field protection status:', error);
            return 'review_required'; // Safe fallback
        }
    }

    /**
     * Partition field diffs by protection status
     */
    static async partitionFieldsByProtection(
        fieldDiffs: FieldDiff[],
        eventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<ProtectionStatus> {
        const autoUpdate: FieldDiff[] = [];
        const protectedFields: FieldDiff[] = [];
        const reviewRequired: FieldDiff[] = [];

        for (const diff of fieldDiffs) {
            if (!diff.hasChanged) {
                continue; // Skip unchanged fields
            }

            const protectionMode = await this.getFieldProtectionStatus(
                eventId,
                diff.fieldName,
                supabaseClient
            );

            if (protectionMode === 'auto_update') {
                autoUpdate.push(diff);
            } else if (protectionMode === 'protected') {
                protectedFields.push(diff);
            } else {
                reviewRequired.push(diff);
            }
        }

        return { autoUpdate, protected: protectedFields, reviewRequired };
    }

    /**
     * Apply auto-updates to event
     */
    static async applyAutoUpdates(
        eventId: string,
        autoUpdateFields: FieldDiff[],
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const updateData: Record<string, unknown> = {};

            for (const field of autoUpdateFields) {
                if (!field.hasChanged) continue;

                // Map field names to database column names
                updateData[field.fieldName] = field.newValue;
            }

            // Don't update relationships here - handle separately
            const relationshipFields = ['tags', 'audiences', 'prerequisites'];
            const scalarUpdateData = Object.fromEntries(
                Object.entries(updateData).filter(([key]) => !relationshipFields.includes(key))
            );

            if (Object.keys(scalarUpdateData).length > 0) {
                const sanitized = await this.ensureValidTimesForUpdate(eventId, { ...scalarUpdateData }, supabaseClient);

                const { error } = await supabaseClient
                    .from('events')
                    .update({
                        ...sanitized,
                        last_synced_at: new Date().toISOString(),
                    })
                    .eq('id', eventId);

                if (error) {
                    throw new Error(`Failed to apply auto-updates: ${error.message}`);
                }
            }

            // Handle relationship updates separately (for tags, audiences, prerequisites)
            // This would require calling EventEnrichmentService methods or implementing here
            // For now, we'll log that relationship updates need manual handling

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error applying auto-updates:', error);
            Sentry.captureException(error, {
                extra: { function: 'applyAutoUpdates', eventId, fields: autoUpdateFields.map(f => f.fieldName) },
            });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Queue fields for review (creates queue item with field-level rows)
     */
    static async queueForReview(
        eventId: string,
        sourceEventId: string | null,
        reviewRequiredFields: FieldDiff[],
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; queueId?: string; error?: string }> {
        try {
            if (reviewRequiredFields.length === 0) {
                return { success: true };
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = supabaseClient as any;

            // Create main queue entry
            const { data: queueEntry, error: queueError } = await tableClient
                .from('event_update_queue')
                .insert({
                    event_id: eventId,
                source_event_id: sourceEventId,
                    status: 'pending',
                    requires_review_reason: `Fields require review: ${reviewRequiredFields.map(f => f.fieldName).join(', ')}`,
                })
                .select('id')
                .single();

            if (queueError || !queueEntry) {
                throw new Error(`Failed to create queue entry: ${queueError?.message || 'Unknown error'}`);
            }

            const queueId = queueEntry.id;

            // Create field-level rows
            const fieldRows = reviewRequiredFields.map(field => ({
                queue_id: queueId,
                field_name: field.fieldName,
                old_value: field.oldValue,
                new_value: field.newValue,
                field_status: 'pending' as const,
                confidence: field.confidence || null,
            }));

            const { error: fieldsError } = await tableClient
                .from('event_update_queue_fields')
                .insert(fieldRows);

            if (fieldsError) {
                throw new Error(`Failed to create field rows: ${fieldsError.message}`);
            }

            return { success: true, queueId };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error queueing for review:', error);
            Sentry.captureException(error, {
                extra: { function: 'queueForReview', eventId, sourceEventId },
            });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Log auto-applied update (when no review needed)
     */
    static async logAutoUpdate(
        eventId: string,
        sourceEventId: string | null,
        updatedFields: string[],
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            if (updatedFields.length === 0) {
                return { success: true };
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tableClient = supabaseClient as any;

            const { error } = await tableClient
                .from('event_update_log')
                .insert({
                    event_id: eventId,
                source_event_id: sourceEventId,
                    updated_fields: updatedFields,
                });

            if (error) {
                throw new Error(`Failed to log auto-update: ${error.message}`);
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error logging auto-update:', error);
            Sentry.captureException(error, {
                extra: { function: 'logAutoUpdate', eventId, sourceEventId, fields: updatedFields },
            });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Track manual edit (upsert to keep only latest)
     */
    static async trackManualEdit(
        eventId: string,
        fieldName: string,
        previousValue: unknown,
        newValue: unknown,
        editedBy: string | null,
        editSource: 'manual_enrichment' | 'admin_ui' | 'api',
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tableClient = supabaseClient as any;

            // Upsert to keep only latest edit per field
            const { error } = await tableClient
                .from('event_field_edits')
                .upsert({
                    event_id: eventId,
                    field_name: fieldName,
                    previous_value: previousValue !== undefined ? previousValue : null,
                    new_value: newValue !== undefined ? newValue : null,
                    edited_by: editedBy,
                    edit_source: editSource,
                    edited_at: new Date().toISOString(),
                }, {
                    onConflict: 'event_id,field_name',
                });

            if (error) {
                throw new Error(`Failed to track manual edit: ${error.message}`);
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error tracking manual edit:', error);
            Sentry.captureException(error, {
                extra: { function: 'trackManualEdit', eventId, fieldName },
            });
            return { success: false, error: errorMessage };
        }
    }

    /**
     * Bulk track manual edits (for atomic updates)
     */
    static async trackManualEditsBulk(
        eventId: string,
        edits: Array<{ fieldName: string; previousValue: unknown; newValue: unknown }>,
        editedBy: string | null,
        editSource: 'manual_enrichment' | 'admin_ui' | 'api',
        supabaseClient: SupabaseClientType
    ): Promise<{ success: boolean; error?: string }> {
        try {
            if (edits.length === 0) {
                return { success: true };
            }

            const editRows = edits.map(edit => ({
                event_id: eventId,
                field_name: edit.fieldName,
                previous_value: edit.previousValue !== undefined ? edit.previousValue : null,
                new_value: edit.newValue !== undefined ? edit.newValue : null,
                edited_by: editedBy,
                edit_source: editSource,
                edited_at: new Date().toISOString(),
            }));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tableClient = supabaseClient as any;

            // Upsert all edits (handles conflicts via unique constraint)
            const { error } = await tableClient
                .from('event_field_edits')
                .upsert(editRows, {
                    onConflict: 'event_id,field_name',
                });

            if (error) {
                throw new Error(`Failed to track manual edits: ${error.message}`);
            }

            return { success: true };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error tracking manual edits bulk:', error);
            Sentry.captureException(error, {
                extra: { function: 'trackManualEditsBulk', eventId, editCount: edits.length },
            });
            return { success: false, error: errorMessage };
        }
    }
}

