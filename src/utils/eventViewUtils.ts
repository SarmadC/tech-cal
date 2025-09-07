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
export const getEventVisualInfo = (
    event: Event | MultiDayEventInstance,
    startHour: number = 0,  // Add startHour parameter
    endHour: number = 24     // Add endHour parameter
): EventVisualInfo => {
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);

    // Get day boundaries (for clamping)
    const dayStart = new Date(eventStart);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(eventStart);
    dayEnd.setHours(endHour, 59, 59, 999);

    // Clamp to visible time range
    const clampedStart = eventStart < dayStart ? dayStart : eventStart;
    const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

    // Calculate minutes from startHour (consistent with week view)
    const startMinutes = Math.max(0, (clampedStart.getHours() - startHour) * 60 + clampedStart.getMinutes());
    const endMinutes = Math.max(0, (clampedEnd.getHours() - startHour) * 60 + clampedEnd.getMinutes());

    // Convert to grid rows (30 min = 1 row, +1 for 1-based grid)
    const startRow = Math.floor(startMinutes / 30) + 1;
    const endRow = Math.ceil(endMinutes / 30) + 1;
    const span = endRow - startRow;

    // Rest remains the same...
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
// ============================================
// src/utils/getWeekEventVisualInfo.ts
// Add this function to your eventViewUtils.ts file
// ============================================
export function getWeekEventVisualInfo(
    event: Event,
    startHour: number,
    endHour: number,
    currentDay: Date
) {
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : eventStart;

    // Get day boundaries
    const dayStart = new Date(currentDay);
    dayStart.setHours(startHour, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(endHour, 59, 59, 999);

    // Clamp event times to day boundaries
    const clampedStart = eventStart < dayStart ? dayStart : eventStart;
    const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

    // Calculate grid positions (2 slots per hour)
    const startMinutes = (clampedStart.getHours() - startHour) * 60 + clampedStart.getMinutes();
    const endMinutes = (clampedEnd.getHours() - startHour) * 60 + clampedEnd.getMinutes();

    // Convert to grid rows (each 30 min = 1 row, +1 for 1-based grid)
    const startRow = Math.floor(startMinutes / 30) + 1;
    const endRow = Math.ceil(endMinutes / 30) + 1;

    // Calculate span for visual adjustments
    const span = endRow - startRow;

    // Check if event continues from previous or to next day
    const isContinuingFromPreviousDay = eventStart < dayStart;
    const isContinuingToNextDay = eventEnd > dayEnd;

    return {
        startRow,
        endRow,
        span,
        isContinuingFromPreviousDay,
        isContinuingToNextDay
    };
}

/**
 * Calculate event height for week view based on duration
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
 * Filter events for a specific day and time slot
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

// ============================================
// OVERLAP DETECTION UTILITIES
// ============================================

/**
 * Check if two events overlap in time
 */
export const doEventsOverlap = (event1: Event | MultiDayEventInstance, event2: Event | MultiDayEventInstance): boolean => {
    const start1 = new Date(event1.startTime);
    const end1 = event1.endTime ? new Date(event1.endTime) : new Date(start1.getTime() + 60 * 60 * 1000);
    
    const start2 = new Date(event2.startTime);
    const end2 = event2.endTime ? new Date(event2.endTime) : new Date(start2.getTime() + 60 * 60 * 1000);
    
    // Events overlap if one starts before the other ends and vice versa
    return start1 < end2 && start2 < end1;
};

/**
 * Detects overlapping events for visual purposes (e.g., applying blur effects)
 * Returns a Map where each event ID is mapped to whether it overlaps with any other events
 */
export function detectOverlappingEvents(
    events: (Event | MultiDayEventInstance)[]
): Map<string, boolean> {
    const overlapMap = new Map<string, boolean>();

    // Initialize all events as non-overlapping
    events.forEach(event => {
        overlapMap.set(event.id, false);
    });

    // Check each pair of events for overlaps
    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            const event1 = events[i];
            const event2 = events[j];

            // Skip if they're in different categories
            if (event1.eventTypeId !== event2.eventTypeId) {
                continue;
            }

            const start1 = new Date(event1.startTime);
            const end1 = event1.endTime ? new Date(event1.endTime) : new Date(start1.getTime() + 60 * 60 * 1000);
            const start2 = new Date(event2.startTime);
            const end2 = event2.endTime ? new Date(event2.endTime) : new Date(start2.getTime() + 60 * 60 * 1000);

            // Check if events overlap in time
            if (start1 < end2 && start2 < end1) {
                overlapMap.set(event1.id, true);
                overlapMap.set(event2.id, true);
            }
        }
    }

    return overlapMap;
}


