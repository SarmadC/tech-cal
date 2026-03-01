// src/utils/eventUtils.ts
import { Event } from '@/types';
import { getEventAccentColor } from './calendarColorUtils';

/**
 * Get category-based background color for events
 * Centralized function to avoid duplication across components
 */
export const getCategoryColor = (event: Event): string => {
    return getEventAccentColor(event);
};

/**
 * Check if event is multi-day
 */
export const isMultiDayEvent = (event: Event): boolean => {
    if (!event.endTime) return false;
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 1;
};

/**
 * Get multi-day event duration in days
 */
export const getMultiDayDuration = (event: Event): number => {
    if (!isMultiDayEvent(event) || !event.endTime) return 0;
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};
