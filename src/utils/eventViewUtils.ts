// src/utils/eventViewUtils.ts

import { HelpCircle, Users, Globe, Monitor, MapPin } from 'lucide-react';
import { Event, MultiDayEventInstance, EventType } from '@/types';
import { formatTime } from '@/utils/dateUtils';

/**
 * Shared utilities for event processing and display across day and week views
 */

// ============================================
// ICON UTILITIES
// ============================================

export const getIconForCategory = (categoryName: string) => {
    const name = (categoryName || '').toLowerCase();
    if (name.includes('conference')) return Users;
    if (name.includes('workshop') || name.includes('training')) return Monitor;
    if (name.includes('webinar')) return Globe;
    if (name.includes('networking') || name.includes('meetup')) return MapPin;
    return HelpCircle;
};

// ============================================
// EVENT POSITIONING & SIZING
// ============================================

export interface EventVisualInfo {
    startRow: number;
    endRow: number;
    span: number;
    isContinuingFromPreviousDay: boolean;
    isContinuingToNextDay: boolean;
    dayNumber: number;
    isActuallyMultiDay: boolean;
}

/**
 * Calculate visual positioning information for events in day view grid
 */
export const getEventVisualInfo = (event: Event | MultiDayEventInstance): EventVisualInfo => {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    // Use local time (getHours/getMinutes) so grid positioning matches local time display
    const startDecimal = start.getHours() + start.getMinutes() / 60;
    let endDecimal = end.getHours() + end.getMinutes() / 60;

    // Handle events spanning midnight correctly
    if (endDecimal < startDecimal) {
        endDecimal += 24;
    }
    if (endDecimal === 0 && end.getDate() !== start.getDate()) {
        endDecimal = 24;
    }

    // Calculate grid rows with +1 offset to align with visual time positions
    const startRow = Math.round(startDecimal * 2) + 1;
    const endRow = Math.round(endDecimal * 2) + 1;
    const span = endRow - startRow;

    const isInstance = 'isInstance' in event && event.isInstance;
    const dayInfo = isInstance ? (event as MultiDayEventInstance).dayInfo : undefined;

    return {
        startRow,
        endRow,
        span,
        isContinuingFromPreviousDay: dayInfo ? !dayInfo.isFirstDay : false,
        isContinuingToNextDay: dayInfo ? !dayInfo.isLastDay : false,
        dayNumber: dayInfo?.currentDay || 1,
        isActuallyMultiDay: dayInfo ? dayInfo.totalDays > 1 : false,
    };
};

/**
 * Calculate visual positioning information for events in week view grid
 * Uses the same timezone logic as day view but adapted for week view time slots
 */
export const getWeekEventVisualInfo = (event: Event, startHour: number = 6, endHour: number = 23, currentDay: Date): EventVisualInfo => {
    const start = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

    // Use local time (getHours/getMinutes) - same as day view
    const startDecimal = start.getHours() + start.getMinutes() / 60;
    let endDecimal = end.getHours() + end.getMinutes() / 60;

    // Handle events spanning midnight correctly
    if (endDecimal < startDecimal) {
        endDecimal += 24;
    }
    if (endDecimal === 0 && end.getDate() !== start.getDate()) {
        endDecimal = 24;
    }

    // For week view, constrain to the current day and visible time range
    const dayStart = new Date(currentDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(23, 59, 59, 999);

    // Only include the portion of the event that occurs on the current day
    const effectiveStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
    const effectiveEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

    // Convert back to decimal hours for the current day
    const constrainedStartDecimal = effectiveStart.getHours() + effectiveStart.getMinutes() / 60;
    const constrainedEndDecimal = effectiveEnd.getHours() + effectiveEnd.getMinutes() / 60;

    // Constrain to visible time range (startHour to endHour)
    const visibleStartDecimal = Math.max(constrainedStartDecimal, startHour);
    const visibleEndDecimal = Math.min(constrainedEndDecimal, endHour);

    // Calculate grid positions - using same formula as day view but offset for week view start
    const startRow = Math.round((visibleStartDecimal - startHour) * 2) + 1;
    const endRow = Math.round((visibleEndDecimal - startHour) * 2) + 1;
    const span = Math.max(1, endRow - startRow); // Minimum 1 row span

    const isInstance = 'isInstance' in event && event.isInstance;
    const dayInfo = isInstance ? (event as MultiDayEventInstance).dayInfo : undefined;

    return {
        startRow,
        endRow,
        span,
        isContinuingFromPreviousDay: dayInfo ? !dayInfo.isFirstDay : false,
        isContinuingToNextDay: dayInfo ? !dayInfo.isLastDay : false,
        dayNumber: dayInfo?.currentDay || 1,
        isActuallyMultiDay: dayInfo ? dayInfo.totalDays > 1 : false,
    };
};

/**
 * Calculate event height for week view based on duration (legacy)
 */
export const getWeekEventHeight = (event: Event): number => {
    if (!event.endTime) return 60; // Default height for events without end time
    
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    
    // Scale height based on duration, with min/max bounds
    return Math.max(40, Math.min(200, durationMinutes * 1.2));
};

// ============================================
// EVENT FILTERING & GROUPING
// ============================================

/**
 * Check if event falls on specific day
 */
export const isEventOnDay = (event: Event, day: Date): boolean => {
    const eventStart = new Date(event.startTime);
    return eventStart.toDateString() === day.toDateString();
};

/**
 * Filter events for a specific day (for week view spanning)
 */
export const getEventsForWeekDay = (
    events: Event[], 
    day: Date,
    startHour: number = 6,
    endHour: number = 23
): Event[] => {
    return events.filter(event => {
        if (!event || !event.startTime) return false;
        
        const eventStart = new Date(event.startTime);
        
        // Check if event is on the same day
        if (eventStart.toDateString() !== day.toDateString()) return false;
        
        const eventHour = eventStart.getHours();
        
        // Include events that start within or extend into the visible time range
        const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);
        const eventEndHour = eventEnd.getHours();
        
        // Event is visible if it starts before end time and ends after start time
        return eventHour <= endHour && (eventEndHour >= startHour || eventEnd.getDate() !== eventStart.getDate());
    });
};

/**
 * Filter events for a specific day and time slot (legacy function for backwards compatibility)
 */
export const getEventsForDayAndTimeSlot = (
    events: Event[], 
    day: Date, 
    timeSlot: { hour: number }
): Event[] => {
    return events.filter(event => {
        if (!isEventOnDay(event, day)) return false;
        
        const eventStart = new Date(event.startTime);
        const eventHour = eventStart.getHours();
        
        return eventHour === timeSlot.hour;
    });
};

/**
 * Group events by time slots for week view
 */
export const categorizeEventsByTimeSlot = (
    events: Event[], 
    timeSlots: Array<{ hour: number }>,
    weekDays: Date[]
): Map<string, Event[]> => {
    const categorized = new Map<string, Event[]>();
    
    weekDays.forEach((day, dayIndex) => {
        timeSlots.forEach(timeSlot => {
            const key = `${timeSlot.hour}-${dayIndex}`;
            const dayEvents = getEventsForDayAndTimeSlot(events, day, timeSlot);
            categorized.set(key, dayEvents);
        });
    });
    
    return categorized;
};

// ============================================
// TIME UTILITIES
// ============================================

/**
 * Generate time slots for different views with enhanced data structure
 */
export const generateTimeSlots = (startHour: number = 0, endHour: number = 23, interval: number = 1) => {
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour += interval) {
        const time24 = `${hour.toString().padStart(2, '0')}:00`;
        const time12 = formatTime(`2000-01-01T${time24}:00`);
        slots.push({ 
            hour,
            time24,
            time12
        });
    }
    return slots;
};

/**
 * Generate enhanced time slots for week view specifically
 */
export const generateWeekTimeSlots = (startHour: number = 6, endHour: number = 23) => {
    return generateTimeSlots(startHour, endHour, 1);
};

/**
 * Generate week days starting from Monday
 */
export const getWeekDays = (startDate: Date): Date[] => {
    const weekStart = new Date(startDate);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    weekStart.setDate(weekStart.getDate() - daysToMonday);
    
    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        return day;
    });
};

/**
 * Format day header for week view
 */
export const formatDayHeader = (date: Date): { dayNumber: string; dayName: string } => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
        dayNumber: date.getDate().toString(),
        dayName: dayNames[date.getDay()]
    };
};

// ============================================
// CATEGORY UTILITIES  
// ============================================

/**
 * Create category column mapping for day view
 */
export const createCategoryColumnMap = (categories: EventType[]): Map<string, number> => {
    const map = new Map<string, number>();
    categories.forEach((cat, index) => map.set(cat.id, index + 2));
    return map;
};

/**
 * Get category by event type ID
 */
export const getCategoryById = (categories: EventType[], eventTypeId: string): EventType | undefined => {
    return categories.find(cat => cat.id === eventTypeId);
};