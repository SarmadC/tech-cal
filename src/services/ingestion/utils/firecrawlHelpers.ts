/**
 * Firecrawl Helper Utilities
 * 
 * Common utilities for Firecrawl enrichment: URL resolution, metadata extraction,
 * time validation, and retry calculations.
 */

import type { FirecrawlScrapeResponse } from '@/types/firecrawl';
import { normalizeUrl } from './urlResolver';
import { RETRY_CONFIG } from '@/config/ingestionConstants';
import * as Sentry from '@sentry/nextjs';

type MetadataRecord = NonNullable<NonNullable<FirecrawlScrapeResponse['data']>['metadata']>;

/**
 * Resolve final URL from Firecrawl metadata
 * Priority: metadata.url (final destination) > metadata.ogUrl > metadata.sourceURL (original URL)
 */
export function resolveMetadataUrl(metadata?: MetadataRecord): string | undefined {
    if (!metadata) {
        return undefined;
    }

    const directUrl = metadata['url'];
    if (typeof directUrl === 'string' && directUrl.trim().length > 0) {
        return directUrl;
    }

    if (typeof metadata.ogUrl === 'string' && metadata.ogUrl.trim().length > 0) {
        return metadata.ogUrl;
    }

    const sourceUrl = metadata['sourceURL'];
    if (typeof sourceUrl === 'string' && sourceUrl.trim().length > 0) {
        return sourceUrl;
    }

    return undefined;
}

/**
 * Check if registration URL should be scraped
 */
export function shouldScrapeRegistrationUrl(
    sourceUrl: string,
    registrationUrl: string | null | undefined
): boolean {
    if (!registrationUrl) {
        return false;
    }

    // Skip if same as source URL
    const normalizedSource = normalizeUrl(sourceUrl);
    const normalizedRegistration = normalizeUrl(registrationUrl);
    
    return normalizedSource !== normalizedRegistration;
}

/**
 * Validate and normalize time string to ISO 8601 format
 * Returns null if invalid or appears to be a default time that matches the original
 * 
 * @param timeStr - The extracted time string to validate
 * @param originalTime - The existing event time (optional) - if provided, only reject if extracted time exactly matches it
 */
export function validateAndNormalizeTime(timeStr: string, originalTime?: string | null): string | null {
    if (!timeStr || typeof timeStr !== 'string') {
        return null;
    }

    try {
        // Parse the time string
        const date = new Date(timeStr);
        
        // Check if it's a valid date
        if (isNaN(date.getTime())) {
            return null;
        }

        const normalizedTime = date.toISOString();

        // If we have an original time, compare without timezone and minute/second precision
        // Only reject if extracted time exactly matches the original (suggesting it's the same default)
        if (originalTime) {
            try {
                const originalDate = new Date(originalTime);
                if (!isNaN(originalDate.getTime())) {
                    // Compare dates without timezone info - extract just the date and hour components
                    const extractedYear = date.getUTCFullYear();
                    const extractedMonth = date.getUTCMonth();
                    const extractedDay = date.getUTCDate();
                    const extractedHour = date.getUTCHours();
                    const extractedMinutes = date.getUTCMinutes();
                    const extractedSeconds = date.getUTCSeconds();

                    const originalYear = originalDate.getUTCFullYear();
                    const originalMonth = originalDate.getUTCMonth();
                    const originalDay = originalDate.getUTCDate();
                    const originalHour = originalDate.getUTCHours();
                    const originalMinutes = originalDate.getUTCMinutes();
                    const originalSeconds = originalDate.getUTCSeconds();

                    // Check if it's exactly the same (same date, hour, and both have zero minutes/seconds)
                    // This indicates it's likely the same default time
                    if (
                        extractedYear === originalYear &&
                        extractedMonth === originalMonth &&
                        extractedDay === originalDay &&
                        extractedHour === originalHour &&
                        extractedMinutes === originalMinutes &&
                        extractedSeconds === originalSeconds
                    ) {
                        return null;
                    }
                }
            } catch {
                // If original time parsing fails, continue with other checks
            }
        }

        // Check if it looks like a default time pattern (midnight, 7am, or 9am UTC with no minutes/seconds)
        // Only reject if it's clearly a default pattern AND we don't have an original to compare against
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        
        // If we don't have an original time to compare, do basic default pattern check
        if (!originalTime && minutes === 0 && seconds === 0 && (hours === 0 || hours === 7 || hours === 9)) {
            // Only reject if it's clearly a default pattern (no timezone offset in string)
            if (timeStr.includes('T00:00:00') || timeStr.includes('T07:00:00') || timeStr.includes('T09:00:00')) {
                // But allow if it has explicit timezone info (suggests it's a real time)
                if (!timeStr.match(/[+-]\d{2}:\d{2}$/) && !timeStr.endsWith('Z')) {
                    return null;
                }
            }
        }

        // Accept the time
        return normalizedTime;
    } catch {
        return null;
    }
}

/**
 * Convert various time string formats to HH:MM (24-hour) representation.
 */
export function convertToHHMM(timeStr?: string, timezone?: string | null): string | null {
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
 * Format date to HH:MM format with timezone support
 */
export function formatDateToHHMM(date: Date, timezone?: string | null): string {
    if (timezone && timezone.includes('/')) {
        try {
            const formatter = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hourCycle: 'h23',
                timeZone: timezone,
            });
            return formatter.format(date);
        } catch (error) {
            Sentry.captureException(error, {
                tags: { context: 'formatDateToHHMM' },
                extra: { timezone },
            });
        }
    }

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Calculate exponential backoff delay for retries
 */
export function calculateRetryDelay(retryCount: number): number {
    return Math.min(
        RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, retryCount),
        RETRY_CONFIG.MAX_DELAY_MS
    );
}

/**
 * Calculate next retry timestamp
 */
export function calculateNextRetryAt(retryCount: number): Date {
    const now = new Date();
    const delay = calculateRetryDelay(retryCount);
    return new Date(now.getTime() + delay);
}

/**
 * Create a timeout promise that rejects after the specified duration
 */
export function createTimeoutPromise<T>(timeoutMs: number, operation: string): Promise<T> {
    return new Promise<T>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Firecrawl ${operation} timeout after ${timeoutMs}ms`));
        }, timeoutMs);
    });
}





