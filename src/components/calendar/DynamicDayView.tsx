// src/components/calendar/DynamicDayView.tsx

'use client';

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import { type EventClickArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
// 1. UPDATE IMPORT: Use the new, canonical `Event` type.
import { Event } from '@/types';

// 2. UPDATE PROPS: The interface now uses the `Event` type.
export interface DynamicDayViewProps {
    events: Event[];
    initialDate: Date;
    onEventSelect?: (event: Event) => void;
    calendarRef?: React.RefObject<FullCalendar | null>;
}

export function DynamicDayView({ events, initialDate, onEventSelect, calendarRef }: DynamicDayViewProps) {
    const calendarEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.startTime,
        end: event.endTime || undefined,
        extendedProps: event,
        color: event.color,
    }));

    const handleEventClick = (clickInfo: EventClickArg) => {
        if (onEventSelect) {
            // 3. UPDATE TYPE CAST: Use the new `Event` type here.
            onEventSelect(clickInfo.event.extendedProps as Event);
        }
    };

    return (
        <div className="h-full w-full tech-day-view">
            <FullCalendar
                ref={calendarRef}
                plugins={[timeGridPlugin]}
                initialView="timeGridDay"
                initialDate={initialDate}

                headerToolbar={false}
                height="100%"

                events={calendarEvents}
                eventClick={handleEventClick}

                slotLabelFormat={{
                    hour: 'numeric',
                    minute: '2-digit',
                    omitZeroMinute: false,
                    meridiem: 'short'
                }}
                slotDuration="00:30:00"
                slotMinTime="00:00:00"
                slotMaxTime="24:00:00"
            />
        </div>
    );
}