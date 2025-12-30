// src/components/calendar/shared/TimeSlotGrid.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Event, MultiDayEventInstance } from '@/types';
import { EventCard } from './EventCard';
import { EventOverflowPopover } from './EventOverflowPopover';
import '@/app/styles/event-overflow-popover.css';
import { calculateOverlapLayout, EventLayoutInfo } from '@/utils/eventViewUtils';

export interface TimeSlot {
    hour: number;
    time24: string;
    time12: string;
}

export interface TimeSlotGridProps {
    timeSlots: TimeSlot[];
    weekDays: Date[];
    eventsByDay: Map<number, (Event | MultiDayEventInstance)[]>;
    startHour: number;
    endHour: number;
    onEventClick: (event: Event | MultiDayEventInstance) => void;
    onEventHover: (event: Event | MultiDayEventInstance, mouseEvent: React.MouseEvent) => void;
    onEventLeave: () => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
    timeSlots,
    weekDays,
    eventsByDay,
    startHour,
    endHour,
    onEventClick,
    onEventHover,
    onEventLeave
}) => {
    const [popoverState, setPopoverState] = useState<{
        events: (Event | MultiDayEventInstance)[];
        anchorEl: HTMLElement | null;
    } | null>(null);
    // Calculate the number of half-hour slots needed
    const totalHours = endHour - startHour + 1;
    const totalSlots = totalHours * 2 + 1; // +1 for the final time label

    // Generate the grid template columns (time column + 7 day columns)
    // Make responsive for mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const minWidth = isMobile ? '600px' : '1200px';
    const timeColumnWidth = isMobile ? '60px' : '80px';

    const gridColsStyle = {
        gridTemplateColumns: `${timeColumnWidth} repeat(7, 1fr)`,
        gridTemplateRows: `repeat(${totalSlots}, 40px)`, // Increased from 30px to 40px per half-hour
        minWidth
    };

    // Helper function to calculate grid row positions for an event
    const getEventGridPosition = (event: Event | MultiDayEventInstance, currentDay: Date) => {
        // Use the event's actual times (which for multi-day instances are already the daily schedule times)
        const eventStart = new Date(event.startTime);
        const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);

        // Debug logging for grid positioning
        console.log('Grid positioning for event:', {
            eventTitle: event.title,
            startTime: event.startTime,
            endTime: event.endTime,
            parsedStart: eventStart,
            parsedEnd: eventEnd,
            startHour: eventStart.getHours(),
            endHour: eventEnd.getHours(),
            currentDay: currentDay.toDateString()
        });

        // Get day boundaries
        const dayStart = new Date(currentDay);
        dayStart.setHours(startHour, 0, 0, 0);
        const dayEnd = new Date(currentDay);
        dayEnd.setHours(endHour, 59, 59, 999);

        // Clamp event times to visible grid boundaries (6 AM to 11 PM)
        const clampedStart = eventStart < dayStart ? dayStart : eventStart;
        const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

        // If the event is completely outside the visible range, skip it
        if (clampedStart >= clampedEnd) {
            return { startRow: -1, endRow: -1, span: 0 };
        }

        // Calculate grid positions (2 slots per hour)
        const startMinutes = (clampedStart.getHours() - startHour) * 60 + clampedStart.getMinutes();
        const endMinutes = (clampedEnd.getHours() - startHour) * 60 + clampedEnd.getMinutes();

        // Convert to grid rows (each 30 min = 1 row, +1 for 1-based grid)
        const startRow = Math.max(1, Math.floor(startMinutes / 30) + 1);
        const endRow = Math.min(totalSlots, Math.ceil(endMinutes / 30) + 1);

        // Calculate span for data attributes
        const span = endRow - startRow;

        return { startRow, endRow, span };
    };

    // Type definition for event visual info
    interface EventVisualInfo {
        isContinuingFromPreviousDay?: boolean;
        isContinuingToNextDay?: boolean;
        dayNumber?: number;
        totalDays?: number;
        isActuallyMultiDay?: boolean; // Added for debugging
    }

    // Helper to get visual info for an event
    const getEventVisualInfo = (event: Event | MultiDayEventInstance): EventVisualInfo => {
        const info: EventVisualInfo = {};

        // Check if this is a multi-day event instance
        if ('isInstance' in event && event.isInstance) {
            const instance = event as MultiDayEventInstance;
            if (instance.dayInfo) {
                info.isContinuingFromPreviousDay = !instance.dayInfo.isFirstDay;
                info.isContinuingToNextDay = !instance.dayInfo.isLastDay;
                info.dayNumber = instance.dayInfo.currentDay;
                info.totalDays = instance.dayInfo.totalDays;
                info.isActuallyMultiDay = true; // Indicate it's a multi-day event
            }
        }

        return info;
    };

    // Calculate overlap layout for each day to position events side-by-side
    const overlapLayouts = useMemo(() => {
        const layouts = new Map<number, Map<string, EventLayoutInfo>>();
        weekDays.forEach((_, dayIndex) => {
            const dayEvents = eventsByDay.get(dayIndex) || [];
            layouts.set(dayIndex, calculateOverlapLayout(dayEvents));
        });
        return layouts;
    }, [eventsByDay, weekDays]);

    return (
        <div
            className="week-grid-container"
            style={{
                ...gridColsStyle,
                position: 'relative',
                display: 'grid',
                background: 'var(--background-main, #0a0a0b)'
            }}
        >
            {/* Render grid lines for all slots (background layer) */}
            {Array.from({ length: totalSlots }).map((_, i) => (
                <div
                    key={`line-${i}`}
                    className="week-grid-line"
                    style={{
                        gridRow: i + 1,
                        gridColumn: '1 / -1' // Span all columns
                    }}
                />
            ))}

            {/* Render time labels (positioned on the hour) */}
            {timeSlots.map((slot, index) => (
                <div
                    key={`time-${slot.hour}`}
                    className="week-time-label"
                    style={{
                        gridColumn: 1,
                        gridRow: `${(index * 2) + 2}`, // Start at row 2, each hour is 2 rows
                        transform: 'translateY(-50%)', // Center on the grid line like day view
                        zIndex: 2
                    }}
                >
                    <div className="time-content">
                        <div className="time-hour">
                            {slot.time12.split(' ')[0]}
                        </div>
                        <div className="time-period">
                            {slot.time12.split(' ')[1]}
                        </div>
                    </div>
                </div>
            ))}

            {/* Add final time label for the end of the period */}
            <div
                className="week-time-label"
                style={{
                    gridColumn: 1,
                    gridRow: totalSlots + 1,
                    transform: 'translateY(-50%)',
                    zIndex: 2
                }}
            >
                <div className="time-content">
                    <div className="time-hour">
                        {endHour + 1 > 12 ? ((endHour + 1) % 12 || 12) : endHour + 1}:00
                    </div>
                    <div className="time-period">
                        {endHour + 1 >= 12 ? 'PM' : 'AM'}
                    </div>
                </div>
            </div>

            {/* Render events directly in the grid */}
            {weekDays.map((day, dayIndex) => {
                const dayEvents = eventsByDay.get(dayIndex) || [];
                const columnIndex = dayIndex + 2; // +2 because first column is time



                return dayEvents.map((event, eventIndex) => {
                    const { startRow, endRow, span } = getEventGridPosition(event, day);

                    // Skip events that don't have a valid position
                    if (startRow < 1 || endRow <= startRow) {
                        return null;
                    }

                    // Get visual info for multi-day events
                    const visualInfo = getEventVisualInfo(event);

                    // Get overlap layout info for side-by-side positioning
                    const dayLayout = overlapLayouts.get(dayIndex);
                    const layoutInfo = dayLayout?.get(event.id) || { columnIndex: 0, totalColumns: 1 };
                    const widthPercent = 100 / layoutInfo.totalColumns;
                    const leftPercent = layoutInfo.columnIndex * widthPercent;

                    // Regular single-day event rendering
                    const spanClasses = [
                        span > 2 ? 'data-span-gt-2' : '',
                        span > 4 ? 'data-span-gt-4' : '',
                        span > 6 ? 'data-span-gt-6' : '',
                        span > 8 ? 'data-span-gt-8' : '',
                        span > 10 ? 'data-span-gt-10' : '',
                        span > 12 ? 'data-span-gt-12' : '',
                        visualInfo.isContinuingFromPreviousDay ? 'continuation-top' : '',
                        visualInfo.isContinuingToNextDay ? 'continuation-bottom' : '',
                        visualInfo.dayNumber ? `day-${visualInfo.dayNumber}` : ''
                    ].filter(Boolean).join(' ');

                    // Create a unique key for the event
                    const eventKey = 'originalEventId' in event
                        ? `${event.originalEventId}-day${dayIndex}-${eventIndex}`
                        : `${event.id}-${dayIndex}-${eventIndex}`;

                    const isCompressed = layoutInfo.totalColumns > 1;

                    // Determine overlap mode: cascade (2-3), stacked (4+), or none (1)
                    const overlapMode = layoutInfo.totalColumns === 1 ? 'none'
                        : layoutInfo.totalColumns <= 3 ? 'cascade'
                            : 'stacked';

                    // For stacked mode, only show the first event
                    const isHiddenInStack = overlapMode === 'stacked' && layoutInfo.columnIndex > 0;

                    if (isHiddenInStack) {
                        return null; // Don't render hidden events in stacked mode
                    }

                    // Calculate styles based on mode
                    let positionStyles: React.CSSProperties = {};

                    if (overlapMode === 'cascade') {
                        // Cascade: minimum width with vertical offset
                        const cascadeOffset = layoutInfo.columnIndex * 5; // 5px per event
                        positionStyles = {
                            gridColumn: columnIndex,
                            gridRow: `${startRow} / ${endRow}`,
                            minWidth: '150px',
                            width: '150px',
                            marginLeft: `${layoutInfo.columnIndex * 10}px`, // Slight horizontal offset too
                            transform: `translateY(${cascadeOffset}px)`,
                            zIndex: 20 - layoutInfo.columnIndex, // First event on top
                        } as React.CSSProperties & { '--cascade-index': number };
                    } else if (overlapMode === 'stacked') {
                        // Stacked: full width for first event only
                        positionStyles = {
                            gridColumn: columnIndex,
                            gridRow: `${startRow} / ${endRow}`,
                            width: '100%',
                            zIndex: 10 + eventIndex,
                        };
                    } else {
                        // None: standard positioning
                        positionStyles = {
                            gridColumn: columnIndex,
                            gridRow: `${startRow} / ${endRow}`,
                            width: '100%',
                            zIndex: 10 + eventIndex,
                        };
                    }

                    return (
                        <div
                            key={eventKey}
                            className={`week-event-positioned ${overlapMode === 'cascade' ? 'cascade' : ''} ${isCompressed ? 'is-compressed' : ''}`}
                            style={{
                                ...positionStyles,
                                padding: '1px 2px',
                                boxSizing: 'border-box',
                                position: 'relative',
                            } as React.CSSProperties}
                        >
                            <EventCard
                                event={event}
                                onClick={() => onEventClick(event)}
                                onHover={(e) => onEventHover(event, e)}
                                onLeave={onEventLeave}
                                viewType="week"
                                visualInfo={{ span, ...visualInfo }}
                                className={spanClasses}
                                showCareerImpact={true}
                                isCompressed={isCompressed}
                                style={{
                                    height: '100%'
                                }}
                            />

                            {/* Overflow badge for stacked mode */}
                            {overlapMode === 'stacked' && layoutInfo.totalColumns > 1 && (
                                <div
                                    className="overflow-badge"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Get all events for this day/time slot
                                        const allEvents = dayEvents || [];
                                        setPopoverState({
                                            events: allEvents,
                                            anchorEl: e.currentTarget as HTMLElement,
                                        });
                                    }}
                                >
                                    +{layoutInfo.totalColumns - 1}
                                </div>
                            )}
                        </div>
                    );
                });
            })}

            {/* Event Overflow Popover */}
            {popoverState && popoverState.anchorEl && (
                <EventOverflowPopover
                    events={popoverState.events}
                    anchorEl={popoverState.anchorEl}
                    onClose={() => setPopoverState(null)}
                    onEventClick={onEventClick}
                />
            )}
        </div>
    );
};