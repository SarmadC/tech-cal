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
import { normalizeTimezone, isValidIanaTimezone } from '@/utils/ingestion/ExtractNormalization';
import { normalizeLocationValue } from '@/utils/ingestion/sourceCleanup';
import { EventRepository } from './repositories/EventRepository';
import { EventTagEnrichmentService } from '@/services/eventTagEnrichmentService';
import { TagNormalizationService } from '@/services/tagNormalizationService';

/**
 * Event type keyword mappings for auto-classification
 * Order matters - first match wins, so more specific types come first
 */
const EVENT_TYPE_KEYWORDS: Record<string, string[]> = {
  'Hackathon': [
    'hackathon', 'hack', 'coding challenge', 'code jam', 'buildathon',
    'codeathon', 'datathon', 'ideathon'
  ],
  'Training': [
    'training', 'workshop', 'bootcamp', 'course', 'tutorial', 'masterclass',
    'hands-on', 'lab', 'certification', 'learn to', 'upskill'
  ],
  'Summit': [
    'summit', 'forum', 'symposium', 'congress', 'world', 'global'
  ],
  'Trade Show': [
    'trade show', 'expo', 'exhibition', 'showcase', 'fair'
  ],
  'Networking': [
    'networking', 'meetup', 'mixer', 'happy hour', 'social', 'community',
    'user group', 'drinks', 'breakfast', 'lunch and learn'
  ],
  'Product': [
    'product launch', 'release', 'announcement', 'unveil', 'demo day'
  ],
  'Conference': [
    'conference', 'conf', 'convention', 'tech week', 'days', 'annual', 'keynote'
  ]
};

// Cache for event type IDs
let eventTypeCache: Map<string, string> | null = null;

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

            // Parse and normalize timezone to IANA format
            const timezone = this.extractTimezone(record.timezone, location, record.startTime);

            // Prepare event insert
            type EventInsert = Database['public']['Tables']['events']['Insert'];

            const normalizedDescription =
                cleanEventDescription(record.description) ?? record.description?.trim() ?? '';

            const normalizedSourceUrl = record.normalizedSourceUrl ?? record.sourceUrl;
            const normalizedRegistrationUrl = record.normalizedRegistrationUrl ?? record.registrationUrl ?? null;

            // Auto-classify event type if not provided
            let resolvedEventTypeId = eventTypeId ?? null;
            if (!resolvedEventTypeId) {
                try {
                    resolvedEventTypeId = await this.classifyEventType(
                        record.title,
                        normalizedDescription,
                        supabaseClient
                    );
                } catch (classifyError) {
                    // Don't fail normalization if classification fails
                    console.warn('[EventNormalizer] Event type classification failed (non-critical):', classifyError);
                }
            }

            const eventData: EventInsert = {
                title: record.title,
                slug: this.slugify(record.title),
                description: normalizedDescription,
                start_time: record.startTime,
                end_time: record.endTime ?? null,
                timezone: timezone ?? null,
                location,
                organizer_id: organizerId,
                source_domain: record.sourceDomain ?? null,
                source_url: normalizedSourceUrl,
                registration_url: normalizedRegistrationUrl,
                livestream_url: record.livestreamUrl ?? null,
                event_image_url: record.eventImageUrl ?? null,
                event_type_id: resolvedEventTypeId,
                difficulty_level: difficultyLevel ?? null,
                event_format: eventFormat ?? null,
                status: 'confirmed',
                status_enum: 'Confirmed',
                price_min: priceInfo.min,
                price_max: priceInfo.max,
                currency: priceInfo.currency,
                pricing_type: priceInfo.pricingType,
                enrichment_status: 'pending',
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
                    normalizedRegistrationUrl: record.normalizedRegistrationUrl ?? record.registrationUrl ?? null,
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
     * Auto-classify event type based on title and description content
     * Returns the event_type_id if a match is found, null otherwise
     */
    static async classifyEventType(
        title: string,
        description: string | null,
        supabaseClient: SupabaseClientType
    ): Promise<string | null> {
        // Lazy load event type cache
        if (!eventTypeCache) {
            const { data: eventTypes, error } = await supabaseClient
                .from('event_type')
                .select('id, name');
            
            if (error || !eventTypes) {
                console.warn('[EventNormalizer] Failed to fetch event types for classification:', error);
                return null;
            }
            
            eventTypeCache = new Map();
            eventTypes.forEach(et => {
                if (et.name) {
                    eventTypeCache!.set(et.name, et.id);
                }
            });
        }
        
        const text = `${title} ${description || ''}`.toLowerCase();
        
        // Check keywords in order of specificity
        for (const [typeName, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
            for (const keyword of keywords) {
                // Word boundary match
                const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
                if (regex.test(text)) {
                    const typeId = eventTypeCache.get(typeName);
                    if (typeId) {
                        return typeId;
                    }
                }
            }
        }
        
        // Default to Conference if no specific match (most common type for tech events)
        return eventTypeCache.get('Conference') || null;
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
        return normalizeLocationValue(location);
    }

    /**
     * Extract and normalize timezone to IANA format.
     * Uses sophisticated normalization to convert short codes (PT, ET) to IANA identifiers (America/Los_Angeles).
     * 
     * @param explicitTimezone Explicit timezone from record (e.g., "PT", "America/Los_Angeles")
     * @param location Location string (e.g., "San Francisco, CA, USA")
     * @param startTime Start time string (for extracting timezone from ISO date if needed)
     * @returns IANA timezone identifier (e.g., "America/Los_Angeles") or null
     */
    private static extractTimezone(
        explicitTimezone?: string | null,
        location?: string,
        startTime?: string
    ): string | null {
        // Helper to extract city from location string
        const extractCity = (loc: string): string | undefined => {
            if (!loc) return undefined;
            const parts = loc.split(',').map(p => p.trim());
            return parts[0] || undefined;
        };

        // Helper to extract country from location string
        const extractCountry = (loc: string): string | undefined => {
            if (!loc) return undefined;
            const parts = loc.split(',').map(p => p.trim());
            // Country is typically the last part
            return parts.length > 1 ? parts[parts.length - 1] : undefined;
        };

        // Try to extract timezone from ISO date string first
        if (startTime && !explicitTimezone) {
            try {
                // Date strings with timezone info will preserve it
                if (startTime.includes('+') || (startTime.includes('-') && startTime.match(/[+-]\d{2}:\d{2}$/))) {
                    // Timezone already in string - PostgreSQL will parse it correctly
                    // Return null to let PostgreSQL handle it
                    return null;
                }
            } catch {
                // Ignore parsing errors
            }
        }

        // Use sophisticated normalization function to convert to IANA format
        const normalized = normalizeTimezone(
            explicitTimezone,
            {
                city: location ? extractCity(location) : undefined,
                country: location ? extractCountry(location) : undefined,
            },
            'UTC' // Fallback to UTC if no timezone can be determined
        );

        // Return IANA format timezone (e.g., "America/Los_Angeles")
        // If confidence is very low and it's just the fallback, return null instead
        if (normalized.source === 'fallback' && normalized.confidence < 0.3) {
            return null;
        }

        // Validate the normalized timezone is in IANA format
        if (!isValidIanaTimezone(normalized.timezone)) {
            console.warn('[EventNormalizer] Normalized timezone is not in IANA format:', normalized.timezone);
            return null;
        }

        return normalized.timezone;
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
            const sanitizedTags = this.sanitizeTags(tags);
            if (sanitizedTags.length === 0) {
                return;
            }

            // Normalize tags using TagNormalizationService (handles synonyms, case, etc.)
            const { normalized: normalizedTags, excluded } = TagNormalizationService.normalizeTags(sanitizedTags);
            
            if (excluded.length > 0) {
                console.log('[EventNormalizer] Filtered out tags:', excluded.map(e => `${e.tag} (${e.reason})`).join(', '));
            }
            
            if (normalizedTags.length === 0) {
                return;
            }

            // Fetch allowlisted tags once and map by normalized name
            const { data: allTags, error: fetchError } = await supabaseClient
                .from('event_tags')
                .select('id, event_tag');

            if (fetchError || !allTags) {
                console.warn('Failed to fetch allowlisted tags:', fetchError);
                return;
            }

            // Build lookup maps - both exact match and lowercase
            const tagLookupExact = new Map<string, string>();
            const tagLookupLower = new Map<string, string>();
            allTags.forEach(tag => {
                if (!tag.event_tag) return;
                const trimmed = tag.event_tag.trim();
                if (trimmed.length === 0) return;
                tagLookupExact.set(trimmed, tag.id);
                tagLookupLower.set(trimmed.toLowerCase(), tag.id);
            });

            const uniqueTagIds = new Set<string>();
            const droppedTags: string[] = [];

            normalizedTags.forEach(tagName => {
                // Try exact match first, then lowercase
                let tagId = tagLookupExact.get(tagName);
                if (!tagId) {
                    tagId = tagLookupLower.get(tagName.toLowerCase());
                }
                
                if (tagId) {
                    uniqueTagIds.add(tagId);
                } else {
                    droppedTags.push(tagName);
                }
            });

            if (droppedTags.length > 0) {
                console.warn('[EventNormalizer] Dropping unknown/non-allowlisted tags for event', {
                    eventId,
                    droppedTags,
                });
            }

            // Link tags to event
            if (uniqueTagIds.size > 0) {
                const relations = Array.from(uniqueTagIds).map(tagId => ({
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
                return [];
            }
            return [];
        };

        const candidates = flatten(rawTags);
        const blockedTags = new Set(['online', 'en']);

        const trimmed = candidates
            .map(t => t.trim())
            .filter(t => t.length > 0)
            // Drop JSON-like or key/value formatted tags to avoid polluting allowlist
            .filter(t => {
                const lower = t.toLowerCase();
                const isJsonLike = t.startsWith('{') || t.endsWith('}') || lower.includes('"key"') || lower.includes('"value"') || lower.includes('":');
                const hasKeyValueDelimiter = t.includes(':');
                const isBlocked = blockedTags.has(lower);
                return !isJsonLike && !hasKeyValueDelimiter && !isBlocked;
            });

        return Array.from(new Set(trimmed));
    }

    /**
     * Generate a URL-friendly slug from a string
     */
    private static slugify(text: string): string {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')     // Replace spaces with -
            .replace(/[^\w-]+/g, '')  // Remove all non-word chars
            .replace(/--+/g, '-');    // Replace multiple - with single -
    }
}
