/**
 * Event Normalizer
 * 
 * Maps source_events payloads to canonical events table structure.
 * Handles domain-specific normalization: currency, difficulty, location, format, tags.
 * Integrates with existing transformers.ts patterns.
 */

import type { SupabaseClientType } from '@/types';
import type { EventSourceRecord } from '@/types/ingestion';
import type { Database } from '@/types/supabase';
import * as Sentry from '@sentry/nextjs';
import { env } from '@/utils/env';
import { cleanEventDescription } from '@/utils/ingestion/DescriptionCleaner';
import { EventRepository } from './repositories/EventRepository';
import { EventTagEnrichmentService } from '@/services/eventTagEnrichmentService';

export interface NormalizedEventInput {
    sourceEventId: string;
    record: EventSourceRecord;
    organizerId: string | null;
    eventTypeId?: string | null;
}

export interface NormalizedEventOutput {
    eventId: string;
    success: boolean;
    error?: string;
}

export class EventNormalizer {
    /**
     * Normalize a single source event to events table format
     */
    static async normalizeEvent(
        input: NormalizedEventInput,
        supabaseClient: SupabaseClientType
    ): Promise<NormalizedEventOutput> {
        try {
            const { record: originalRecord, organizerId, eventTypeId } = input;
            // Guard against invalid time ordering that triggers DB checks
            const record = this.ensureValidTimes({ ...originalRecord });

            // Parse and normalize currency/price
            const priceInfo = this.parsePriceRange(record.priceRange);

            // Normalize difficulty level
            const difficultyLevel = this.normalizeDifficulty(record.difficultyLevel);

            // Detect event format (virtual/in-person/hybrid)
            const eventFormat = this.detectEventFormat(record);

            // Normalize location
            const location = this.normalizeLocation(record.location);

            // Parse timezone
            const timezone = record.timezone || this.extractTimezone(record.location, record.startTime);

            // Prepare event insert
            type EventInsert = Database['public']['Tables']['events']['Insert'];

            const normalizedDescription =
                cleanEventDescription(record.description) ?? record.description?.trim() ?? '';

            const normalizedSourceUrl = record.normalizedSourceUrl ?? record.sourceUrl;
            const normalizedRegistrationUrl = record.normalizedRegistrationUrl ?? record.registrationUrl ?? null;

            const eventData: EventInsert = {
                title: record.title,
                description: normalizedDescription,
                start_time: record.startTime,
                end_time: record.endTime ?? null,
                timezone: timezone ?? null,
                location,
                organizer_id: organizerId,
                source_url: normalizedSourceUrl,
                registration_url: normalizedRegistrationUrl,
                livestream_url: record.livestreamUrl ?? null,
                event_image_url: record.eventImageUrl ?? null,
                event_type_id: eventTypeId ?? null,
                difficulty_level: difficultyLevel ?? null,
                event_format: eventFormat ?? null,
                status: 'confirmed',
                status_enum: 'Confirmed',
                price_min: priceInfo.min,
                price_max: priceInfo.max,
                currency: priceInfo.currency,
                pricing_type: priceInfo.pricingType,
                ingestion_quality_score: null,
                ingestion_source_id: record.provenance.source_id,
                ingestion_provenance: record.provenance as unknown as Database['public']['Tables']['events']['Insert']['ingestion_provenance'],
                ingestion_confidence: record.confidence,
                speaker_lineup:
                    record.speakerLineup && record.speakerLineup.length > 0
                        ? (record.speakerLineup as unknown as Database['public']['Tables']['events']['Insert']['speaker_lineup'])
                        : null,
            };

            // Insert event
            const { eventId } = await EventRepository.upsertEvent(
                supabaseClient,
                eventData,
                {
                    normalizedUrl: record.normalizedSourceUrl ?? record.sourceUrl,
                    sourceDomain: record.sourceDomain ?? null,
                }
            );

            // Link tags if present
            if (record.tags && record.tags.length > 0) {
                await this.linkEventTags(eventId, record.tags, supabaseClient);
            }

            // Auto-enrich with tags from content (if no tags were provided)
            // Note: Agenda items may not exist yet at normalization time, so we enrich with title/description first
            // Agenda-based enrichment can happen later via backfill if needed
            const tagMode = env('TAG_ENRICHMENT_MODE', 'heuristic'); // heuristic | none
            if ((!record.tags || record.tags.length === 0) && tagMode === 'heuristic') {
                try {
                    await EventTagEnrichmentService.enrichEventTags(
                        eventId,
                        {
                            title: record.title,
                            description: normalizedDescription,
                            agenda: undefined // Agenda items may not exist yet at normalization time
                        },
                        supabaseClient
                    );
                } catch (enrichmentError) {
                    // Don't fail normalization if enrichment fails
                    console.warn('Tag enrichment failed (non-critical):', enrichmentError);
                }
            }

            // Update source_event to mark as normalized
            await supabaseClient
                .from('source_events')
                .update({
                    normalized_event_id: eventId,
                    fetch_status: 'normalized',
                })
                .eq('id', input.sourceEventId);

            return {
                eventId,
                success: true,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error normalizing event:', error);

            Sentry.captureException(error, {
                extra: { function: 'normalizeEvent', sourceEventId: input.sourceEventId },
            });

            // Update source_event to mark as error
            try {
                await supabaseClient
                    .from('source_events')
                    .update({
                        fetch_status: 'error',
                        error_message: errorMessage,
                    })
                    .eq('id', input.sourceEventId);
            } catch (updateError: unknown) {
                console.error('Failed to update source_event error status:', updateError);
            }

            return {
                eventId: '',
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Parse price range from EventSourceRecord
     */
    private static parsePriceRange(
        priceRange?: EventSourceRecord['priceRange']
    ): {
        min: number | null;
        max: number | null;
        currency: string | null;
        pricingType: 'Free' | 'Paid' | 'Varies' | null;
    } {
        if (!priceRange) {
            return { min: null, max: null, currency: null, pricingType: null };
        }

        const min = priceRange.min ?? null;
        const max = priceRange.max ?? null;
        const currency = priceRange.currency || 'USD';

        // Determine pricing type
        let pricingType: 'Free' | 'Paid' | 'Varies' | null = null;
        if (min === 0 && (max === 0 || max === null)) {
            pricingType = 'Free';
        } else if (min !== null && max !== null && min === max) {
            pricingType = 'Paid';
        } else if (min !== null || max !== null) {
            pricingType = 'Varies';
        }

        return { min, max, currency, pricingType };
    }

    /**
     * Normalize difficulty level
     */
    private static normalizeDifficulty(
        difficulty?: EventSourceRecord['difficultyLevel']
    ): 'beginner' | 'intermediate' | 'advanced' | null {
        if (!difficulty) return null;

        const normalized = difficulty.toLowerCase().trim();
        
        if (['beginner', 'introductory', 'novice', 'basic'].includes(normalized)) {
            return 'beginner';
        }
        if (['advanced', 'expert', 'senior'].includes(normalized)) {
            return 'advanced';
        }
        if (['intermediate', 'mid', 'medium'].includes(normalized)) {
            return 'intermediate';
        }

        return null;
    }

    /**
     * Detect event format from location and other clues
     */
    private static detectEventFormat(record: EventSourceRecord): 'Online' | 'In-person' | 'Hybrid' | null {
        const location = (record.location || '').toLowerCase();
        const description = (record.description || '').toLowerCase();

        // Check for explicit format indicators
        if (record.eventFormat) {
            const format = record.eventFormat.toLowerCase();
            if (format === 'virtual' || format === 'online') return 'Online';
            if (format === 'in-person' || format === 'inperson') return 'In-person';
            if (format === 'hybrid') return 'Hybrid';
        }

        // Check location keywords
        if (location.includes('online') || location.includes('virtual') || location.includes('zoom') ||
            location.includes('webinar') || location.includes('livestream') || location === 'online') {
            return 'Online';
        }

        // Check if it's definitely in-person
        if (location.includes('address') || location.includes('venue') || 
            (location.includes(',') && !location.includes('zoom') && !location.includes('meet.google'))) {
            // Check if it's hybrid
            if (description.includes('hybrid') || description.includes('both online and in-person')) {
                return 'Hybrid';
            }
            return 'In-person';
        }

        // Default to null if unclear
        return null;
    }

    /**
     * Ensure end time is after start time; if not, bump end by 1 hour to satisfy DB constraints.
     * Avoids P0001 errors ("End time must be after start time") during normalization.
     */
    private static ensureValidTimes(record: EventSourceRecord): EventSourceRecord {
        if (!record.startTime) return record;

        const start = new Date(record.startTime);
        if (Number.isNaN(start.getTime())) {
            return record;
        }

        if (record.endTime) {
            const end = new Date(record.endTime);
            if (!Number.isNaN(end.getTime()) && end <= start) {
                const correctedEnd = new Date(start.getTime() + 60 * 60 * 1000);
                record.endTime = correctedEnd.toISOString();
                console.warn(
                    '[EventNormalizer] Adjusted end time after start for',
                    '"' + (record.title ?? 'Untitled') + '"'
                );
            }
        }

        return record;
    }

    /**
     * Normalize location string
     */
    private static normalizeLocation(location: string): string {
        if (!location) return 'Online';

        const normalized = location.trim();

        // Common variations
        if (normalized.toLowerCase() === 'tbd' || normalized.toLowerCase() === 'tba') {
            return 'TBD';
        }

        if (normalized.toLowerCase() === 'online' || normalized.toLowerCase() === 'virtual') {
            return 'Online';
        }

        return normalized;
    }

    /**
     * Extract timezone from location or date string
     */
    private static extractTimezone(location: string, startTime: string): string | null {
        // Try to extract from ISO date string
        try {
            // Date strings with timezone info will preserve it
            if (startTime.includes('+') || startTime.includes('-') && startTime.match(/[+-]\d{2}:\d{2}$/)) {
                // Timezone already in string
                return null; // Will be parsed correctly by PostgreSQL
            }
        } catch {
            // Ignore parsing errors
        }

        // Could add timezone extraction from location (e.g., "San Francisco" -> "America/Los_Angeles")
        // For now, return null and let PostgreSQL use server timezone
        return null;
    }

    /**
     * Link event tags via event_tag_relations
     */
    private static async linkEventTags(
        eventId: string,
        tags: string[],
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            const normalizedTags = this.sanitizeTags(tags);
            if (normalizedTags.length === 0) {
                return;
            }

            // First, ensure all tags exist in event_tags table
            const tagIds: string[] = [];

            for (const tagName of normalizedTags) {
                if (!tagName || tagName.trim().length === 0) continue;

                // Check if tag exists
                const { data: existingTag } = await supabaseClient
                    .from('event_tags')
                    .select('id')
                    .eq('event_tag', tagName.trim())
                    .single();

                let tagId: string;

                if (existingTag) {
                    tagId = existingTag.id;
                } else {
                    // Create new tag
                    const { data: newTag, error: createError } = await supabaseClient
                        .from('event_tags')
                        .insert({
                            event_tag: tagName.trim(),
                            category: 'general',
                            color: null,
                        })
                        .select('id')
                        .single();

                    if (createError || !newTag) {
                        console.warn('Failed to create tag', tagName + ':', createError);
                        continue;
                    }

                    tagId = newTag.id;
                }

                tagIds.push(tagId);
            }

            // Link tags to event
            if (tagIds.length > 0) {
                const relations = tagIds.map(tagId => ({
                    event_id: eventId,
                    tag_id: tagId,
                }));

                const { error: linkError } = await supabaseClient
                    .from('event_tag_relations')
                    .insert(relations);

                if (linkError) {
                    console.warn('Failed to link event tags:', linkError);
                    // Don't throw - tag linking is non-critical
                }
            }
        } catch (error) {
            console.warn('Error linking event tags:', error);
            // Don't throw - tag linking is non-critical
        }
    }

    /**
     * Normalize incoming tags to a unique string list.
     * Handles numbers, objects (uses name if present, otherwise JSON), and nested arrays.
     */
    private static sanitizeTags(rawTags: unknown): string[] {
        if (!rawTags) return [];

        const flatten = (value: unknown): string[] => {
            if (Array.isArray(value)) {
                return value.flatMap(v => flatten(v));
            }
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                return [String(value)];
            }
            if (value && typeof value === 'object') {
                // If object has a name property, prefer that
                if ('name' in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).name === 'string') {
                    return [String((value as Record<string, unknown>).name)];
                }
                try {
                    return [JSON.stringify(value)];
                } catch {
                    return [];
                }
            }
            return [];
        };

        const candidates = flatten(rawTags);
        const trimmed = candidates.map(t => t.trim()).filter(t => t.length > 0);
        return Array.from(new Set(trimmed));
    }
}

