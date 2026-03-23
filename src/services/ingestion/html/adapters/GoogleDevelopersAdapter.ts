import type { HtmlCoreExtractionResult } from '../EventHtmlExtractor';
import type { HtmlDomainAdapter } from './types';
import { toISODateTime } from './utils/dateUtils';

interface ParsedDateRange {
    startDate: string;
    endDate?: string;
    isRecurring?: boolean;
    recurrencePattern?: string;
}

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_SHORT_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function parseMonth(monthStr: string): number {
    const lower = monthStr.toLowerCase().trim();
    let index = MONTH_NAMES.indexOf(lower);
    if (index !== -1) return index + 1;
    index = MONTH_SHORT_NAMES.indexOf(lower);
    if (index !== -1) return index + 1;
    return 0;
}

function parseDateValue(dayStr: string, month: number, year: number): Date | null {
    const day = parseInt(dayStr.trim(), 10);
    if (isNaN(day) || month === 0) return null;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse Google Developers event date strings
 * Supports formats like:
 * - "March 12" (single day, current year)
 * - "March 12-13" (multi-day, same month)
 * - "March 12-13, 2026" (multi-day, specific year)
 * - "March 4 - April 1 (Wednesdays)" (recurring)
 * - "March 17-18, 2026 | Online" (with location suffix)
 */
function parseEventDate(dateStr: string, referenceYear?: number): ParsedDateRange | null {
    const year = referenceYear || new Date().getFullYear();
    
    // Clean up the date string - remove location info after |
    const cleanDate = dateStr.split('|')[0].trim();
    
    // Pattern: "March 17-18, 2026" or "March 12-13"
    const multiDaySameMonthPattern = /^([a-zA-Z]+)\s+(\d{1,2})\s*-\s*(\d{1,2})(?:,\s*(\d{4}))?/i;
    const multiDayMatch = cleanDate.match(multiDaySameMonthPattern);
    if (multiDayMatch) {
        const month = parseMonth(multiDayMatch[1]);
        const startDay = multiDayMatch[2];
        const endDay = multiDayMatch[3];
        const explicitYear = multiDayMatch[4] ? parseInt(multiDayMatch[4], 10) : year;
        
        const startDate = parseDateValue(startDay, month, explicitYear);
        const endDate = parseDateValue(endDay, month, explicitYear);
        
        if (startDate) {
            return {
                startDate: startDate.toISOString(),
                endDate: endDate?.toISOString(),
            };
        }
    }
    
    // Pattern: "March 4 - April 1" or "March 4 - April 1 (Wednesdays)"
    const multiMonthPattern = /^([a-zA-Z]+)\s+(\d{1,2})\s*-\s*([a-zA-Z]+)\s+(\d{1,2})/i;
    const multiMonthMatch = cleanDate.match(multiMonthPattern);
    if (multiMonthMatch) {
        const startMonth = parseMonth(multiMonthMatch[1]);
        const startDay = multiMonthMatch[2];
        const endMonth = parseMonth(multiMonthMatch[3]);
        const endDay = multiMonthMatch[4];
        
        // Extract recurrence pattern if present
        const recurrenceMatch = cleanDate.match(/\(([^)]+)\)/);
        const recurrencePattern = recurrenceMatch ? recurrenceMatch[1] : undefined;
        
        const startDate = parseDateValue(startDay, startMonth, year);
        // Handle year boundary
        const endYear = endMonth < startMonth ? year + 1 : year;
        const endDate = parseDateValue(endDay, endMonth, endYear);
        
        if (startDate) {
            return {
                startDate: startDate.toISOString(),
                endDate: endDate?.toISOString(),
                isRecurring: !!recurrencePattern,
                recurrencePattern,
            };
        }
    }
    
    // Pattern: "March 12" (single day)
    const singleDayPattern = /^([a-zA-Z]+)\s+(\d{1,2})(?:,\s*(\d{4}))?/i;
    const singleDayMatch = cleanDate.match(singleDayPattern);
    if (singleDayMatch) {
        const month = parseMonth(singleDayMatch[1]);
        const day = singleDayMatch[2];
        const explicitYear = singleDayMatch[3] ? parseInt(singleDayMatch[3], 10) : year;
        
        const startDate = parseDateValue(day, month, explicitYear);
        if (startDate) {
            return {
                startDate: startDate.toISOString(),
            };
        }
    }
    
    // Try standard date parsing as fallback
    const standardDate = toISODateTime(cleanDate);
    if (standardDate) {
        return { startDate: standardDate };
    }
    
    return null;
}

function inferLocation(locationText: string): { location: string; format: 'virtual' | 'in-person' | 'hybrid' } {
    const lower = locationText.toLowerCase();
    
    if (lower === 'online' || lower === 'virtual') {
        return { location: 'Online', format: 'virtual' };
    }
    
    if (lower === 'in-person') {
        return { location: 'In-person', format: 'in-person' };
    }
    
    if (lower === 'hybrid') {
        return { location: 'Hybrid', format: 'hybrid' };
    }
    
    // Default to in-person for city/region names
    return { location: locationText, format: 'in-person' };
}

function extractEventsFromDocument(document: Document): Array<{
    title: string;
    dateRange: ParsedDateRange;
    location: string;
    format: 'virtual' | 'in-person' | 'hybrid';
    description?: string;
}> {
    const events: Array<{
        title: string;
        dateRange: ParsedDateRange;
        location: string;
        format: 'virtual' | 'in-person' | 'hybrid';
        description?: string;
    }> = [];
    
    // Google Developers events page uses devsite-landing-row for event cards
    const eventCards = document.querySelectorAll('.devsite-landing-row-item, [data-category="event"], .event-card');
    
    for (const card of Array.from(eventCards)) {
        // Extract title
        const titleEl = card.querySelector('h3, .devsite-landing-row-item-title, [data-label="event-title"]');
        const title = titleEl?.textContent?.trim();
        if (!title) continue;
        
        // Extract date - typically in a subtitle or description area
        const dateEl = card.querySelector('.devsite-landing-row-item-description, p, [data-label="event-date"]');
        const dateText = dateEl?.textContent?.trim();
        if (!dateText) continue;
        
        // Parse date - look for date patterns like "March 12-13 | Online"
        const dateParts = dateText.split('|').map(p => p.trim());
        const dateStr = dateParts[0];
        const locationStr = dateParts[1] || 'Online';
        
        const dateRange = parseEventDate(dateStr);
        if (!dateRange) continue;
        
        const { location, format } = inferLocation(locationStr);
        
        // Extract description if available
        const descEl = card.querySelector('.devsite-landing-row-item-description p, [data-label="event-description"]');
        const description = descEl?.textContent?.trim();
        
        events.push({
            title,
            dateRange,
            location,
            format,
            description,
        });
    }
    
    // Also look for structured data in script tags (Google often embeds JSON)
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(scripts)) {
        try {
            const data = JSON.parse(script.textContent || '{}');
            const eventsData = Array.isArray(data) ? data : [data];
            
            for (const event of eventsData) {
                if (event['@type'] === 'Event' || event['@type'] === 'EducationEvent') {
                    const title = event.name;
                    const startDate = event.startDate;
                    const endDate = event.endDate;
                    const locationName = event.location?.name || 'Online';
                    const description = event.description;
                    
                    if (title && startDate) {
                        const dateRange: ParsedDateRange = {
                            startDate: toISODateTime(startDate) || new Date(startDate).toISOString(),
                        };
                        if (endDate) {
                            dateRange.endDate = toISODateTime(endDate) || new Date(endDate).toISOString();
                        }
                        
                        const { location, format } = inferLocation(locationName);
                        
                        events.push({
                            title,
                            dateRange,
                            location,
                            format,
                            description,
                        });
                    }
                }
            }
        } catch {
            // Ignore JSON parse errors
        }
    }
    
    return events;
}

export const googleDevelopersAdapter: HtmlDomainAdapter = {
    matches(url: URL): boolean {
        return url.hostname === 'developers.google.com' || url.hostname.endsWith('.developers.google.com');
    },
    
    apply(document: Document, result: HtmlCoreExtractionResult): void {
        const url = new URL(document.URL);
        
        // Only apply to the events page
        if (!url.pathname.includes('/events')) {
            return;
        }
        
        const events = extractEventsFromDocument(document);
        
        if (events.length === 0) {
            return;
        }
        
        // For the main events page, we extract multiple events
        // The first/upcoming event gets the main result fields
        const primaryEvent = events[0];
        
        // Title
        if (primaryEvent.title && !result.title) {
            result.title = primaryEvent.title;
            result.confidence.title = 0.9;
            result.provenance.sources.push('google-developers.primary.title');
        }
        
        // Dates
        if (primaryEvent.dateRange.startDate && !result.startTime) {
            result.startTime = primaryEvent.dateRange.startDate;
            result.confidence.startTime = 0.9;
            result.provenance.sources.push('google-developers.primary.start');
        }
        
        if (primaryEvent.dateRange.endDate && !result.endTime) {
            result.endTime = primaryEvent.dateRange.endDate;
            result.confidence.endTime = 0.85;
            result.provenance.sources.push('google-developers.primary.end');
        }
        
        // Location
        if (primaryEvent.location && !result.location) {
            result.location = primaryEvent.location;
            result.confidence.location = 0.85;
            result.provenance.sources.push('google-developers.primary.location');
        }
        
        // Description
        if (primaryEvent.description && !result.description) {
            result.description = primaryEvent.description;
            result.confidence.description = 0.7;
            result.provenance.sources.push('google-developers.primary.description');
        }
    },
};
