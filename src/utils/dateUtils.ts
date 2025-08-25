// src/utils/dateUtils.ts

import { formatInTimeZone as formatInTimeZoneFns } from 'date-fns-tz';

/**
 * Core date formatting utilities for Kure-Cal
 * Handles timezone conversions and consistent date/time formatting
 */

// ============================================
// PRIMARY TIMEZONE FORMATTING FUNCTION
// ============================================

/**
 * The single source of truth for timezone-aware date formatting in the application.
 * Formats a date into a specified format, correctly handling the event's own timezone.
 * Defaults to the user's browser timezone if the event's timezone is not provided.
 * @param date The date string or object to format.
 * @param formatString The desired output format string (e.g., 'p', 'PP zzz'). See date-fns-tz docs.
 * @param eventTimezone The IANA timezone of the event (e.g., 'America/New_York').
 * @returns The formatted date string.
 */
function formatInTimeZone(
    date: string | Date,
    formatString: string,
    eventTimezone?: string | null
): string {
    try {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        // Default to the user's browser timezone if the event's is missing. This is a safe fallback.
        const timeZone = eventTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        return formatInTimeZoneFns(dateObj, timeZone, formatString);
    } catch (error) {
        console.error("Error in formatInTimeZone:", { date, eventTimezone }, error);
        // Provide a graceful fallback if formatting fails.
        return new Date(date).toLocaleTimeString();
    }
}

// ============================================
// EXPORTED HELPER FUNCTIONS (Used throughout the UI)
// ============================================

/**
 * Formats only the time part of a date, including the timezone abbreviation.
 * Example: "2:30 PM (PDT)"
 */
export function formatTime(
    dateString: string | Date,
    eventTimezone?: string | null
): string {
    // 'p' = short time, 'zzz' = timezone abbreviation (e.g., PDT)
    const result = formatInTimeZone(dateString, 'p zzz', eventTimezone);
    
    
    return result;
}

/**
 * Formats only the date part of a date.
 * Example: "Sep 17, 2025"
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
 * Example: "Sep 17, 2025 at 2:30 PM (PDT)"
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