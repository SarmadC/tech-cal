'use client';

import React from 'react';
import { MultiDayEvent, Event } from '@/types';
import { isSameDay } from '@/utils/dateUtils';
import { MonthEventCard } from '../MonthEventCard';

interface AllDayEventsRowProps {
    weekDays: Date[];
    events: MultiDayEvent[];
    onEventClick: (event: MultiDayEvent | Event) => void;
}

export const AllDayEventsRow: React.FC<AllDayEventsRowProps> = ({
    weekDays,
    events,
    onEventClick
}) => {
    if (!events || events.length === 0) return null;

    // Helper to calculate position and span for each event
    const getEventLayout = (event: MultiDayEvent) => {
        const start = new Date(event.startTime);
        const end = event.endTime ? new Date(event.endTime) : start;

        const weekStart = weekDays[0];
        const weekEnd = weekDays[6];

        // Find start column index (0-6)
        let startIndex = weekDays.findIndex(day => isSameDay(day, start));
        let startsInView = true;

        if (startIndex === -1) {
            if (start < weekStart) {
                startIndex = 0;
                startsInView = false;
            } else {
                return null; // Starts after this week - shouldn't happen if filtered
            }
        }

        // Find end column index
        let endIndex = weekDays.findIndex(day => isSameDay(day, end));
        let endsInView = true;

        if (endIndex === -1) {
            if (end > weekEnd) {
                endIndex = 6;
                endsInView = false;
            } else {
                return null; // Ends before this week
            }
        }

        const span = endIndex - startIndex + 1;

        return {
            startIndex,
            span,
            startsInView,
            endsInView
        };
    };

    return (
        <div className="all-day-events-row" style={{
            display: 'grid',
            gridTemplateColumns: '80px repeat(7, 1fr)', // Fixed time column matching TimeSlotGrid
            gap: '1px',
            borderBottom: '1px solid var(--border-default, rgba(255, 255, 255, 0.08))',
            paddingBottom: '4px',
            background: 'var(--background-main, #0a0a0b)',
            minWidth: '1200px' // Match WeekView minWidth
        }}>
            {/* Empty Time Column */}
            <div className="time-col-spacer" style={{ width: '80px' }}></div>

            {/* Events Container */}
            <div style={{
                gridColumn: '2 / -1',
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px', // Standard grid gap
                padding: '4px 0',
                gridAutoRows: '28px' // Fixed height rows like month view ribbons
            }}>
                {events.map((event) => {
                    const layout = getEventLayout(event);
                    if (!layout) return null;

                    const { startIndex, span, startsInView, endsInView } = layout;

                    // Determine border radius classes based on continuity
                    const spanClasses = [];
                    if (startsInView && endsInView) {
                        spanClasses.push('month-event-card--span-single');
                    } else if (startsInView) {
                        spanClasses.push('month-event-card--span-start');
                    } else if (endsInView) {
                        spanClasses.push('month-event-card--span-end');
                    } else {
                        spanClasses.push('month-event-card--span-middle');
                    }

                    return (
                        <div
                            key={event.id}
                            style={{
                                gridColumn: `${startIndex + 1} / span ${span}`,
                                height: '100%'
                            }}
                        >
                            <MonthEventCard
                                event={event}
                                onClick={() => onEventClick(event)}
                                onHover={() => { }}
                                onLeave={() => { }}
                                className={spanClasses.join(' ')}
                                style={{
                                    height: '100%',
                                    fontSize: '12px'
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
