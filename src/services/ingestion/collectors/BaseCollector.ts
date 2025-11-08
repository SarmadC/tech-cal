/**
 * Base Collector Interface
 * 
 * Shared interface for all event collectors (API, RSS, ICS, HTML, Manual).
 * Each collector must implement this interface to normalize source data.
 */

import type { EventSourceRecord, CollectorResult } from '@/types/ingestion';
import { isValidUrl } from '../utils/urlResolver';
import { TIMEOUT_CONFIG, VALIDATION_LIMITS } from '@/config/ingestionConstants';

export interface CollectorConfig {
    sourceId: string;
    sourceUrl: string;
    metadata?: Record<string, unknown>;
}

export abstract class BaseCollector {
    protected config: CollectorConfig;

    constructor(config: CollectorConfig) {
        this.config = config;
    }

    /**
     * Main collection method - must be implemented by each collector
     * @returns Promise<CollectorResult> - Normalized event records with provenance and confidence
     */
    abstract collect(): Promise<CollectorResult>;

    /**
     * Validate collected record before returning
     */
    protected validateRecord(record: EventSourceRecord): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Required fields
        if (!record.title || record.title.trim().length < VALIDATION_LIMITS.MIN_TITLE_LENGTH) {
            errors.push(`Title is required and must be at least ${VALIDATION_LIMITS.MIN_TITLE_LENGTH} characters`);
        }

        if (!record.startTime) {
            errors.push('Start time is required');
        }

        if (!record.location) {
            errors.push('Location is required');
        }

        if (!record.sourceUrl) {
            errors.push('Source URL is required');
        }

        // Validate dates
        if (record.startTime) {
            const startDate = new Date(record.startTime);
            if (isNaN(startDate.getTime())) {
                errors.push('Invalid start time format');
            }
        }

        if (record.endTime) {
            const endDate = new Date(record.endTime);
            if (isNaN(endDate.getTime())) {
                errors.push('Invalid end time format');
            }
            
            // End time should be after start time
            if (record.startTime && endDate < new Date(record.startTime)) {
                errors.push('End time must be after start time');
            }
        }

        // Validate URLs
        if (record.sourceUrl && !isValidUrl(record.sourceUrl)) {
            errors.push('Invalid source URL format');
        }

        if (record.registrationUrl && !isValidUrl(record.registrationUrl)) {
            errors.push('Invalid registration URL format');
        }

        if (record.livestreamUrl && !isValidUrl(record.livestreamUrl)) {
            errors.push('Invalid livestream URL format');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Create provenance record for a collected event
     * Note: raw_hash should be calculated from stable fields, not the entire rawPayload
     * This method creates the provenance structure, but the hash should be set separately
     */
    protected createProvenance(
        fetchJobId: string,
        rawHash: string, // Pre-calculated hash from stable fields
        collectorVersion?: string
    ): EventSourceRecord['provenance'] {
        return {
            source_id: this.config.sourceId,
            fetch_job_id: fetchJobId,
            collector: this.getCollectorType(),
            raw_hash: rawHash,
            quality_components: {
                source_trust: 0, // Will be calculated later
                metadata_completeness: 0, // Will be calculated later
                speaker_verification: 0, // Will be calculated later
                historical_performance: 0, // Will be calculated later
            },
            fetched_at: new Date().toISOString(),
            collector_version: collectorVersion,
        };
    }

    /**
     * Calculate confidence score based on data completeness
     */
    protected calculateConfidence(record: EventSourceRecord): number {
        let score = 0;
        let maxScore = 0;

        // Title (required) - 20%
        maxScore += 20;
        if (record.title && record.title.length >= VALIDATION_LIMITS.MIN_TITLE_LENGTH_FOR_SCORE) score += 20;
        else if (record.title && record.title.length >= VALIDATION_LIMITS.MIN_TITLE_LENGTH) score += 10;

        // Description - 15%
        maxScore += 15;
        if (record.description && record.description.length >= VALIDATION_LIMITS.MIN_DESCRIPTION_LENGTH) score += 15;
        else if (record.description) score += 7;

        // Dates - 20%
        maxScore += 20;
        if (record.startTime && record.endTime) score += 20;
        else if (record.startTime) score += 10;

        // Location - 10%
        maxScore += 10;
        if (record.location && record.location !== 'TBD') score += 10;
        else if (record.location) score += 5;

        // URLs - 10%
        maxScore += 10;
        if (record.sourceUrl) score += 5;
        if (record.registrationUrl) score += 5;

        // Organizer - 10%
        maxScore += 10;
        if (record.organizer) score += 10;

        // Speaker lineup - 10%
        maxScore += 10;
        if (record.speakerLineup && record.speakerLineup.length > 0) score += 10;

        // Tags - 5%
        maxScore += 5;
        if (record.tags && record.tags.length > 0) score += 5;

        return Math.round((score / maxScore) * 100);
    }

    /**
     * Get collector type (must be implemented by subclass)
     */
    protected abstract getCollectorType(): EventSourceRecord['provenance']['collector'];

    /**
     * Hash stable payload using SHA-256 for deduplication
     * Uses Web Crypto API for proper cryptographic hashing
     */
    protected async hashStablePayload(payload: unknown): Promise<string> {
        const payloadStr = JSON.stringify(payload);
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(payloadStr);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }


    /**
     * Retry logic helper with exponential backoff
     */
    protected async retryWithBackoff<T>(
        fn: () => Promise<T>,
        maxRetries: number = TIMEOUT_CONFIG.COLLECTOR_MAX_RETRIES,
        baseDelay: number = TIMEOUT_CONFIG.COLLECTOR_BASE_DELAY_MS
    ): Promise<T> {
        let lastError: Error | unknown;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries - 1) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }
}

