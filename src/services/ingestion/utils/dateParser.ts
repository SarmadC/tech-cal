/**
 * Date Parser Utility
 * 
 * Centralized date parsing logic for ingestion pipeline.
 * Handles various date formats from RSS/ICS feeds.
 */

/**
 * Parse date string to ISO format.
 * If the string lacks timezone info, assumes UTC to avoid
 * inconsistent results across server environments.
 */
export function parseDate(dateStr: string | undefined): string | undefined {
    if (!dateStr) {
        return undefined;
    }

    let normalized = dateStr.trim();

    // If the string looks like a date/datetime without timezone info, assume UTC
    // Matches patterns like "2026-03-15", "2026-03-15 09:00", "2026-03-15T09:00:00"
    // but NOT strings already containing Z, +offset, or -offset at the end
    if (
        /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?$/.test(normalized)
    ) {
        if (!normalized.includes('T')) {
            normalized = normalized.replace(' ', 'T');
        }
        normalized += 'Z';
    }

    const date = new Date(normalized);
    if (isNaN(date.getTime())) {
        return undefined;
    }

    return date.toISOString();
}

/**
 * Extract date from content/description using common patterns
 */
export function extractDateFromContent(content: string): string | undefined {
    if (!content) return undefined;

    // Common date patterns in event descriptions
    const datePatterns = [
        /(?:event|starts?|begins?|on)\s+(?:the\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\w+\s+\d{1,2},?\s+\d{4})/i, // "January 15, 2024"
        /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/i, // ISO-like format
    ];

    for (const pattern of datePatterns) {
        const match = content.match(pattern);
        if (match) {
            const parsed = parseDate(match[1]);
            if (parsed) return parsed;
        }
    }

    return undefined;
}

/**
 * Parse event date from RSS item with multiple field variations
 */
export function parseEventDateFromFields(
    item: Record<string, unknown>,
    fieldVariations: readonly string[]
): string | undefined {
    for (const field of fieldVariations) {
        const candidate = item[field] ?? item[field.toLowerCase()];
        const dateValue = typeof candidate === 'string' ? candidate : undefined;
        if (dateValue) {
            const parsed = parseDate(dateValue);
            if (parsed) return parsed;
        }
    }
    return undefined;
}

/**
 * Event start date field variations (in order of preference)
 */
export const EVENT_START_DATE_FIELDS = [
    'event:startdate',
    'ev:startdate',
    'ical:dtstart',
    'event:start',
    'startdate',
    'event_date',
    'eventDate',
    'eventStart',
    'startDate',
] as const;

/**
 * Event end date field variations (in order of preference)
 */
export const EVENT_END_DATE_FIELDS = [
    'event:enddate',
    'ev:enddate',
    'ical:dtend',
    'event:end',
    'enddate',
    'event_end_date',
    'eventEnd',
    'endDate',
] as const;

