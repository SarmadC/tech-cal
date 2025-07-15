'use client';

import { forwardRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import { EventClickArg } from '@fullcalendar/core';

type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  color: string;
};

interface TechCalendarProps {
  events: Event[];
  onEventClick: (clickInfo: EventClickArg) => void;
}

const TechCalendar = forwardRef<FullCalendar, TechCalendarProps>(
  ({ events, onEventClick }, ref) => {
    
    const formattedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start_time,
      end: event.end_time || undefined, // Corrected line
      backgroundColor: event.color,
      borderColor: event.color,
      textColor: '#ffffff',
    }));

    return (
      <div className="h-full">
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          themeSystem="tailwind"
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
          }}
          events={formattedEvents}
          height="100%"
          eventClick={onEventClick}
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
          eventDidMount={(info) => {
            info.el.style.transition = 'all 0.2s ease';
          }}
          eventMouseEnter={(info) => {
            info.el.style.transform = 'translateY(-2px)';
            info.el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          eventMouseLeave={(info) => {
            info.el.style.transform = 'translateY(0)';
            info.el.style.boxShadow = '';
          }}
          slotLabelFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: 'short'
          }}
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          expandRows={true}
          stickyHeaderDates={true}
          listDayFormat={{ weekday: 'long', month: 'long', day: 'numeric' }}
          listDaySideFormat={false}
          noEventsContent="No events scheduled"
        />
      </div>
    );
  }
);

TechCalendar.displayName = 'TechCalendar';
export default TechCalendar;