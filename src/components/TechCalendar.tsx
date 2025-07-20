// src/components/TechCalendar.tsx (Definitive Final Version)

import { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { EventClickArg } from '@fullcalendar/core';

// --- THIS IS THE CRITICAL FIX ---
// The `end` property must be defined as an optional string (`end?: string`),
// which translates to `string | undefined`. It MUST NOT include `null`.
type FullCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
};

// The props interface now uses the corrected type.
interface TechCalendarProps {
  events: FullCalendarEvent[];
  onEventClick: (clickInfo: EventClickArg) => void;
  initialView?: string;
}

const TechCalendar = forwardRef<FullCalendar, TechCalendarProps>(
  ({ events, onEventClick, initialView = 'timeGridWeek' }, ref) => {
    return (
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView={initialView}
        headerToolbar={false}
        events={events}
        eventClick={onEventClick}
        height="100%"
        dayHeaderFormat={{ weekday: 'short', day: 'numeric', omitCommas: true }}
        slotLabelFormat={{ hour: 'numeric', minute: '2-digit', omitZeroMinute: false, meridiem: 'short' }}
        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
        slotMinTime="06:00:00"
        slotMaxTime="24:00:00"
        eventDisplay="block"
        eventClassNames="cursor-pointer border-none rounded-md p-1 text-xs"
        viewClassNames="h-full"
      />
    );
  }
);

TechCalendar.displayName = 'TechCalendar';

export default TechCalendar;