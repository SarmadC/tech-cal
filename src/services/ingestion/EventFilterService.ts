/**
 * Event Filter Service
 * 
 * Filters events based on configured patterns and per-source rules.
 * Supports both early rejection (collector level) and sophisticated filtering (normalization level).
 */

import type { EventSourceRecord } from '@/types/ingestion';
import {
    getEnabledFilterPatterns,
    DEFAULT_FILTER_CONFIG,
    type FilterPattern,
} from '@/config/ingestionFilters';

export interface FilterResult {
    filtered: boolean;
    reason?: string;
    matchedPattern?: string;
    category?: string;
}

export interface SourceFilterConfig {
    /** Override global patterns with source-specific patterns */
    filterPatterns?: FilterPattern[];
    /** Disable filtering for this source */
    disabled?: boolean;
    /** Additional fields to check (beyond title, description, tags) */
    checkFields?: string[];
}

/**
 * Event Filter Service
 */
export class EventFilterService {
    /**
     * Check if an event should be filtered out
     * 
     * @param record - Event record to check
     * @param sourceMetadata - Source metadata (may contain filter_rules override)
     * @returns FilterResult indicating if event should be filtered and why
     */
    static shouldFilterEvent(
        record: EventSourceRecord,
        sourceMetadata?: Record<string, unknown>
    ): FilterResult {
        // Extract source-specific filter config
        const sourceConfig = this.extractSourceFilterConfig(sourceMetadata);

        // Check if event is in the past or too far in the future (before applying other filters)
        const pastEventCheck = this.checkPastEvent(record, sourceMetadata);
        if (pastEventCheck.filtered) {
            return pastEventCheck;
        }

        // Check for low quality indicators (missing data, placeholders)
        const lowQualityCheck = this.checkLowQuality(record);
        if (lowQualityCheck.filtered) {
            return lowQualityCheck;
        }

        // If filtering is disabled for this source, skip pattern checks
        if (sourceConfig?.disabled) {
            return { filtered: false };
        }

        // Get patterns to check (source-specific or global)
        const patterns = sourceConfig?.filterPatterns || getEnabledFilterPatterns();

        if (patterns.length === 0) {
            return { filtered: false };
        }

        // Build search text from record fields
        const searchText = this.buildSearchText(record, sourceConfig);

        // Check patterns against search text
        for (const pattern of patterns) {
            const matches = this.matchesPattern(pattern, searchText);

            if (matches) {
                return {
                    filtered: true,
                    reason: pattern.reason,
                    matchedPattern: pattern.pattern,
                    category: pattern.category,
                };
            }
        }

        return { filtered: false };
    }

    /**
     * Check if event is in the past (already occurred) or too far in the future
     * 
     * @param record - Event record to check
     * @param sourceMetadata - Source metadata (may contain date_filter_override)
     * @returns FilterResult indicating if event should be filtered as past/future event
     */
    private static checkPastEvent(
        record: EventSourceRecord,
        sourceMetadata?: Record<string, unknown>
    ): FilterResult {
        if (!record.startTime) {
            // No start time - can't determine if it's past, so don't filter
            return { filtered: false };
        }

        try {
            const eventDate = new Date(record.startTime);
            const now = new Date();
            
            // Check if event is too far in the future (more than 2 years) - likely data errors
            const maxFutureYears = 2;
            const maxFutureDate = new Date(now.getTime() + (maxFutureYears * 365 * 24 * 60 * 60 * 1000));
            if (eventDate > maxFutureDate) {
                return {
                    filtered: true,
                    reason: `Event is more than ${maxFutureYears} years in the future - likely a data error`,
                    matchedPattern: 'future_event',
                    category: 'future-event',
                };
            }
            
            // Allow some grace period (e.g., events that ended within last 7 days might still be relevant)
            // But reject events that are clearly in the past (more than 7 days ago)
            const gracePeriodDays = 7;
            
            // Check if source has date filter override
            const dateFilterOverride = sourceMetadata?.date_filter_override as {
                enabled?: boolean;
                maxAgeDays?: number;
            } | undefined;

            if (dateFilterOverride?.enabled === false) {
                // Source explicitly disabled date filtering
                return { filtered: false };
            }

            const maxAgeDays = dateFilterOverride?.maxAgeDays ?? gracePeriodDays;
            const cutoffDate = new Date(now.getTime() - (maxAgeDays * 24 * 60 * 60 * 1000));

            if (eventDate < cutoffDate) {
                const daysAgo = Math.floor((now.getTime() - eventDate.getTime()) / (24 * 60 * 60 * 1000));
                return {
                    filtered: true,
                    reason: `Event occurred ${daysAgo} days ago - past events are not relevant`,
                    matchedPattern: 'past_event',
                    category: 'past-event',
                };
            }
        } catch (error) {
            // Invalid date - don't filter, let other validation catch it
            console.warn('Invalid date format in event record:', record.startTime, error);
            return { filtered: false };
        }

        return { filtered: false };
    }

    /**
     * Check if event has low quality indicators (missing critical data, placeholder text)
     * 
     * @param record - Event record to check
     * @returns FilterResult indicating if event should be filtered due to low quality
     */
    private static checkLowQuality(
        record: EventSourceRecord
    ): FilterResult {
        // Check for placeholder organizer
        if (record.organizer) {
            const organizerLower = record.organizer.toLowerCase().trim();
            if (organizerLower === 'unknown' || organizerLower === 'tbd' || organizerLower === 'tba' || organizerLower === '') {
                return {
                    filtered: true,
                    reason: 'Organizer is missing or placeholder (Unknown/TBD/TBA)',
                    matchedPattern: 'missing_organizer',
                    category: 'low-quality',
                };
            }
        }

        // Check for placeholder location
        if (record.location) {
            const locationLower = record.location.toLowerCase().trim();
            const placeholderLocations = ['tbd', 'tba', 'to be determined', 'to be announced', 'online', 'virtual'];
            if (placeholderLocations.includes(locationLower) && !record.description) {
                // If location is placeholder AND no description, likely incomplete
                return {
                    filtered: true,
                    reason: 'Location is placeholder and event has no description',
                    matchedPattern: 'placeholder_location',
                    category: 'low-quality',
                };
            }
        }

        // Check for very short or placeholder titles
        if (record.title) {
            const titleLower = record.title.toLowerCase().trim();
            const placeholderTitles = ['untitled', 'untitled event', 'tbd', 'tba', 'event', 'new event'];
            if (placeholderTitles.includes(titleLower)) {
                return {
                    filtered: true,
                    reason: 'Title is placeholder or too generic',
                    matchedPattern: 'placeholder_title',
                    category: 'low-quality',
                };
            }

            // Very short titles (less than 5 chars) are likely incomplete
            if (record.title.trim().length < 5) {
                return {
                    filtered: true,
                    reason: 'Title is too short (less than 5 characters)',
                    matchedPattern: 'short_title',
                    category: 'low-quality',
                };
            }
        }

        // Check for missing description (optional but indicates lower quality)
        // Note: We don't filter on this alone, but it's a quality indicator

        return { filtered: false };
    }

    /**
     * Extract source-specific filter configuration from metadata
     */
    private static extractSourceFilterConfig(
        sourceMetadata?: Record<string, unknown>
    ): SourceFilterConfig | undefined {
        if (!sourceMetadata || !sourceMetadata.filter_rules) {
            return undefined;
        }

        const filterRules = sourceMetadata.filter_rules as {
            disabled?: boolean;
            filterPatterns?: FilterPattern[];
            checkFields?: string[];
        };

        return {
            disabled: filterRules.disabled,
            filterPatterns: filterRules.filterPatterns,
            checkFields: filterRules.checkFields,
        };
    }

    /**
     * Build searchable text from event record fields
     */
    private static buildSearchText(
        record: EventSourceRecord,
        sourceConfig?: SourceFilterConfig
    ): string {
        const parts: string[] = [];

        if (DEFAULT_FILTER_CONFIG.checkTitle && record.title) {
            parts.push(record.title);
        }

        if (DEFAULT_FILTER_CONFIG.checkDescription && record.description) {
            parts.push(record.description);
        }

        if (DEFAULT_FILTER_CONFIG.checkTags && record.tags) {
            parts.push(...record.tags);
        }

        // Add any additional fields from source config
        if (sourceConfig?.checkFields) {
            const recordDict = record as unknown as Record<string, unknown>;
            for (const field of sourceConfig.checkFields) {
                const value = recordDict[field];
                if (typeof value === 'string') {
                    parts.push(value);
                } else if (Array.isArray(value)) {
                    parts.push(...value.filter((v): v is string => typeof v === 'string'));
                }
            }
        }

        return parts.join(' ').toLowerCase();
    }

    /**
     * Check if pattern matches search text
     */
    private static matchesPattern(
        pattern: FilterPattern,
        searchText: string
    ): boolean {
        const normalizedSearch = DEFAULT_FILTER_CONFIG.caseInsensitive
            ? searchText.toLowerCase()
            : searchText;

        if (pattern.isRegex) {
            try {
                const regexFlags = DEFAULT_FILTER_CONFIG.caseInsensitive ? 'i' : '';
                const regex = new RegExp(pattern.pattern, regexFlags);
                return regex.test(normalizedSearch);
            } catch (error) {
                // Invalid regex - log and treat as keyword
                console.warn(`Invalid regex pattern: ${pattern.pattern}`, error);
                return normalizedSearch.includes(pattern.pattern.toLowerCase());
            }
        } else {
            // Keyword matching (case-insensitive)
            const normalizedPattern = DEFAULT_FILTER_CONFIG.caseInsensitive
                ? pattern.pattern.toLowerCase()
                : pattern.pattern;
            return normalizedSearch.includes(normalizedPattern);
        }
    }
}


