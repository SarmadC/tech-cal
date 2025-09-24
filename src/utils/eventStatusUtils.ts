// src/utils/eventStatusUtils.ts

import { Event, isTrackedEvent } from '@/types';
import { isEventPast } from './dateUtils';

/**
 * Get the tracking and completion status of an event
 * Consolidates the logic for determining if an event is tracked and completed
 */
export function getEventStatus(event: Event) {
    const isTracked = isTrackedEvent(event) && event.isTracked;
    const isCompleted = isTracked && isEventPast(event.startTime, event.endTime);
    
    return {
        isTracked,
        isCompleted
    };
}

/**
 * Check if an event should show tracking indicators (star and checkmark)
 */
export function shouldShowTrackingIndicators(event: Event) {
    const { isTracked, isCompleted } = getEventStatus(event);
    return {
        showStar: isTracked,
        showCheckmark: isCompleted
    };
}
