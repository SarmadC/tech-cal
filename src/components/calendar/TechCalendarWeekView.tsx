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
        console.log('[TechCalendarWeekView] Processing events:', events.length, 'events total');

        const allProcessedEvents: (Event | MultiDayEventInstance)[] = [];
        const processedMultiDayIds = new Set<string>();

        // Debug: Check what types of events we have
        const multiDayEvents = (events as MultiDayEvent[]).filter(event => event.isMultiDay && event.dailySchedule);
        console.log('[TechCalendarWeekView] Multi-day events found:', multiDayEvents.length);

        // Process multi-day events for each day in the week
        multiDayEvents.forEach(event => {
            console.log('[TechCalendarWeekView] Processing multi-day event:', {
                id: event.id,
                title: event.title,
                startTime: event.startTime,
                endTime: event.endTime,
                dailySchedule: event.dailySchedule
            });

            processedMultiDayIds.add(event.id);

            // Generate instances for each day of the week
            weekDays.forEach(day => {
                const instances = generateDailyEventInstances(event, day);
                if (instances.length > 0) {
                    console.log(`[TechCalendarWeekView] Generated ${instances.length} instance(s) for ${day.toDateString()}:`,
                        instances.map(i => ({
                            id: i.id,
                            startTime: i.startTime,
                            endTime: i.endTime,
                            instanceDate: i.instanceDate
                        }))
                    );
                    allProcessedEvents.push(...instances);
                }
            });
        });

        // Add single-day events that aren't multi-day
        const weekStart = new Date(weekDays[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekDays[6]);
        weekEnd.setHours(23, 59, 59, 999);

        const singleDayEvents = (events as MultiDayEvent[]).filter(event => {
            // Skip if it's a multi-day event (already processed)
            if (processedMultiDayIds.has(event.id)) {
                return false;
            }

            // Include single-day events that fall within this week
            const eventStart = new Date(event.startTime);
            return eventStart >= weekStart && eventStart <= weekEnd;
        });

        console.log('[TechCalendarWeekView] Single-day events in week range:', singleDayEvents.length);
        allProcessedEvents.push(...singleDayEvents);

        console.log('[TechCalendarWeekView] Total processed events:', {
            total: allProcessedEvents.length,
            multiDayInstances: allProcessedEvents.filter(e => 'isInstance' in e && e.isInstance).length,
            singleDayEvents: allProcessedEvents.filter(e => !('isInstance' in e && e.isInstance)).length
        });

        return allProcessedEvents;
    }, [events, weekDays]);

    // Group processed events by day for the grid
    const eventsByDay = useMemo(() => {
        console.log('[TechCalendarWeekView] Grouping processed events by day:', processedEvents.length, 'events');
        const grouped = new Map<number, (Event | MultiDayEventInstance)[]>();

        weekDays.forEach((day, dayIndex) => {
            const dayEvents = processedEvents.filter(event => {
                // For multi-day instances, match by instanceDate
                if ('isInstance' in event && event.isInstance) {
                    const instance = event as MultiDayEventInstance;
                    // Parse the instanceDate correctly (it's in YYYY-MM-DD format)
                    const [year, month, dayNum] = instance.instanceDate.split('-').map(Number);
                    const instanceDate = new Date(year, month - 1, dayNum);
                    const matches = instanceDate.toDateString() === day.toDateString();

                    if (matches) {
                        console.log(`[TechCalendarWeekView] Multi-day instance matched for day ${dayIndex}:`, {
                            instanceDate: instance.instanceDate,
                            dayString: day.toDateString(),
                            title: instance.title
                        });
                    }
                    return matches;
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

        console.log('[TechCalendarWeekView] Final eventsByDay map:',
            Array.from(grouped.entries()).map(([day, events]) =>
                `Day ${day}: ${events.length} events`
            )
        );

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