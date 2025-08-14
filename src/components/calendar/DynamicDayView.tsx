// src/components/calendar/DynamicDayView.tsx

'use client';

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import { type EventClickArg } from '@fullcalendar/core';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AppEvent } from '@/types';

export interface DynamicDayViewProps {
    events: AppEvent[];
    initialDate: Date;
    onEventSelect?: (event: AppEvent) => void;
    calendarRef?: React.RefObject<FullCalendar | null>;
}

// --- THIS IS THE FIX ---
// Add 'calendarRef' to the list of destructured props.
export function DynamicDayView({ events, initialDate, onEventSelect, calendarRef }: DynamicDayViewProps) {
    // --- END OF FIX ---

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
            onEventSelect(clickInfo.event.extendedProps as AppEvent);
        }
    };

    return (
        <div className="h-full w-full tech-day-view">
            <FullCalendar
                ref={calendarRef} // Now this variable exists and can be used here.
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