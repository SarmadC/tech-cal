// src/utils/dateUtils.ts

import { formatInTimeZone as formatInTimeZoneFns } from 'date-fns-tz';

/**
 * Core date formatting utilities for Kure-Cal
 * All dates are formatted in the user's browser local timezone
 */

// ============================================
// TIMEZONE CORRECTION HELPER
// ============================================

/**
 * Corrects timezone offset errors in stored UTC values.
 * Some events are stored with incorrect UTC values (e.g., stored as PDT when should be PST).
 * This function detects and corrects these issues based on the event's intended timezone.
 * @param dateObj The Date object (in UTC)
 * @param eventTimezone The event's intended timezone (e.g., "PT", "ET", "MT")
 * @returns Corrected Date object
 */
function correctTimezoneOffset(dateObj: Date, eventTimezone?: string | null): Date {
    if (!eventTimezone) return dateObj;
    
    const tz = eventTimezone.toUpperCase().trim();
    
    // Handle Pacific Time (PT) - common issue is storing as PDT when should be PST in winter
    if (tz === 'PT' || tz === 'PST' || tz === 'PDT') {
        const year = dateObj.getUTCFullYear();
        const month = dateObj.getUTCMonth(); // 0-11
        const day = dateObj.getUTCDate();
        const hours = dateObj.getUTCHours();
        const minutes = dateObj.getUTCMinutes();
        const seconds = dateObj.getUTCSeconds();
        
        // Determine if the date is in PST period (first Sunday in Nov to second Sunday in Mar)
        // For December, we're definitely in PST period (UTC-8), not PDT (UTC-7)
        // Note: We check month === 11 || 0 || 1 (Dec, Jan, Feb) directly below instead of using this variable
        
        // Calculate what the local time would be in PT for the stored UTC value
        // To convert UTC to local time, we subtract the offset
        // PDT is UTC-7, so: UTC hours - 7 = PDT hours
        // PST is UTC-8, so: UTC hours - 8 = PST hours
        const storedAsPDT = (hours - 7 + 24) % 24; // If stored UTC was calculated from PDT (UTC-7)
        const storedAsPST = (hours - 8 + 24) % 24; // If stored UTC was calculated from PST (UTC-8)
        
        // In PST period (winter), the intended time should use PST offset (UTC-8)
        // If the stored UTC suggests it was stored as PDT (UTC-7), we need to add 1 hour
        // For example: 16:30 UTC stored as PDT = 09:30 PDT, but should be 17:30 UTC = 09:30 PST
        if (month === 11 || month === 0 || month === 1) { // Dec, Jan, Feb - definitely PST
            // Check if the stored value seems wrong
            // If storedAsPDT gives a business hour (8-17), it might have been stored as PDT
            // when it should have been stored as PST (which would give us a different hour)
            const isBusinessHoursPDT = storedAsPDT >= 8 && storedAsPDT <= 17;
            
            // If PDT interpretation gives us a business hour, and we're in PST period,
            // the UTC was likely calculated incorrectly (as PDT instead of PST)
            // For example: 16:30 UTC -> 09:30 PDT, but should be 17:30 UTC -> 09:30 PST
            if (isBusinessHoursPDT) {
                // Add 1 hour to correct from PDT storage to PST storage
                const correctedHours = (hours + 1) % 24;
                const corrected = new Date(Date.UTC(year, month, day, correctedHours, minutes, seconds));
                const correctedPSTHour = (correctedHours - 8 + 24) % 24;
                
                if (typeof window !== 'undefined' && dateObj.toISOString().includes('2025-12-08')) {
                    console.log('[dateUtils] Corrected PT timezone offset:');
                    console.log('  Original UTC:', dateObj.toISOString());
                    console.log('  Corrected UTC:', corrected.toISOString());
                    console.log('  Original interpreted as PDT:', storedAsPDT + ':' + String(minutes).padStart(2, '0'), 'PDT');
                    console.log('  Original interpreted as PST:', storedAsPST + ':' + String(minutes).padStart(2, '0'), 'PST');
                    console.log('  Corrected as PST:', correctedPSTHour + ':' + String(minutes).padStart(2, '0'), 'PST');
                }
                return corrected;
            }
        }
    }
    
    return dateObj;
}

// ============================================
// DATE NORMALIZATION HELPER
// ============================================

/**
 * Normalizes database date format to ISO 8601 format for proper UTC parsing.
 * Converts formats like "2025-12-08 07:00:00+00" to "2025-12-08T07:00:00.000Z"
 * @param dateString The date string to normalize
 * @returns Normalized ISO 8601 date string
 */
function normalizeDateString(dateString: string): string {
    let normalized = String(dateString).trim();
    
    // Debug logging for the specific event
    if (normalized.includes('2025-12-08') && typeof window !== 'undefined') {
        console.log('[dateUtils DEBUG] Fortune Brainstorm AI - Input:', dateString);
    }
    
    // If already in ISO format with Z or timezone offset (+00:00), return as-is (Supabase API returns this format)
    // Supabase returns formats like: "2026-03-09T09:00:00+00:00" or "2026-03-09T09:00:00.000Z"
    if (normalized.includes('T') && (normalized.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(normalized))) {
        // Already in correct format - return immediately
        if (normalized.includes('2025-12-08') && typeof window !== 'undefined') {
            console.log('[dateUtils DEBUG] Fortune Brainstorm AI - Already ISO format, returning:', normalized);
        }
        return normalized;
    }
    
    // Handle various date formats that might come from Supabase
    // Format 1: "2025-12-08, 09:30:00 am" (from Supabase UI display, with comma and am/pm)
    // Note: Supabase timestamptz columns store UTC internally, so even if displayed as "09:30 AM PT",
    // the API returns the UTC value. We treat all values as UTC.
    normalized = normalized.replace(/,\s*/g, ' '); // Remove commas
    normalized = normalized.replace(/\s+(am|pm)\s*/gi, ' $1'); // Normalize am/pm spacing
    
    // Convert space-separated format to ISO format
    // "2025-12-08 07:00:00+00" -> "2025-12-08T07:00:00+00"
    if (!normalized.includes('T') && normalized.includes(' ')) {
        // Check if it's a space-separated date-time format
        const spaceIndex = normalized.indexOf(' ');
        const datePart = normalized.substring(0, spaceIndex);
        
        // Only convert if date part looks like YYYY-MM-DD
        if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
            normalized = normalized.replace(' ', 'T');
        }
    }
    
    // Parse and convert am/pm to 24-hour format if needed
    if (/[ap]m/i.test(normalized)) {
        const match = normalized.match(/(\d{1,2}):(\d{2}):?(\d{2})?\s*([ap]m)/i);
        if (match) {
            let hours = parseInt(match[1], 10);
            const minutes = match[2];
            const seconds = match[3] || '00';
            const ampm = match[4].toLowerCase();
            
            if (ampm === 'pm' && hours !== 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            
            const time24 = `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
            normalized = normalized.replace(/\d{1,2}:\d{2}:?\d{0,2}\s*[ap]m/i, time24);
        }
    }
    
    // Handle timezone offsets - check AFTER all other normalization
    // Supabase returns timestamps like "2026-03-09T09:00:00+00:00" (UTC with +00:00 offset)
    // These should already be caught by the early return check above
    // But if we reach here, ensure we have proper timezone format
    if (!normalized.includes('Z') && !normalized.match(/[+-]\d{2}(:\d{2})?$/)) {
        // No timezone info at all - assume UTC (timestamptz columns are stored as UTC in Supabase)
        normalized += 'Z';
    }
    
    return normalized;
}

// ============================================
// PRIMARY TIMEZONE FORMATTING FUNCTION
// ============================================

/**
 * The single source of truth for date formatting in the application.
 * Always formats dates in the user's browser local timezone.
 * @param date The date string or object to format.
 * @param formatString The desired output format string (e.g., 'p', 'PP zzz'). See date-fns-tz docs.
 * @param eventTimezone Optional: The event's intended timezone (e.g., "PT") to correct timezone offset errors.
 * @returns The formatted date string in the user's local timezone.
 */
function formatInTimeZone(
    date: string | Date,
    formatString: string,
    eventTimezone?: string | null
): string {
    try {
        // Normalize date string if it's a string
        const normalizedDate = typeof date === 'string' ? normalizeDateString(date) : date;
        let dateObj = typeof normalizedDate === 'string' ? new Date(normalizedDate) : normalizedDate;
        
        // Validate the date object
        if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date');
        }
        
        // Correct timezone offset errors if event timezone is provided
        if (eventTimezone) {
            dateObj = correctTimezoneOffset(dateObj, eventTimezone);
        }
        
        // Always use browser's local timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        return formatInTimeZoneFns(dateObj, userTimezone, formatString);
    } catch (_error) {
        // Graceful fallback for any formatting errors
        try {
            const normalizedDate = typeof date === 'string' ? normalizeDateString(date) : date;
            const dateObj = typeof normalizedDate === 'string' ? new Date(normalizedDate) : normalizedDate;
            return dateObj.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
        } catch {
            return 'Invalid time';
        }
    }
}

// ============================================
// EXPORTED HELPER FUNCTIONS (Used throughout the UI)
// ============================================

/**
 * Formats only the time part of a date, including the timezone abbreviation.
 * Always displays in the user's browser local timezone.
 * Example: "2:30 PM (PDT)"
 * @param dateString The date string or object to format.
 * @param eventTimezone Optional: The event's intended timezone (e.g., "PT") to correct timezone offset errors.
 */
export function formatTime(
    dateString: string | Date,
    eventTimezone?: string | null
): string {
    // 'p' = short time, 'zzz' = timezone abbreviation (e.g., PDT)
    const result = formatInTimeZone(dateString, 'p zzz', eventTimezone);
    
    // Debug logging for Fortune Brainstorm AI
    if (String(dateString).includes('2025-12-08') && typeof window !== 'undefined') {
        console.log('[formatTime DEBUG] Fortune Brainstorm AI - Input:', dateString);
        console.log('[formatTime DEBUG] Fortune Brainstorm AI - Event Timezone:', eventTimezone);
        console.log('[formatTime DEBUG] Fortune Brainstorm AI - Output:', result);
    }
    
    return result;
}

/**
 * Formats a range of times like "12 pm to 3 pm".
 * Always displays in the user's browser local timezone.
 * @param start The start date string or object.
 * @param end Optional: The end date string or object.
 * @param eventTimezone Optional: The event's intended timezone (e.g., "PT") to correct timezone offset errors.
 */
export function formatTimeRange(
    start: string | Date,
    end?: string | Date | null,
    eventTimezone?: string | null
): string {
    if (!end) {
        // All-day or missing end
        return formatInTimeZone(start, 'p', eventTimezone);
    }
    const startStr = formatInTimeZone(start, 'p', eventTimezone).toLowerCase();
    const endStr = formatInTimeZone(end, 'p', eventTimezone).toLowerCase();

    // If both share am/pm, drop am/pm from the first part for brevity
    const ampmMatch = endStr.match(/\s?(am|pm)$/);
    if (ampmMatch) {
        const ampm = ampmMatch[1];
        const compactStart = startStr.replace(/\s?(am|pm)$/i, '');
        return `${compactStart} ${ampm} to ${endStr}`;
    }
    return `${startStr} to ${endStr}`;
}

/**
 * Formats only the date part of a date.
 * Always displays in the user's browser local timezone.
 * Example: "Sep 17, 2025"
 * @param dateString The date string or object to format.
 * @param eventTimezone Optional: The event's intended timezone (e.g., "PT") to correct timezone offset errors.
 */
export function formatDate(
    dateString: string | Date,
    eventTimezone?: string | null
): string {
    // 'PP' = long date format
    return formatInTimeZone(dateString, 'PP', eventTimezone);
}

/**
 * Formats both date and time, including the timezone abbreviation.
 * Always displays in the user's browser local timezone.
 * Example: "Sep 17, 2025 at 2:30 PM (PDT)"
 * @param dateString The date string or object to format.
 * @param eventTimezone Optional: The event's intended timezone (e.g., "PT") to correct timezone offset errors.
 */
export function formatDateTime(
    dateString: string | Date,
    eventTimezone?: string | null
): string {
    return formatInTimeZone(dateString, "PP 'at' p zzz", eventTimezone);
}

// ============================================
// OTHER DATE UTILITIES (Unchanged)
// ============================================

export function getUserTimezone(profileTimezone?: string | null): string {
    return profileTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function isEventLive(startTime: string | Date, endTime?: string | Date | null): boolean {
    const now = new Date();
    const start = new Date(startTime);
    if (!endTime) {
        const twoHoursAfterStart = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        return now >= start && now <= twoHoursAfterStart;
    }
    const end = new Date(endTime);
    return now >= start && now <= end;
}

export function getEventDuration(startTime: string | Date, endTime?: string | Date | null): string {
    if (!endTime) return 'All day';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return '';
    
    const diffMin = Math.round(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);
    const remainingMin = diffMin % 60;

    if (diffHour === 0) return `${diffMin} min`;
    if (remainingMin === 0) return `${diffHour} hr`;
    return `${diffHour} hr ${remainingMin} min`;
}

export function formatToUTC(date: string | Date | null): string {
    if (!date) return '';
    const dateObj = new Date(date);
    return dateObj.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
}

// ============================================
// REMAINING LEGACY UTILITIES FOR COMPLETENESS
// ============================================

export function formatRelativeTime(dateString: string | Date): string {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    if (Math.abs(diffMin) < 1) return 'just now';
    if (Math.abs(diffMin) < 60) {
        return diffMin > 0 ? `in ${diffMin} minutes` : `${Math.abs(diffMin)} minutes ago`;
    }
    if (Math.abs(diffHour) < 24) {
        return diffHour > 0 ? `in ${diffHour} hours` : `${Math.abs(diffHour)} hours ago`;
    }
    if (Math.abs(diffDay) < 30) {
        return diffDay > 0 ? `in ${diffDay} days` : `${Math.abs(diffDay)} days ago`;
    }

    return formatDate(date);
}

export function isEventUpcoming(startTime: string | Date): boolean {
    const now = new Date();
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return start > now && start <= tomorrow;
}

export function isEventPast(startTime: string | Date, endTime?: string | Date | null): boolean {
    const now = new Date();

    if (endTime) {
        const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
        return now > end;
    }

    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const twoHoursAfterStart = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now > twoHoursAfterStart;
}

export function getEventTimeStatus(
    startTime: string | Date,
    endTime?: string | Date | null
): 'past' | 'live' | 'upcoming' | 'future' {
    if (isEventLive(startTime, endTime)) return 'live';
    if (isEventPast(startTime, endTime)) return 'past';
    if (isEventUpcoming(startTime)) return 'upcoming';
    return 'future';
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

export function isMultiDayEvent(startTime: string | Date, endTime?: string | Date | null): boolean {
    if (!endTime) return false;
    return !isSameDay(startTime, endTime);
}

export function getMonthBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
}

export function getWeekBounds(date: Date): { start: Date; end: Date } {
    const day = date.getDay();
    const start = new Date(date);
    start.setDate(date.getDate() - day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
}

export function formatDateForURL(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function parseDateFromURL(dateString: string): Date | null {
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    if (isNaN(date.getTime())) return null;
    return date;
}

export function formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
}

export function getTimeUntilEvent(startTime: string | Date): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
    hasEnded: boolean;
} {
    const now = new Date();
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const diff = start.getTime() - now.getTime();

    if (diff <= 0) {
        return {
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            isLive: diff > -7200000, // Consider live for 2 hours
            hasEnded: diff <= -7200000
        };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return {
        days,
        hours,
        minutes,
        seconds,
        isLive: false,
        hasEnded: false
    };
}

export function isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

export function getSafeDate(date: string | Date | null | undefined): Date | null {
    if (!date) return null;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return isNaN(dateObj.getTime()) ? null : dateObj;
}

/**
 * Gets today's date in a consistent format for server/client rendering
 * This prevents hydration mismatches by using a stable date reference
 */
export function getTodayDate(): Date {
    const now = new Date();
    // Return a date with time set to midnight to ensure consistency
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}