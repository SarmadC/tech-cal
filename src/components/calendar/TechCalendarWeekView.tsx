// src/components/calendar/TechCalendarWeekView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import { WeekHeader } from './shared/WeekHeader';
import { TimeSlotGrid } from './shared/TimeSlotGrid';
import '@/app/styles/tech-week-view.css';
import {
    getWeekDays,
    generateWeekTimeSlots
} from '@/utils/eventViewUtils';
import { generateDailyEventInstances } from '@/utils/multiDayEventUtils';

export interface TechCalendarWeekViewProps {
    events: Event[] | MultiDayEvent[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event) => void;
}

export default function TechCalendarWeekView({
    events,
    initialDate,
    categories: _categories,
    profile: _profile,
    onEventSelect,
}: TechCalendarWeekViewProps) {
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const [hideTimer, setHideTimer] = useState<NodeJS.Timeout | null>(null);

    // Get week days
    const weekDays = useMemo(() => {
        return getWeekDays(initialDate);
    }, [initialDate]);

    // Define consistent start and end hours
    const START_HOUR = 6;
    const END_HOUR = 23;

    // Generate time slots
    const timeSlots = useMemo(() => {
        return generateWeekTimeSlots(START_HOUR, END_HOUR);
    }, []);

    // Process events and generate proper instances for multi-day events
    const processedEvents = useMemo(() => {
        console.log('[TechCalendarWeekView] Processing events for week:', {
            totalEvents: events.length,
            weekStart: weekDays[0],
            weekEnd: weekDays[6]
        });

        const allProcessedEvents: (Event | MultiDayEventInstance)[] = [];
        const multiDayEventIds = new Set<string>();

        // First, identify and process multi-day events
        (events as MultiDayEvent[]).forEach(event => {
            if (event.isMultiDay && event.dailySchedule) {
                console.log('[TechCalendarWeekView] Found multi-day event:', {
                    id: event.id,
                    title: event.title,
                    startTime: event.startTime,
                    endTime: event.endTime,
                    dailySchedule: event.dailySchedule
                });

                multiDayEventIds.add(event.id);

                // Generate instances for each day in the week that this event spans
                weekDays.forEach((day, dayIndex) => {
                    const instances = generateDailyEventInstances(event, day);
                    if (instances.length > 0) {
                        console.log(`[TechCalendarWeekView] Generated ${instances.length} instance(s) for day ${dayIndex}:`, {
                            day: day.toDateString(),
                            instances: instances.map(i => ({
                                id: i.id,
                                startTime: i.startTime,
                                endTime: i.endTime,
                                dayInfo: i.dayInfo
                            }))
                        });
                        allProcessedEvents.push(...instances);
                    }
                });
            }
        });

        // Then add single-day events that aren't multi-day
        const weekStart = new Date(weekDays[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekDays[6]);
        weekEnd.setHours(23, 59, 59, 999);

        (events as Event[]).forEach(event => {
            // Skip if this is a multi-day event (already processed)
            if (multiDayEventIds.has(event.id)) {
                return;
            }

            // Check if single-day event falls within this week
            const eventStart = new Date(event.startTime);
            if (eventStart >= weekStart && eventStart <= weekEnd) {
                allProcessedEvents.push(event);
            }
        });

        console.log('[TechCalendarWeekView] Total processed events:', {
            total: allProcessedEvents.length,
            multiDayInstances: allProcessedEvents.filter(e => 'isInstance' in e && e.isInstance).length,
            singleDayEvents: allProcessedEvents.filter(e => !('isInstance' in e && e.isInstance)).length
        });

        return allProcessedEvents;
    }, [events, weekDays]);

    // Group processed events by day for the grid
    const eventsByDay = useMemo(() => {
        const grouped = new Map<number, (Event | MultiDayEventInstance)[]>();

        weekDays.forEach((day, dayIndex) => {
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            // Filter events that occur on this specific day
            const dayEvents = processedEvents.filter(event => {
                // For multi-day instances, match by instanceDate
                if ('isInstance' in event && event.isInstance) {
                    const instance = event as MultiDayEventInstance;
                    // Parse the instanceDate and compare
                    const instanceDate = new Date(instance.instanceDate + 'T00:00:00');
                    return instanceDate.toDateString() === day.toDateString();
                }

                // For regular events, check if they occur on this day
                const eventStart = new Date(event.startTime);
                return eventStart.toDateString() === day.toDateString();
            });

            if (dayEvents.length > 0) {
                console.log(`[TechCalendarWeekView] Day ${dayIndex} (${day.toDateString()}) has ${dayEvents.length} events`);
            }

            grouped.set(dayIndex, dayEvents);
        });

        return grouped;
    }, [processedEvents, weekDays]);

    // Event handlers
    const handleEventClick = (event: Event | MultiDayEventInstance) => {
        setIsPreviewVisible(false);
        onEventSelect?.(event);
    };

    const handleEventHover = (event: Event | MultiDayEventInstance, mouseEvent: React.MouseEvent) => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            setHideTimer(null);
        }

        const rect = mouseEvent.currentTarget.getBoundingClientRect();
        setPreviewEvent(event);
        setPreviewPosition({ x: rect.right + 10, y: rect.top });
        setIsPreviewVisible(true);
    };

    const handleEventLeave = () => {
        const timer = setTimeout(() => {
            setIsPreviewVisible(false);
            setPreviewEvent(null);
        }, 300);
        setHideTimer(timer);
    };

    const handlePreviewHover = () => {
        if (hideTimer) {
            clearTimeout(hideTimer);
            setHideTimer(null);
        }
    };

    const handlePreviewLeave = () => {
        setIsPreviewVisible(false);
        setPreviewEvent(null);
    };

    return (
        <div className="tech-calendar-week-view week-view">
            {/* Header with days */}
            <WeekHeader weekDays={weekDays} />

            {/* Time slots grid with events */}
            <div className="flex-1 overflow-auto">
                <TimeSlotGrid
                    timeSlots={timeSlots}
                    weekDays={weekDays}
                    eventsByDay={eventsByDay as Map<number, Event[]>}
                    startHour={START_HOUR}
                    endHour={END_HOUR}
                    onEventClick={handleEventClick}
                    onEventHover={handleEventHover}
                    onEventLeave={handleEventLeave}
                />
            </div>

            {/* Event Preview Card */}
            {previewEvent && (
                <EventPreviewCard
                    event={previewEvent}
                    isVisible={isPreviewVisible}
                    position={previewPosition}
                    onClose={handlePreviewLeave}
                    onHover={handlePreviewHover}
                    onLeave={handlePreviewLeave}
                />
            )}
        </div>
    );
}