// src/utils/eventUtils.ts
import { Event } from '@/types';

/**
 * Get category-based background color for events
 * Centralized function to avoid duplication across components
 */
export const getCategoryColor = (event: Event): string => {
    // First priority: Use the event type color from the database
    if (event.category?.color) {
        return event.category.color;
    }
    
    // Second priority: Use the direct color property (for backwards compatibility)
    if (event.color) {
        return event.color;
    }
    
    // Fallback to category name matching if no color is set
    const categoryName = event.category?.name?.toLowerCase();
    switch (categoryName) {
        case 'tech summit':
        case 'summit':
            return '#bfdbfe'; // soft blue
        case 'workshop':
            return '#e9d7ff'; // soft lavender
        case 'networking':
            return '#b8ffcc'; // soft mint
        case 'conference':
            return '#a7f3d0'; // soft teal
        case 'webinar':
            return '#fed8ae'; // soft peach
        case 'startup':
            return '#fecaca'; // soft coral
        case 'trade show':
            return '#f3f4f6'; // soft cream
        case 'product launch':
            return '#fecaca'; // soft coral
        case 'training':
            return '#b8ffcc'; // soft mint
        default:
            return '#f1f5f9'; // light gray fallback
    }
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
