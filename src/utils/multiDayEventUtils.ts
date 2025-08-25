// src/utils/multiDayEventUtils.ts

import type { MultiDayEvent, Event } from '@/types';

export interface MultiDayEventInstance extends Event {
    isInstance: boolean;
    originalEventId: string;
    instanceDate: string;
    dayInfo?: {
        currentDay: number;
        totalDays: number;
        isFirstDay: boolean;
        isLastDay: boolean;
        continuationType: 'start' | 'middle' | 'end' | 'single';
    };
}

/**
 * Generates specific daily instances for a given multi-day event on a specific view date.
 * This is the core logic that powers the day and week views.
 * @param event The multi-day event object from the database.
 * @param viewDate The specific day the user is looking at in the calendar.
 * @returns An array of event instances for that day (usually just one, but allows for flexibility).
 */
export function generateDailyEventInstances(
    event: MultiDayEvent,
    viewDate: Date
): MultiDayEventInstance[] {
    // This top part for single-day events is correct and can stay
    if (!event.isMultiDay || !event.dailySchedule) {
        const eventDate = new Date(event.startTime);
        if (eventDate.toDateString() === viewDate.toDateString()) {
            return [{
                ...event,
                isInstance: false,
                originalEventId: event.id,
                instanceDate: event.startTime.split('T')[0],
                dayInfo: { currentDay: 1, totalDays: 1, isFirstDay: true, isLastDay: true, continuationType: 'single' }
            }];
        }
        return [];
    }

    const startDate = new Date(event.startTime);
    const endDate = event.endTime ? new Date(event.endTime) : startDate;

    const viewDateOnly = new Date(Date.UTC(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), viewDate.getUTCDate()));
    const startDateOnly = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    const endDateOnly = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

    if (viewDateOnly < startDateOnly || viewDateOnly > endDateOnly) {
        return [];
    }

    const totalDays = Math.ceil((endDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysDiff = Math.floor((viewDateOnly.getTime() - startDateOnly.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.max(1, daysDiff + 1);

    const isFirstDay = viewDateOnly.getTime() === startDateOnly.getTime();
    const isLastDay = viewDateOnly.getTime() === endDateOnly.getTime();
    let continuationType: 'start' | 'middle' | 'end' | 'single' = 'middle';
    if (totalDays <= 1) { continuationType = 'single'; }
    else if (isFirstDay) { continuationType = 'start'; }
    else if (isLastDay) { continuationType = 'end'; }

    const dayInfo = { currentDay, totalDays, isFirstDay, isLastDay, continuationType };

    const instances: MultiDayEventInstance[] = [];
    const year = viewDate.getUTCFullYear(); // Use UTC methods for consistency
    const month = String(viewDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(viewDate.getUTCDate()).padStart(2, '0');
    const viewDateStr = `${year}-${month}-${day}`;

    switch (event.dailySchedule.type) {
        case 'daily_recurring':
            const dailyStart = event.dailySchedule.dailyStart || '09:00';
            const dailyEnd = event.dailySchedule.dailyEnd || '17:00';

            const instanceStartTimeStr = `${viewDateStr}T${dailyStart}:00Z`;
            const instanceEndTimeStr = `${viewDateStr}T${dailyEnd}:00Z`;

            // --- THE CRITICAL FIX IS HERE ---
            // We destructure the original event to explicitly exclude its start and end times,
            // preventing them from polluting our new instance object.
            const { startTime: _startTime, endTime: _endTime, id, ...restOfEvent } = event;

            instances.push({
                ...restOfEvent,               // Spread the original event's OTHER properties
                id: `${id}-${viewDateStr}`,   // Create a new, unique ID for this instance
                startTime: instanceStartTimeStr, // Set the NEW daily start time
                endTime: instanceEndTimeStr,     // Set the NEW daily end time
                isInstance: true,
                originalEventId: id,          // Keep a reference to the original event ID
                instanceDate: viewDateStr,
                dayInfo
            });
            break;
    }

    return instances;
}
/**
 * Processes a list of events, generating daily instances for any multi-day events
 * that fall on the specified view date.
 * @param events An array of events, which can be single or multi-day.
 * @param viewDate The date for which to generate event instances.
 * @returns A flattened array of all event instances for the given day.
 */
export function processEventsForDayView(
    events: MultiDayEvent[],
    viewDate: Date
): MultiDayEventInstance[] {
    // Use flatMap to elegantly process all events and flatten the resulting instances into a single array.
    return events.flatMap(event => generateDailyEventInstances(event, viewDate));
}