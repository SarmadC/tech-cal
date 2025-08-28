// src/components/calendar/TechCalendarWeekView.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import EventPreviewCard from './EventPreviewCard';
import { WeekHeader } from './shared/WeekHeader';
import { TimeSlotGrid } from './shared/TimeSlotGrid';
import '@/app/styles/tech-week-view.css';
import '@/app/styles/event-card.css';
import {
    getWeekDays,
    generateWeekTimeSlots
} from '@/utils/eventViewUtils';

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

        // Process multi-day events as single cards spanning multiple days
        multiDayEvents.forEach(event => {
            console.log('[TechCalendarWeekView] Processing multi-day event:', {
                id: event.id,
                title: event.title,
                startTime: event.startTime,
                endTime: event.endTime,
                dailySchedule: event.dailySchedule
            });

            processedMultiDayIds.add(event.id);

            // Create a single multi-day event instance that spans the entire duration
            const startDate = new Date(event.startTime);
            const endDate = event.endTime ? new Date(event.endTime) : startDate;
            const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // Parse daily schedule to get the actual daily duration
            let dailyStartTime = event.startTime;
            let dailyEndTime = event.endTime;
            
            if (event.dailySchedule) {
                try {
                    const dailySchedule = typeof event.dailySchedule === 'string' 
                        ? JSON.parse(event.dailySchedule) 
                        : event.dailySchedule;
                    
                    if (dailySchedule.dailyStart && dailySchedule.dailyEnd) {
                        // Create daily times for the start date
                        const [startHour, startMinute] = dailySchedule.dailyStart.split(':').map(Number);
                        const [endHour, endMinute] = dailySchedule.dailyEnd.split(':').map(Number);
                        
                        const dailyStart = new Date(startDate);
                        dailyStart.setHours(startHour, startMinute, 0, 0);
                        
                        const dailyEnd = new Date(startDate);
                        dailyEnd.setHours(endHour, endMinute, 0, 0);
                        
                        dailyStartTime = dailyStart.toISOString();
                        dailyEndTime = dailyEnd.toISOString();
                        
                        console.log(`[TechCalendarWeekView] Daily schedule parsed for ${event.title}:`, {
                            dailyStart: dailySchedule.dailyStart,
                            dailyEnd: dailySchedule.dailyEnd,
                            dailyStartTime,
                            dailyEndTime
                        });
                    }
                } catch (error) {
                    console.warn(`[TechCalendarWeekView] Failed to parse daily schedule for ${event.title}:`, error);
                }
            }

            // Create a special multi-day instance that spans the full duration
            const multiDayInstance: MultiDayEventInstance = {
                ...event,
                id: `${event.id}-multi-day`,
                startTime: dailyStartTime,
                endTime: dailyEndTime,
                isInstance: true,
                originalEventId: event.id,
                instanceDate: startDate.toISOString().split('T')[0],
                dayInfo: {
                    currentDay: 1,
                    totalDays: totalDays,
                    isFirstDay: true,
                    isLastDay: true,
                    continuationType: 'single'
                },
                // Add multi-day specific properties
                isMultiDay: true,
                multiDaySpan: totalDays,
                multiDayStart: startDate,
                multiDayEnd: endDate
            };

            allProcessedEvents.push(multiDayInstance);
        });

        // Add single-day events that aren't multi-day
        const weekStart = new Date(weekDays[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekDays[6]);
        weekEnd.setHours(23, 59, 59, 999);

        events.forEach(event => {
            if (!processedMultiDayIds.has(event.id)) {
                // Check if this single event falls within the week
                const eventStart = new Date(event.startTime);
                if (eventStart >= weekStart && eventStart <= weekEnd) {
                    allProcessedEvents.push(event);
                }
            }
        });

        console.log('[TechCalendarWeekView] Final processed events:', allProcessedEvents.length);
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
        <div className="tech-calendar-week-view flex-shrink-0 w-full">
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