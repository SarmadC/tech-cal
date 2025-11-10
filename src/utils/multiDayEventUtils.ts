// src/utils/multiDayEventUtils.ts

import type { Event, MultiDayEvent, MultiDayEventInstance } from '@/types';

export const isParentMultiDayEvent = (
    event: Event | MultiDayEventInstance
): event is MultiDayEvent =>
    'eventPattern' in event &&
    'isMultiDay' in event &&
    typeof event.isMultiDay === 'boolean';


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
            
            // Debug logging
            console.log('Multi-day event processing:', {
                eventTitle: event.title,
                viewDateStr,
                dailyStart,
                dailyEnd,
                instanceStartTimeStr,
                instanceEndTimeStr,
                parsedStart: new Date(instanceStartTimeStr),
                parsedEnd: new Date(instanceEndTimeStr)
            });

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
            
        case 'custom':
            // Handle custom schedules with different times per day
            if (event.dailySchedule.custom_schedule) {
                const customDay = event.dailySchedule.custom_schedule.find(
                    schedule => schedule.day === currentDay
                );
                
                if (customDay) {
                    // Use custom times for this specific day
                    const customStartTimeStr = `${viewDateStr}T${customDay.start.padStart(5, '0')}:00`;
                    const customEndTimeStr = `${viewDateStr}T${customDay.end.padStart(5, '0')}:00`;
                    
                    const { startTime: _startTime, endTime: _endTime, id, ...restOfEvent } = event;
                    
                    instances.push({
                        ...restOfEvent,
                        id: `${id}-day-${currentDay}-${viewDateStr}`,
                        startTime: customStartTimeStr,
                        endTime: customEndTimeStr,
                        isInstance: true,
                        originalEventId: id,
                        instanceDate: viewDateStr,
                        dayInfo: {
                            ...dayInfo
                        }
                    });
                }
            }
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

/**
 * Processes events for week view, splitting multi-day events with custom schedules
 * into individual day cards when they have different time slots.
 * @param events An array of events to process
 * @returns Processed events with custom schedules split into individual day cards
 */
export function processEventsForWeekView(
    events: (MultiDayEvent | Event)[]
): (MultiDayEventInstance | Event)[] {
    const processedEvents: (MultiDayEventInstance | Event)[] = [];
    
    events.forEach(event => {
        if ('isMultiDay' in event && event.isMultiDay && event.dailySchedule) {
            // Handle both custom_schedule and daily_recurring multi-day events
            // Prioritize custom_schedule if it exists, even if type is daily_recurring
            if ('custom_schedule' in event.dailySchedule && event.dailySchedule.custom_schedule && event.dailySchedule.custom_schedule.length > 0) {
            // This is a multi-day event with custom schedule - split into individual day cards
            
            const startDate = new Date(event.startTime);
            const customSchedule = event.dailySchedule.custom_schedule!;
            
            customSchedule.forEach((daySchedule) => {
                // Calculate the actual date for this day
                const dayDate = new Date(startDate);
                dayDate.setDate(startDate.getDate() + (daySchedule.day - 1)); // Adjust for 1-based day numbering
                
                const year = dayDate.getFullYear();
                const month = String(dayDate.getMonth() + 1).padStart(2, '0');
                const day = String(dayDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;
                
                // Create proper ISO datetime strings with timezone
                // Ensure proper HH:MM format by padding single digits
                const startHour = daySchedule.start.padStart(5, '0'); // Convert "9:00" to "09:00"
                const endHour = daySchedule.end.padStart(5, '0'); // Convert "16:00" to "16:00" (no change)
                const dayStartTime = `${dateStr}T${startHour}:00`;
                const dayEndTime = `${dateStr}T${endHour}:00`;
                
                const dayInstance: MultiDayEventInstance = {
                    ...event,
                    id: `${event.id}-day-${daySchedule.day}`,
                    startTime: dayStartTime,
                    endTime: dayEndTime,
                    isInstance: true,
                    originalEventId: event.id,
                    instanceDate: dateStr,
                    dayInfo: {
                        currentDay: daySchedule.day,
                        totalDays: customSchedule.length,
                        isFirstDay: daySchedule.day === 1,
                        isLastDay: daySchedule.day === customSchedule.length,
                        continuationType: daySchedule.day === 1 ? 'start' : 
                                        daySchedule.day === customSchedule.length ? 'end' : 'middle'
                    },
                    // Add custom schedule info for display
                    multiDayStart: dayDate,
                    multiDayEnd: dayDate,
                    multiDaySpan: 1,
                    // Preserve agenda data
                    agenda: 'agenda' in event ? event.agenda : undefined
                };
                
                
                processedEvents.push(dayInstance);
            });
        } else if (event.dailySchedule.type === 'daily_recurring') {
                // This is a multi-day event with daily recurring schedule - split into individual day cards
                
                const startDate = new Date(event.startTime);
                const endDate = event.endTime ? new Date(event.endTime) : startDate;
                
                // Calculate how many days this event spans
                const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const totalDays = daysDiff + 1; // Include both start and end days
                
                // Create individual day instances
                for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
                    const dayDate = new Date(startDate);
                    dayDate.setDate(startDate.getDate() + dayOffset);
                    
                    const year = dayDate.getFullYear();
                    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
                    const day = String(dayDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    
                    // Use the daily recurring schedule times
                    const dailyStart = (event.dailySchedule.dailyStart || '09:00').padStart(5, '0');
                    const dailyEnd = (event.dailySchedule.dailyEnd || '17:00').padStart(5, '0');
                    const dayStartTime = `${dateStr}T${dailyStart}:00`;
                    const dayEndTime = `${dateStr}T${dailyEnd}:00`;
                    
                    const dayInstance: MultiDayEventInstance = {
                        ...event,
                        id: `${event.id}-day-${dayOffset + 1}`,
                        startTime: dayStartTime,
                        endTime: dayEndTime,
                        isInstance: true,
                        originalEventId: event.id,
                        instanceDate: dateStr,
                        dayInfo: {
                            currentDay: dayOffset + 1,
                            totalDays: totalDays,
                            isFirstDay: dayOffset === 0,
                            isLastDay: dayOffset === totalDays - 1,
                            continuationType: dayOffset === 0 ? 'start' : 
                                            dayOffset === totalDays - 1 ? 'end' : 'middle'
                        },
                        // Add multi-day info for display  
                        multiDayStart: dayDate,
                        multiDayEnd: dayDate,
                        multiDaySpan: 1,
                        // Preserve agenda data
                        agenda: 'agenda' in event ? event.agenda : undefined
                    };
                    
                    
                    processedEvents.push(dayInstance);
                }
            } else {
                // Multi-day event with unknown schedule type, treat as regular event
                processedEvents.push(event as Event);
            }
        } else {
            // Regular single-day event
            processedEvents.push(event as Event);
        }
    });
    
    
    return processedEvents;
}