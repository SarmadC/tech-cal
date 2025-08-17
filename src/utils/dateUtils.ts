// src/utils/dateUtils.ts

import { formatInTimeZone } from 'date-fns-tz';

/**
 * Core date formatting utilities for Kure-Cal
 * Handles timezone conversions and consistent date/time formatting
 */

// ============================================
// TIMEZONE UTILITIES
// ============================================

/**
 * Get the user's timezone from their profile or browser
 */
export function getUserTimezone(profileTimezone?: string | null): string {
    return profileTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a date to a specific timezone
 */
export function convertToTimezone(date: string | Date, timezone: string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Date(formatInTimeZone(dateObj, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX"));
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format date for display (e.g., "Jan 15, 2025")
 */
export function formatDate(
    dateString: string | Date,
    options?: Intl.DateTimeFormatOptions
): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    };

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', options || defaultOptions);
}

/**
 * Format time for display (e.g., "2:30 PM")
 */
export function formatTime(
    dateString: string | Date,
    options?: Intl.DateTimeFormatOptions
): string {
    const defaultOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit'
    };

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleTimeString('en-US', options || defaultOptions);
}

/**
 * Format date and time together (e.g., "Jan 15, 2025 at 2:30 PM")
 */
export function formatDateTime(
    dateString: string | Date,
    options?: {
        dateOptions?: Intl.DateTimeFormatOptions;
        timeOptions?: Intl.DateTimeFormatOptions;
    }
): string {
    const date = formatDate(dateString, options?.dateOptions);
    const time = formatTime(dateString, options?.timeOptions);
    return `${date} at ${time}`;
}

/**
 * Format date for calendar headers (e.g., "January 2025")
 */
export function formatMonthYear(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric'
    });
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
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

// ============================================
// EVENT-SPECIFIC UTILITIES
// ============================================

/**
 * Check if an event is currently live
 */
export function isEventLive(startTime: string | Date, endTime?: string | Date | null): boolean {
    const now = new Date();
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;

    if (!endTime) {
        // If no end time, consider live for 2 hours after start
        const twoHoursAfterStart = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        return now >= start && now <= twoHoursAfterStart;
    }

    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
    return now >= start && now <= end;
}

/**
 * Check if an event is upcoming (within next 24 hours)
 */
export function isEventUpcoming(startTime: string | Date): boolean {
    const now = new Date();
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return start > now && start <= tomorrow;
}

/**
 * Check if an event has ended
 */
export function isEventPast(startTime: string | Date, endTime?: string | Date | null): boolean {
    const now = new Date();

    if (endTime) {
        const end = typeof endTime === 'string' ? new Date(endTime) : endTime;
        return now > end;
    }

    // If no end time, consider past if more than 2 hours after start
    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const twoHoursAfterStart = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return now > twoHoursAfterStart;
}

/**
 * Get event time status
 */
export function getEventTimeStatus(
    startTime: string | Date,
    endTime?: string | Date | null
): 'past' | 'live' | 'upcoming' | 'future' {
    if (isEventLive(startTime, endTime)) return 'live';
    if (isEventPast(startTime, endTime)) return 'past';
    if (isEventUpcoming(startTime)) return 'upcoming';
    return 'future';
}

/**
 * Calculate event duration in human-readable format
 */
export function getEventDuration(startTime: string | Date, endTime?: string | Date | null): string {
    if (!endTime) return '';

    const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
    const end = typeof endTime === 'string' ? new Date(endTime) : endTime;

    const diffMs = end.getTime() - start.getTime();
    const diffMin = Math.round(diffMs / (1000 * 60));
    const diffHour = Math.floor(diffMin / 60);
    const remainingMin = diffMin % 60;

    if (diffHour === 0) return `${diffMin} min`;
    if (remainingMin === 0) return `${diffHour} hr`;
    return `${diffHour} hr ${remainingMin} min`;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: string | Date, date2: string | Date): boolean {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;

    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

/**
 * Check if event spans multiple days
 */
export function isMultiDayEvent(startTime: string | Date, endTime?: string | Date | null): boolean {
    if (!endTime) return false;
    return !isSameDay(startTime, endTime);
}

// ============================================
// CALENDAR UTILITIES
// ============================================

/**
 * Get the start and end of a month
 */
export function getMonthBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
}

/**
 * Get the start and end of a week (Sunday to Saturday)
 */
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

/**
 * Format date for URL parameters (YYYY-MM-DD)
 */
export function formatDateForURL(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parse date from URL parameter
 */
export function parseDateFromURL(dateString: string): Date | null {
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Validate the date
    if (isNaN(date.getTime())) return null;
    return date;
}

// ============================================
// UTC CONVERSION (for iCal exports)
// ============================================

/**
 * Format date to UTC string for iCal files
 */
export function formatToUTC(date: string | Date | null): string {
    if (!date) return '';

    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const pad = (num: number) => String(num).padStart(2, '0');

    const year = dateObj.getUTCFullYear();
    const month = pad(dateObj.getUTCMonth() + 1);
    const day = pad(dateObj.getUTCDate());
    const hours = pad(dateObj.getUTCHours());
    const minutes = pad(dateObj.getUTCMinutes());
    const seconds = pad(dateObj.getUTCSeconds());

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

// ============================================
// COUNTDOWN UTILITIES
// ============================================

/**
 * Calculate time remaining until an event
 */
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
        // Event has started or passed
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

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if a date string is valid
 */
export function isValidDateString(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

/**
 * Get a safe date object (returns null if invalid)
 */
export function getSafeDate(date: string | Date | null | undefined): Date | null {
    if (!date) return null;

    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return isNaN(dateObj.getTime()) ? null : dateObj;
}