/**
 * Event Deduplication Service
 * 
 * Prevents duplicate events using fuzzy matching with PostgreSQL pg_trgm.
 * Handles recurring series by linking to existing series_id.
 */

import type { SupabaseClientType } from '@/types';
import type { EventSourceRecord } from '@/types/ingestion';
import {
    DEDUPLICATION_CONFIG,
    QUERY_LIMITS,
    DEDUPLICATION_TIME_WINDOW_MS,
    SIMILARITY_THRESHOLDS,
} from '@/config/ingestionConstants';
import { normalizeCanonicalUrl } from './utils/urlResolver';
import * as Sentry from '@sentry/nextjs';

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingEventId?: string;
    similarity?: number;
    matchReason?: 'exact_checksum' | 'canonical_url' | 'fuzzy_title' | 'series_match';
}

export class EventDeduplicationService {
    /**
     * Check if an event is a duplicate before normalization
     */
    static async checkDuplicate(
        record: EventSourceRecord,
        sourceEventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<DuplicateCheckResult> {
        try {
            // Step 1: Check for exact checksum match (fastest)
            const checksumMatch = await this.checkChecksumDuplicate(
                record.provenance.raw_hash,
                supabaseClient
            );

            if (checksumMatch) {
                return {
                    isDuplicate: true,
                    existingEventId: checksumMatch.eventId,
                    similarity: 1.0,
                    matchReason: 'exact_checksum',
                };
            }

            // Step 1.5: Check for canonical URL match (high confidence for multi-source duplicates)
            const canonicalUrlMatch = await this.checkCanonicalUrlDuplicate(
                record,
                supabaseClient
            );

            if (canonicalUrlMatch) {
                return {
                    isDuplicate: true,
                    existingEventId: canonicalUrlMatch.eventId,
                    similarity: 1.0,
                    matchReason: 'canonical_url',
                };
            }

            // Step 2: Check for similar title + start_time + organizer (fuzzy match)
            const fuzzyMatch = await this.checkFuzzyDuplicate(
                record,
                supabaseClient
            );

            if (fuzzyMatch) {
                return {
                    isDuplicate: true,
                    existingEventId: fuzzyMatch.eventId,
                    similarity: fuzzyMatch.similarity,
                    matchReason: 'fuzzy_title',
                };
            }

            // Step 3: Check for recurring series match
            const seriesMatch = await this.checkSeriesDuplicate(
                record,
                supabaseClient
            );

            if (seriesMatch) {
                return {
                    isDuplicate: true,
                    existingEventId: seriesMatch.eventId,
                    similarity: seriesMatch.similarity,
                    matchReason: 'series_match',
                };
            }

            return {
                isDuplicate: false,
            };
        } catch (error) {
            console.error('Error checking duplicate:', error);
            Sentry.captureException(error, {
                extra: { function: 'checkDuplicate', sourceEventId },
            });

            // On error, assume not duplicate (better to have duplicates than miss events)
            return { isDuplicate: false };
        }
    }


    /**
     * Check for canonical URL match in events table
     * High-confidence duplicate detection for multi-source events
     */
    private static async checkCanonicalUrlDuplicate(
        record: EventSourceRecord,
        supabaseClient: SupabaseClientType
    ): Promise<{ eventId: string } | null> {
        try {
            const normalizedSourceUrl = normalizeCanonicalUrl(record.sourceUrl);
            if (!normalizedSourceUrl) {
                return null;
            }

            // Extract domain from normalized URL for more efficient querying
            let domain: string | null = null;
            try {
                const urlObj = new URL(normalizedSourceUrl);
                domain = urlObj.hostname.toLowerCase().replace(/^www\./, '');
            } catch {
                // If URL parsing fails, fall back to full table scan (shouldn't happen)
            }

            // Build query - try to narrow by domain if possible
            let query = supabaseClient
                .from('events')
                .select('id, source_url, registration_url')
                .not('source_url', 'is', null);

            // If we have a domain, use ILIKE to filter by domain (more efficient)
            if (domain) {
                // Match URLs containing the domain (case-insensitive)
                query = query.ilike('source_url', `%${domain}%`);
            }

            const { data: events, error } = await query.limit(QUERY_LIMITS.DEDUPLICATION_CHECK);

            if (error) {
                throw error;
            }

            if (!events || events.length === 0) {
                return null;
            }

            // Find matching event by comparing normalized URLs
            for (const event of events) {
                const normalizedEventUrl = normalizeCanonicalUrl(event.source_url ?? undefined);
                if (normalizedEventUrl === normalizedSourceUrl) {
                    return { eventId: event.id };
                }

                // Also check registration_url if source_url doesn't match
                if (record.registrationUrl) {
                    const normalizedRegistrationUrl = normalizeCanonicalUrl(record.registrationUrl);
                    const normalizedEventRegistrationUrl = normalizeCanonicalUrl(event.registration_url ?? undefined);
                    if (normalizedRegistrationUrl && normalizedEventRegistrationUrl === normalizedRegistrationUrl) {
                        return { eventId: event.id };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error checking canonical URL duplicate:', error);
            return null;
        }
    }

    /**
     * Check for exact checksum match in source_events
     */
    private static async checkChecksumDuplicate(
        checksum: string,
        supabaseClient: SupabaseClientType
    ): Promise<{ eventId: string } | null> {
        try {
            const { data, error } = await supabaseClient
                .from('source_events')
                .select('normalized_event_id')
                .eq('checksum', checksum)
                .not('normalized_event_id', 'is', null)
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "not found" - that's fine
                throw error;
            }

            if (data?.normalized_event_id) {
                return { eventId: data.normalized_event_id };
            }

            return null;
        } catch (error) {
            console.error('Error checking checksum duplicate:', error);
            return null;
        }
    }

    /**
     * Check for fuzzy title match using pg_trgm similarity
     * Matches on: similar title + same start_time (within 1 hour) + organizer match (or domain match)
     */
    private static async checkFuzzyDuplicate(
        record: EventSourceRecord,
        supabaseClient: SupabaseClientType
    ): Promise<{ eventId: string; similarity: number } | null> {
        try {
            // Use PostgreSQL similarity function (pg_trgm)
            // Query events with similar title and matching time window
            // Organizer matching is handled client-side with domain fallback
            const rpcPayload: {
                p_title: string;
                p_start_time: string;
                p_similarity_threshold?: number;
                p_organizer_id?: string;
            } = {
                p_title: record.title,
                p_start_time: record.startTime,
                p_similarity_threshold: DEDUPLICATION_CONFIG.SIMILARITY_THRESHOLD,
            };

            // Don't pass organizer_id to RPC - we'll do domain matching client-side
            // This allows matching across different organizers when domains align

            const { data, error } = await supabaseClient.rpc('find_similar_events', rpcPayload);

            // If RPC doesn't exist, fall back to client-side fuzzy matching
            if (error && error.message.includes('function') && error.message.includes('does not exist')) {
                return await this.clientSideFuzzyMatch(record, supabaseClient);
            }

            if (error) {
                throw error;
            }

            // Find best match from results, checking organizer match with domain fallback
            if (data && Array.isArray(data) && data.length > 0) {
                // Fetch full event data to check organizer matching
                const eventIds = data.map((d: { event_id: string }) => d.event_id);
                const { data: eventsWithOrganizers, error: eventsError } = await supabaseClient
                    .from('events')
                    .select('id, organizer_id, source_url, organizers(id, name, website_url)')
                    .in('id', eventIds);

                if (eventsError) {
                    throw eventsError;
                }

                // Find best match that passes organizer check (with domain fallback)
                for (const match of data) {
                    const event = eventsWithOrganizers?.find((e: { id: string }) => e.id === match.event_id);
                    if (!event) continue;

                    // If source_url matches, skip strict organizer matching (for syndicated feeds merging into manual entries)
                    const eventSourceUrl = event.source_url as string | null;
                    const sourceUrlMatch = eventSourceUrl && 
                        normalizeCanonicalUrl(record.sourceUrl) === normalizeCanonicalUrl(eventSourceUrl);

                    let organizerMatch = false;
                    if (sourceUrlMatch) {
                        // Source URLs match - skip organizer check (prefer merging into manual record)
                        organizerMatch = true;
                    } else {
                        // Check organizer match with domain fallback
                        organizerMatch = this.matchOrganizerWithDomainFallback(
                            record,
                            event.organizers as { id: string; name: string; website_url: string | null } | null,
                            eventSourceUrl
                        );
                    }

                    if (organizerMatch && match.similarity >= DEDUPLICATION_CONFIG.FUZZY_MATCH_THRESHOLD) {
                        return {
                            eventId: match.event_id,
                            similarity: match.similarity,
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error in fuzzy duplicate check:', error);
            return await this.clientSideFuzzyMatch(record, supabaseClient);
        }
    }

    /**
     * Fallback: Client-side fuzzy matching using title similarity
     */
    private static async clientSideFuzzyMatch(
        record: EventSourceRecord,
        supabaseClient: SupabaseClientType
    ): Promise<{ eventId: string; similarity: number } | null> {
        try {
            const startTime = new Date(record.startTime);
            const timeWindowStart = new Date(startTime.getTime() - DEDUPLICATION_TIME_WINDOW_MS);
            const timeWindowEnd = new Date(startTime.getTime() + DEDUPLICATION_TIME_WINDOW_MS);

            // Query events in time window
            const { data: events, error } = await supabaseClient
                .from('events')
                .select('id, title, start_time, organizer_id, organizers(name)')
                .gte('start_time', timeWindowStart.toISOString())
                .lte('start_time', timeWindowEnd.toISOString())
                .limit(QUERY_LIMITS.DEDUPLICATION_COMPARISON);

            if (error) {
                throw error;
            }

            if (!events || events.length === 0) {
                return null;
            }

            // Calculate similarity for each event
            let bestMatch: { eventId: string; similarity: number } | null = null;
            let bestSimilarity = 0;

            // Fetch organizer data for domain matching
            const eventIds = events.map(e => e.id);
            const { data: eventsWithOrganizers } = await supabaseClient
                .from('events')
                .select('id, source_url, organizers(id, name, website_url)')
                .in('id', eventIds);

            for (const event of events) {
                const eventWithOrg = eventsWithOrganizers?.find((e: { id: string }) => e.id === event.id);
                const eventSourceUrl = eventWithOrg?.source_url as string | null;
                
                // If source_url matches, skip strict organizer matching (for syndicated feeds merging into manual entries)
                const sourceUrlMatch = eventSourceUrl && 
                    normalizeCanonicalUrl(record.sourceUrl) === normalizeCanonicalUrl(eventSourceUrl);

                let organizerMatch = false;
                if (sourceUrlMatch) {
                    // Source URLs match - skip organizer check (prefer merging into manual record)
                    organizerMatch = true;
                } else {
                    // Check organizer match with domain fallback
                    organizerMatch = this.matchOrganizerWithDomainFallback(
                        record,
                        eventWithOrg?.organizers as { id: string; name: string; website_url: string | null } | null,
                        eventSourceUrl
                    );
                }

                if (!organizerMatch) {
                    continue; // Skip if organizers don't match
                }

                // Calculate title similarity
                const similarity = this.calculateStringSimilarity(
                    record.title.toLowerCase(),
                    (event.title || '').toLowerCase()
                );

                if (similarity >= DEDUPLICATION_CONFIG.FUZZY_MATCH_THRESHOLD && similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = {
                        eventId: event.id,
                        similarity,
                    };
                }
            }

            return bestMatch;
        } catch (error) {
            console.error('Error in client-side fuzzy match:', error);
            return null;
        }
    }

    /**
     * Check for recurring series duplicate
     * Links to existing series_id if event is part of a recurring series
     */
    private static async checkSeriesDuplicate(
        record: EventSourceRecord,
        supabaseClient: SupabaseClientType
    ): Promise<{ eventId: string; similarity: number } | null> {
        try {
            // Look for events with same series_id and similar characteristics
            // This is a simplified check - can be enhanced with more sophisticated series detection

            // Check if this might be part of a series by looking for similar titles with different dates
            const { data: similarEvents, error } = await supabaseClient
                .from('events')
                .select('id, title, series_id, start_time')
                .not('series_id', 'is', null)
                .ilike('title', `%${record.title.split(' ')[0]}%`) // Match first word
                .limit(QUERY_LIMITS.DEDUPLICATION_FUZZY);

            if (error || !similarEvents || similarEvents.length === 0) {
                return null;
            }

            // Check if title is similar enough and might be same series
            for (const event of similarEvents) {
                const similarity = this.calculateStringSimilarity(
                    record.title.toLowerCase(),
                    (event.title || '').toLowerCase()
                );

                if (similarity >= SIMILARITY_THRESHOLDS.MEDIUM) {
                    // Found a likely series match
                    return {
                        eventId: event.id,
                        similarity,
                    };
                }
            }

            return null;
        } catch (error) {
            console.error('Error checking series duplicate:', error);
            return null;
        }
    }

    /**
     * Calculate string similarity using Levenshtein-like algorithm
     * Returns value between 0 and 1
     */
    private static calculateStringSimilarity(str1: string, str2: string): number {
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0;

        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        // Check if shorter is contained in longer (for partial matches)
        if (longer.includes(shorter)) {
            return shorter.length / longer.length;
        }

        // Calculate edit distance (simplified)
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        
        return 1 - distance / maxLength;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    private static levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Match organizer with domain fallback
     * Matches by organizer name OR by domain comparison when source URLs are available
     */
    private static matchOrganizerWithDomainFallback(
        record: EventSourceRecord,
        organizer: { id: string; name: string; website_url: string | null } | null,
        eventSourceUrl: string | null
    ): boolean {
        // If no organizer data, can't match
        if (!organizer) {
            return false;
        }

        // First try name-based matching
        if (record.organizer) {
            const nameMatch = this.matchOrganizer(record.organizer, organizer);
            if (nameMatch) {
                return true;
            }
        }

        // Fallback: domain comparison from source URLs
        // Extract domains from both source URLs and compare
        const recordDomain = this.extractDomain(record.sourceUrl);
        const eventDomain = this.extractDomain(eventSourceUrl || organizer.website_url || null);

        if (recordDomain && eventDomain && recordDomain === eventDomain) {
            // Domains match - allow fuzzy match to proceed
            return true;
        }

        return false;
    }

    /**
     * Extract normalized domain from URL
     */
    private static extractDomain(url: string | null | undefined): string | null {
        if (!url) return null;

        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase().replace(/^www\./, ''); // Remove www. prefix
        } catch {
            return null;
        }
    }

    /**
     * Match organizer names (fuzzy)
     */
    private static matchOrganizer(
        organizer1: string | undefined,
        organizer2: { name: string } | null | undefined
    ): boolean {
        if (!organizer1 || !organizer2?.name) {
            return false;
        }

        const name1 = organizer1.toLowerCase().trim();
        const name2 = organizer2.name.toLowerCase().trim();

        if (name1 === name2) return true;

        // Check if one contains the other
        if (name1.includes(name2) || name2.includes(name1)) {
            return true;
        }

        // Check similarity
        const similarity = this.calculateStringSimilarity(name1, name2);
        return similarity >= SIMILARITY_THRESHOLDS.HIGH;
    }

    /**
     * Mark source_event as duplicate
     */
    static async markAsDuplicate(
        sourceEventId: string,
        existingEventId: string,
        supabaseClient: SupabaseClientType
    ): Promise<void> {
        try {
            await supabaseClient
                .from('source_events')
                .update({
                    fetch_status: 'duplicate',
                    normalized_event_id: existingEventId,
                    error_message: `Duplicate of event ${existingEventId}`,
                })
                .eq('id', sourceEventId);
        } catch (error) {
            console.error('Error marking as duplicate:', error);
            // Don't throw - non-critical
        }
    }
}

