// src/components/calendar/shared/TimeSlotGrid.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { Event, MultiDayEventInstance } from '@/types';
import { EventCard } from './EventCard';
import '@/app/styles/stacked-cards.css';
import { calculateOverlapLayout, EventLayoutInfo } from '@/utils/eventViewUtils';
import { getCategoryColor } from '@/utils/eventUtils';

export interface TimeSlot {
    hour: number;
    time24: string;
    time12: string;
}

// Current Time Line Component
const CurrentTimeLine: React.FC<{ startHour: number; totalSlots: number; weekDays: Date[] }> = ({ startHour, totalSlots, weekDays }) => {
    const [now, setNow] = useState(new Date());

    React.useEffect(() => {
        // Update every 30 seconds for smoother time tracking
        const timer = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(timer);
    }, []);

    // Check if the current day (from now) is in the displayed week
    const nowDateString = now.toDateString();
    const dayIndex = weekDays.findIndex(day => day.toDateString() === nowDateString);

    // Only show if today is in the displayed week
    if (dayIndex === -1) {
        return null;
    }

    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // Only show if within view hours
    if (currentHour < startHour || currentHour > (startHour + totalSlots / 2)) {
        return null;
    }

    // Calculate position within the day
    const totalMinutesFromStart = ((currentHour - startHour) * 60) + currentMinutes;
    const rowPosition = (totalMinutesFromStart / 30) + 1;

    // Column is dayIndex + 2 (column 1 is time column, columns 2-8 are the 7 days)
    const columnIndex = dayIndex + 2;

    return (
        <div
            className="current-time-line-container"
            style={{
                gridColumn: columnIndex,
                gridRowStart: Math.floor(rowPosition),
                gridRowEnd: Math.floor(rowPosition),
                position: 'relative',
                zIndex: 50,
                pointerEvents: 'none'
            }}
        >
            <div
                className="current-time-line"
                style={{
                    position: 'absolute',
                    top: `${(rowPosition % 1) * 100}%`,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: '#ef4444', // Red-500
                    boxShadow: '0 0 4px rgba(239, 68, 68, 0.4)'
                }}
            >
                <div className="current-time-dot" style={{
                    position: 'absolute',
                    left: '-4px',
                    top: '-3px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ef4444'
                }} />
            </div>
        </div>
    );
};

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
    // Calculate the number of half-hour slots needed
    const totalHours = endHour - startHour + 1;
    const totalSlots = totalHours * 2 + 1; // +1 for the final time label

    // Generate the grid template columns (time column + 7 day columns)
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const minWidth = isMobile ? '600px' : '1200px';
    const timeColumnWidth = isMobile ? '60px' : '80px';

    const gridColsStyle = {
        gridTemplateColumns: `${timeColumnWidth} repeat(7, 1fr)`,
        gridTemplateRows: `repeat(${totalSlots}, 40px)`,
        minWidth
    };

    // Helper function to calculate grid row positions for an event
    const getEventGridPosition = (event: Event | MultiDayEventInstance, currentDay: Date) => {
        const eventStart = new Date(event.startTime);
        const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);

        const dayStart = new Date(currentDay);
        dayStart.setHours(startHour, 0, 0, 0);
        const dayEnd = new Date(currentDay);
        dayEnd.setHours(endHour, 59, 59, 999);

        // Clamp event times to visible grid boundaries
        const clampedStart = eventStart < dayStart ? dayStart : eventStart;
        const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

        if (clampedStart >= clampedEnd) {
            return { startRow: -1, endRow: -1, span: 0 };
        }

        const startMinutes = (clampedStart.getHours() - startHour) * 60 + clampedStart.getMinutes();
        const endMinutes = (clampedEnd.getHours() - startHour) * 60 + clampedEnd.getMinutes();

        const startRow = Math.max(1, Math.floor(startMinutes / 30) + 1);
        const endRow = Math.min(totalSlots, Math.ceil(endMinutes / 30) + 1);

        const span = endRow - startRow;

        return { startRow, endRow, span };
    };

    // Helper to get visual info for an event
    const getEventVisualInfo = (event: Event | MultiDayEventInstance) => {
        const info: any = {};
        if ('isInstance' in event && event.isInstance) {
            const instance = event as MultiDayEventInstance;
            if (instance.dayInfo) {
                info.isContinuingFromPreviousDay = !instance.dayInfo.isFirstDay;
                info.isContinuingToNextDay = !instance.dayInfo.isLastDay;
            }
        }
        return info;
    };

    // Calculate overlap layout using the existing utility
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
            {/* Grid Lines */}
            {Array.from({ length: totalSlots }).map((_, i) => (
                <div
                    key={`line-${i}`}
                    className="week-grid-line"
                    style={{
                        gridRow: i + 1,
                        gridColumn: '1 / -1'
                    }}
                />
            ))}

            {/* Time Labels */}
            {timeSlots.map((slot, index) => (
                <div
                    key={`time-${slot.hour}`}
                    className="week-time-label"
                    style={{
                        gridColumn: 1,
                        gridRow: `${(index * 2) + 2}`,
                        transform: 'translateY(-50%)',
                        zIndex: 2
                    }}
                >
                    <div className="time-content">
                        <div className="time-hour">{slot.time12.split(' ')[0]}</div>
                        <div className="time-period">{slot.time12.split(' ')[1]}</div>
                    </div>
                </div>
            ))}

            {/* End Time Label */}
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
                    <div className="time-hour">{endHour + 1 > 12 ? ((endHour + 1) % 12 || 12) : endHour + 1}:00</div>
                    <div className="time-period">{(endHour + 1) % 24 >= 12 ? 'PM' : 'AM'}</div>
                </div>
            </div>

            {/* Current Time Line - "Now" Indicator */}
            <CurrentTimeLine startHour={startHour} totalSlots={totalSlots} weekDays={weekDays} />

            {/* Events - Side-by-Side Lanes Strategy */}
            {weekDays.map((day, dayIndex) => {
                const dayEvents = eventsByDay.get(dayIndex) || [];
                const columnIndex = dayIndex + 2;
                const dayLayouts = overlapLayouts.get(dayIndex);

                return dayEvents.map((event) => {
                    const eventId = 'originalEventId' in event ? event.originalEventId : event.id;
                    const eventKey = `${eventId}-day${dayIndex}`;

                    // Grid Position
                    const { startRow, endRow, span } = getEventGridPosition(event, day);
                    if (startRow < 1 || endRow <= startRow) return null;

                    // Lanes Layout Info
                    // calculateOverlapLayout returns { columnIndex: number, totalColumns: number }
                    // columnIndex is 0-based index within the overlap cluster
                    const layoutInfo = dayLayouts?.get(eventId) || { columnIndex: 0, totalColumns: 1 };
                    const { columnIndex: laneIndex, totalColumns } = layoutInfo;

                    // Visual Info
                    const visualInfo = getEventVisualInfo(event);
                    const spanClasses = [
                        span > 2 ? 'data-span-gt-2' : '',
                        span > 4 ? 'data-span-gt-4' : '',
                        visualInfo.isContinuingFromPreviousDay ? 'continuation-top' : '',
                        visualInfo.isContinuingToNextDay ? 'continuation-bottom' : '',
                    ].filter(Boolean).join(' ');

                    return (
                        <div
                            key={eventKey}
                            className="week-event-positioned"
                            style={{
                                gridColumn: columnIndex,
                                gridRow: `${startRow} / ${endRow}`,
                                // LANES LOGIC:
                                // Width = 100% / totalColumns
                                // Left = (100% / totalColumns) * laneIndex
                                width: `calc((100% / ${totalColumns}) - 2px)`, // -2px for visual gap
                                left: `calc((100% / ${totalColumns}) * ${laneIndex})`,
                                zIndex: 10 + laneIndex, // Higher index for right-most lanes slightly? Or equal.
                                position: 'relative',
                                justifySelf: 'start',
                                marginLeft: '1px',
                                marginRight: '1px'
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
                                style={{ height: '100%' }}
                            />
                        </div>
                    );
                });
            })}
        </div>
    );
};