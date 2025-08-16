// Update src/utils/multiDayEventUtils.ts

import type { EnhancedAppEvent, AppEvent } from '@/types';

export interface MultiDayEventInstance extends AppEvent {
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

export function generateDailyEventInstances(
    event: EnhancedAppEvent,
    viewDate: Date
): MultiDayEventInstance[] {

    // If not multi-day, return original event
    if (!event.isMultiDay || !event.dailySchedule) {
        return [{
            ...event,
            isInstance: false,
            originalEventId: event.id,
            instanceDate: '',
            dayInfo: {
                currentDay: 1,
                totalDays: 1,
                isFirstDay: true,
                isLastDay: true,
                continuationType: 'single'
            }
        }];
    }

    const startDate = new Date(event.startTime);
    const endDate = event.endTime ? new Date(event.endTime) : new Date(startDate);

    // Calculate total days and current day
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const viewDateStr = viewDate.toISOString().split('T')[0];
    const eventStartDateStr = startDate.toISOString().split('T')[0];
    const eventEndDateStr = endDate.toISOString().split('T')[0];

    // Check if view date falls within event date range
    if (viewDateStr < eventStartDateStr || viewDateStr > eventEndDateStr) {
        return [];
    }

    // Calculate which day this is (1-based)
    const daysDiff = Math.floor((viewDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.max(1, daysDiff + 1);

    // Determine continuation type
    const isFirstDay = viewDateStr === eventStartDateStr;
    const isLastDay = viewDateStr === eventEndDateStr;
    let continuationType: 'start' | 'middle' | 'end' | 'single' = 'middle';

    if (totalDays === 1) {
        continuationType = 'single';
    } else if (isFirstDay) {
        continuationType = 'start';
    } else if (isLastDay) {
        continuationType = 'end';
    } else {
        continuationType = 'middle';
    }

    const dayInfo = {
        currentDay,
        totalDays,
        isFirstDay,
        isLastDay,
        continuationType
    };

    const instances: MultiDayEventInstance[] = [];

    switch (event.dailySchedule.type) {
        case 'daily_recurring':
            const dailyStart = event.dailySchedule.daily_start || '09:00';
            const dailyEnd = event.dailySchedule.daily_end || '17:00';

            // Create instance for the view date
            const instanceStart = new Date(viewDate);
            const [startHour, startMin] = dailyStart.split(':').map(Number);
            instanceStart.setHours(startHour, startMin, 0, 0);

            const instanceEnd = new Date(viewDate);
            const [endHour, endMin] = dailyEnd.split(':').map(Number);
            instanceEnd.setHours(endHour, endMin, 0, 0);

            instances.push({
                ...event,
                id: `${event.id}-${viewDateStr}`,
                startTime: instanceStart.toISOString(),
                endTime: instanceEnd.toISOString(),
                isInstance: true,
                originalEventId: event.id,
                instanceDate: viewDateStr,
                dayInfo
            });
            break;

        case 'all_day':
            const allDayStart = new Date(viewDate);
            allDayStart.setHours(0, 0, 0, 0);
            const allDayEnd = new Date(viewDate);
            allDayEnd.setHours(23, 59, 59, 999);

            instances.push({
                ...event,
                id: `${event.id}-${viewDateStr}`,
                startTime: allDayStart.toISOString(),
                endTime: allDayEnd.toISOString(),
                isInstance: true,
                originalEventId: event.id,
                instanceDate: viewDateStr,
                dayInfo
            });
            break;

        case 'custom':
            const customSchedule = event.dailySchedule.schedule?.find(
                schedule => schedule.date === viewDateStr
            );

            if (customSchedule) {
                const customStart = new Date(viewDate);
                const [customStartHour, customStartMin] = customSchedule.start.split(':').map(Number);
                customStart.setHours(customStartHour, customStartMin, 0, 0);

                const customEnd = new Date(viewDate);
                const [customEndHour, customEndMin] = customSchedule.end.split(':').map(Number);
                customEnd.setHours(customEndHour, customEndMin, 0, 0);

                instances.push({
                    ...event,
                    id: `${event.id}-${viewDateStr}`,
                    startTime: customStart.toISOString(),
                    endTime: customEnd.toISOString(),
                    isInstance: true,
                    originalEventId: event.id,
                    instanceDate: viewDateStr,
                    dayInfo
                });
            }
            break;
    }

    return instances;
}

export function processEventsForDayView(
    events: EnhancedAppEvent[],
    viewDate: Date
): MultiDayEventInstance[] {
    const processedEvents: MultiDayEventInstance[] = [];

    events.forEach(event => {
        const instances = generateDailyEventInstances(event, viewDate);
        processedEvents.push(...instances);
    });

    return processedEvents;
}