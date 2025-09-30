// src/components/calendar/TechCalendarWeekView.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
    events: (Event | MultiDayEvent)[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: MultiDayEventInstance | Event) => void;
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
        if (!events || events.length === 0) return [];
        
        const processedEvents: (Event | MultiDayEventInstance)[] = [];
        const weekStart = new Date(weekDays[0]);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekDays[6]);
        weekEnd.setHours(23, 59, 59, 999);
        
        // Process each event in the current week
        for (const event of events) {
            const startDate = new Date(event.startTime);
            const endDate = event.endTime ? new Date(event.endTime) : startDate;
            
            // Check if this is a multi-day event (either explicitly marked or spans multiple days)
            const eventStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const eventEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            const daysDiff = Math.ceil((eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            const isMultiDay = ('isMultiDay' in event && event.isMultiDay) || daysDiff > 1;
            
            if (isMultiDay) {
                // Find the overlap between the event and the current week
                const overlapStart = new Date(Math.max(eventStartDate.getTime(), weekStart.getTime()));
                const overlapEnd = new Date(Math.min(eventEndDate.getTime(), weekEnd.getTime()));
                
                if (overlapStart <= overlapEnd) {
                    // Generate instances for each day in the overlap
                    const currentDay = new Date(overlapStart);
                    let dayNumber = 1;
                    
                    while (currentDay <= overlapEnd) {
                        const year = currentDay.getFullYear();
                        const month = String(currentDay.getMonth() + 1).padStart(2, '0');
                        const day = String(currentDay.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        
                        // Create day info
                        const dayInfo = {
                            currentDay: dayNumber,
                            totalDays: daysDiff,
                            isFirstDay: dayNumber === 1,
                            isLastDay: dayNumber === daysDiff,
                            continuationType: (dayNumber === 1 ? 'start' : dayNumber === daysDiff ? 'end' : 'middle') as 'start' | 'middle' | 'end'
                        };
                        
                        // Create the instance
                        const instance: MultiDayEventInstance = {
                            ...event,
                            id: `${event.id}-${dateStr}`,
                            startTime: `${dateStr}T00:00:00`,
                            endTime: `${dateStr}T23:59:59`,
                            isInstance: true,
                            originalEventId: event.id,
                            instanceDate: dateStr,
                            dayInfo,
                            isMultiDay: true
                        };
                        
                        processedEvents.push(instance);
                        
                        // Move to next day
                        currentDay.setDate(currentDay.getDate() + 1);
                        dayNumber++;
                    }
                }
            } else {
                // Single-day event - add as is if it's in the current week
                const eventDate = new Date(event.startTime);
                if (eventDate >= weekStart && eventDate <= weekEnd) {
                    processedEvents.push(event);
                }
            }
        }
        
        return processedEvents;
    }, [events, weekDays]);

    // Group processed events by day for the grid
    const eventsByDay = useMemo(() => {
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
                        // Multi-day instance matched for this day
                    }
                    return matches;
                }

                // For regular events, check if they occur on this day
                const eventStart = new Date((event as Event | MultiDayEventInstance).startTime);
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

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (hideTimer) {
                clearTimeout(hideTimer);
            }
        };
    }, [hideTimer]);

    return (
        <div className="tech-calendar-week-view flex-shrink-0 w-full">
            {/* Header with days */}
            <WeekHeader weekDays={weekDays} />

            {/* Time slots grid with events */}
            <div className="flex-1">
                <TimeSlotGrid
                    timeSlots={timeSlots}
                    weekDays={weekDays}
                    eventsByDay={eventsByDay}
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