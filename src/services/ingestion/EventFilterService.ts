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
import { FILTERING_CONFIG, VALIDATION_LIMITS } from '@/config/ingestionConstants';

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
    /** Allow thin online events (location placeholder + no description) */
    allowThinOnline?: boolean;
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
        const lowQualityCheck = this.checkLowQuality(record, sourceConfig);
        if (lowQualityCheck.filtered) {
            return lowQualityCheck;
        }

        // Check if the source URL looks like a blog post (e.g., /blog/ paths)
        const blogUrlCheck = this.checkBlogUrl(record);
        if (blogUrlCheck.filtered) {
            return blogUrlCheck;
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
            
            // Check if event is too far in the future - likely data errors
            const maxFutureDate = new Date(
                now.getTime() + (FILTERING_CONFIG.MAX_FUTURE_YEARS * 365 * 24 * 60 * 60 * 1000)
            );
            if (eventDate > maxFutureDate) {
                return {
                    filtered: true,
                    reason: `Event is more than ${FILTERING_CONFIG.MAX_FUTURE_YEARS} years in the future - likely a data error`,
                    matchedPattern: 'future_event',
                    category: 'future-event',
                };
            }
            
            // Allow some grace period (e.g., events that ended within last N days might still be relevant)
            // But reject events that are clearly in the past (more than grace period days ago)
            
            // Check if source has date filter override
            const dateFilterOverride = sourceMetadata?.date_filter_override as {
                enabled?: boolean;
                maxAgeDays?: number;
            } | undefined;

            if (dateFilterOverride?.enabled === false) {
                // Source explicitly disabled date filtering
                return { filtered: false };
            }

            const maxAgeDays = dateFilterOverride?.maxAgeDays ?? FILTERING_CONFIG.GRACE_PERIOD_DAYS;
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
        record: EventSourceRecord,
        sourceConfig?: SourceFilterConfig
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
                const hasStrongMetadata =
                    !!record.registrationUrl ||
                    !!record.livestreamUrl ||
                    (Array.isArray(record.tags) && record.tags.length > 0) ||
                    (Array.isArray(record.speakerLineup) && record.speakerLineup.length > 0);
                if (!hasStrongMetadata && !sourceConfig?.allowThinOnline) {
                    // If location is placeholder AND no description, and no strong metadata signals, treat as low quality
                    return {
                        filtered: true,
                        reason: 'Location is placeholder and event has no description',
                        matchedPattern: 'placeholder_location',
                        category: 'low-quality',
                    };
                }
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

            // Very short titles are likely incomplete
            if (record.title.trim().length < VALIDATION_LIMITS.MIN_TITLE_LENGTH_STRICT) {
                return {
                    filtered: true,
                    reason: `Title is too short (less than ${VALIDATION_LIMITS.MIN_TITLE_LENGTH_STRICT} characters)`,
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
     * Check if the source or registration URL indicates the content is a blog post.
     * This happens when the URL contains common blog path segments like "/blog/".
     */
    private static checkBlogUrl(record: EventSourceRecord): FilterResult {
        const urlCandidates = [record.sourceUrl, record.registrationUrl, record.livestreamUrl].filter(
            (url): url is string => typeof url === 'string' && url.trim().length > 0
        );

        if (urlCandidates.length === 0) {
            return { filtered: false };
        }

        const blogPathPatterns: RegExp[] = [
            /\/blog\//i,
            /\/blogs\//i,
            /\/blog[-_]/i,
        ];

        const blogHostPatterns: RegExp[] = [
            /^blog\./i,
            /\.blog\./i,
        ];

        for (const urlCandidate of urlCandidates) {
            try {
                const parsed = new URL(urlCandidate);
                const hostname = parsed.hostname.toLowerCase();
                const pathname = parsed.pathname.toLowerCase();

                if (blogHostPatterns.some((pattern) => pattern.test(hostname))) {
                    return {
                        filtered: true,
                        reason: 'URL host indicates blog content',
                        matchedPattern: hostname,
                        category: 'blog-post',
                    };
                }

                if (blogPathPatterns.some((pattern) => pattern.test(pathname))) {
                    return {
                        filtered: true,
                        reason: 'URL path indicates blog content',
                        matchedPattern: pathname,
                        category: 'blog-post',
                    };
                }
            } catch (error) {
                // Ignore malformed URLs - they will be handled by other validation steps
                console.warn('Failed to parse URL while checking for blog content:', urlCandidate, error);
            }
        }

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
            allow_thin_online?: boolean;
        };

        return {
            disabled: filterRules.disabled,
            filterPatterns: filterRules.filterPatterns,
            checkFields: filterRules.checkFields,
            allowThinOnline: filterRules.allow_thin_online === true,
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
                // Validate pattern to prevent ReDoS
                if (pattern.pattern.length > 1000 || /(.)\1{50,}/.test(pattern.pattern)) {
                    // Pattern too long or has excessive repetition - treat as keyword
                    return normalizedSearch.includes(pattern.pattern.toLowerCase());
                }

                const regexFlags = DEFAULT_FILTER_CONFIG.caseInsensitive ? 'i' : '';
                const regex = new RegExp(pattern.pattern, regexFlags);
                return regex.test(normalizedSearch);
            } catch (error) {
                // Invalid regex - log and treat as keyword
                console.warn('Invalid regex pattern:', pattern.pattern, error);
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


