// src/utils/multiDayEventUtils.ts

import type { MultiDayEvent, MultiDayEventInstance } from '@/types';


/**
 * Generates specific daily instances for a given multi-day event on a specific view date.
 * This is the core logic that powers the day and week views.
 * @param event The multi-day event object from the database.
 * @param viewDate The specific day the user is looking at in the calendar.
 * @returns An array of event instances for that day (usually just one, but allows for flexibility).
 */
// CRITICAL UPDATE for src/utils/multiDayEventUtils.ts
// Make sure your generateDailyEventInstances function has this fix:

export function generateDailyEventInstances(
    event: MultiDayEvent,
    viewDate: Date
): MultiDayEventInstance[] {
    // Single-day events
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

    // Use local dates for comparison (consistent with viewDate)
    const viewDateOnly = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

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
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const day = String(viewDate.getDate()).padStart(2, '0');
    const viewDateStr = `${year}-${month}-${day}`;

    switch (event.dailySchedule.type) {
        case 'daily_recurring':
            const dailyStart = event.dailySchedule.dailyStart || '09:00';
            const dailyEnd = event.dailySchedule.dailyEnd || '17:00';

            // Format times with local timezone
            const instanceStartTimeStr = `${viewDateStr}T${dailyStart}:00`;
            const instanceEndTimeStr = `${viewDateStr}T${dailyEnd}:00`;

            // Create instance with day information
            const { startTime: _startTime, endTime: _endTime, id, ...restOfEvent } = event;

            instances.push({
                ...restOfEvent,
                id: `${id}-${viewDateStr}`,
                startTime: instanceStartTimeStr,
                endTime: instanceEndTimeStr,
                isInstance: true,
                originalEventId: id,
                instanceDate: viewDateStr,
                dayInfo
            });
            break;
    }

    return instances;
}

// Add this function to your src/utils/multiDayEventUtils.ts file

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
    // Use flatMap to process all events and flatten the resulting instances into a single array
    return events.flatMap(event => generateDailyEventInstances(event, viewDate));
}