/**
 * Event Deduplication Service
 * 
 * Prevents duplicate events using fuzzy matching with PostgreSQL pg_trgm.
 * Handles recurring series by linking to existing series_id.
 */

import type { SupabaseClientType } from '@/types';
import type { EventSourceRecord } from '@/types/ingestion';
import * as Sentry from '@sentry/nextjs';

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingEventId?: string;
    similarity?: number;
    matchReason?: 'exact_checksum' | 'fuzzy_title' | 'series_match';
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
     * Matches on: similar title + same start_time (within 1 hour) + same organizer
     */
    private static async checkFuzzyDuplicate(
        record: EventSourceRecord,
        supabaseClient: SupabaseClientType
    ): Promise<{ eventId: string; similarity: number } | null> {
        try {
            // Use PostgreSQL similarity function (pg_trgm)
            // Query events with similar title, matching time window, and organizer
            const rpcPayload: {
                p_title: string;
                p_start_time: string;
                p_similarity_threshold?: number;
                p_organizer_id?: string;
            } = {
                p_title: record.title,
                p_start_time: record.startTime,
                p_similarity_threshold: 0.6, // 60% similarity threshold
            };

            if (record.organizer && record.organizer.trim().length > 0) {
                rpcPayload.p_organizer_id = record.organizer;
            }

            const { data, error } = await supabaseClient.rpc('find_similar_events', rpcPayload);

            // If RPC doesn't exist, fall back to client-side fuzzy matching
            if (error && error.message.includes('function') && error.message.includes('does not exist')) {
                return await this.clientSideFuzzyMatch(record, supabaseClient);
            }

            if (error) {
                throw error;
            }

            // Find best match from results
            if (data && Array.isArray(data) && data.length > 0) {
                const bestMatch = data[0];
                if (bestMatch.similarity >= 0.6) {
                    return {
                        eventId: bestMatch.event_id,
                        similarity: bestMatch.similarity,
                    };
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
            const timeWindowStart = new Date(startTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
            const timeWindowEnd = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after

            // Query events in time window
            const { data: events, error } = await supabaseClient
                .from('events')
                .select('id, title, start_time, organizer_id, organizers(name)')
                .gte('start_time', timeWindowStart.toISOString())
                .lte('start_time', timeWindowEnd.toISOString())
                .limit(50); // Reasonable limit for comparison

            if (error) {
                throw error;
            }

            if (!events || events.length === 0) {
                return null;
            }

            // Calculate similarity for each event
            let bestMatch: { eventId: string; similarity: number } | null = null;
            let bestSimilarity = 0;

            for (const event of events) {
                // Check organizer match
                const organizerMatch = this.matchOrganizer(
                    record.organizer,
                    event.organizers as { name: string } | null
                );

                if (!organizerMatch) {
                    continue; // Skip if organizers don't match
                }

                // Calculate title similarity
                const similarity = this.calculateStringSimilarity(
                    record.title.toLowerCase(),
                    (event.title || '').toLowerCase()
                );

                if (similarity >= 0.6 && similarity > bestSimilarity) {
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
                .limit(10);

            if (error || !similarEvents || similarEvents.length === 0) {
                return null;
            }

            // Check if title is similar enough and might be same series
            for (const event of similarEvents) {
                const similarity = this.calculateStringSimilarity(
                    record.title.toLowerCase(),
                    (event.title || '').toLowerCase()
                );

                if (similarity >= 0.7) {
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
        return similarity >= 0.8;
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

