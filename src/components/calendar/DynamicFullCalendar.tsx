'use client';

import { forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { FullCalendarCSSLoader } from './FullCalendarCSSLoader';

// Dynamic import for FullCalendar component only (plugins should be imported normally)
const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });

// Import plugins normally - they don't need to be dynamically imported
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

import { EventClickArg, EventContentArg, EventMountArg, EventHoveringArg } from '@/types/fullcalendar';
import { Event } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventContent from './EventContent';
import { getPillColor } from '@/utils/pillColorUtils';

export interface DynamicFullCalendarProps {
    events: Event[];
    onEventClick?: (clickInfo: EventClickArg) => void;
    view?: string;
    date?: Date;
    onDateChange?: (date: Date) => void;
    className?: string;
    initialView?: string;
    height?: string | number;
    headerToolbar?: boolean | object;
    // Allow other FullCalendar props but with proper typing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DynamicFullCalendar = forwardRef<any, DynamicFullCalendarProps>(({
    events,
    onEventClick,
    date,
    onDateChange,
    className = '',
    initialView = 'dayGridMonth',
    height = '100%',
    headerToolbar = false,
    ...otherProps
}, _ref) => {
    const { showPreview, hidePreview } = useEventPreview();

    // Create a key that changes when tracking status changes to force re-render
    const trackingKey = events.map((event: Event) => 
        ('isTracked' in event) ? `${event.id}-${event.isTracked}` : `${event.id}-false`
    ).join(',');

    // Transform events for FullCalendar
    const calendarEvents = events.map((event: Event) => {
        // Get tracking status from the event itself (already enriched)
        const isTracked = ('isTracked' in event) ? event.isTracked : false;
        
        // Get event color - use category color or default
        const eventColor = event.color || event.category?.color || '#6B7280';
        
        // For tracked events, use a slightly different color to indicate tracking
        const backgroundColor = isTracked ? eventColor : eventColor;
        const borderColor = isTracked ? eventColor : eventColor;
        
        return {
            id: event.id,
            title: event.title,
            start: event.startTime,
            end: event.endTime,
            extendedProps: event, // Event already has isTracked property
            backgroundColor,
            borderColor,
            textColor: '#ffffff',
            classNames: [
                `event-${event.eventTypeId}`, 
                'custom-event',
                isTracked ? 'tracked-event' : 'untracked-event'
            ],
            // Add CSS custom properties for styling
            style: {
                '--category-title-color': getPillColor(backgroundColor, 0.5),
                '--text-on-pastel': getPillColor(backgroundColor, 0.5)
            } as React.CSSProperties
        };
    });

    const renderEventContent = (eventInfo: EventContentArg) => (
        <EventContent {...eventInfo} />
    );

    const handleEventClick = (clickInfo: EventClickArg) => {
        onEventClick?.(clickInfo);
    };

    const handleEventDidMount = (_info: EventMountArg) => {
        // Event mounting logic if needed
    };

    const handleEventMouseEnter = (info: EventHoveringArg) => {
        const event = info.event.extendedProps as Event;
        const rect = info.el.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.top
        };
        showPreview(event, position);
    };

    const handleDatesSet = (dateInfo: { start: Date }) => {
        onDateChange?.(dateInfo.start);
    };

    return (
        <div className={`calendar-container relative h-full ${className}`}>
            <FullCalendarCSSLoader />
            <FullCalendar
                key={trackingKey} // Force re-render when tracking status changes
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                initialView={initialView}
                initialDate={date}
                events={calendarEvents}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
                eventDidMount={handleEventDidMount}
                eventMouseEnter={handleEventMouseEnter}
                eventMouseLeave={hidePreview}
                datesSet={handleDatesSet}
                headerToolbar={headerToolbar}
                height={height}
                {...otherProps}
            />
        </div>
    );
});

DynamicFullCalendar.displayName = 'DynamicFullCalendar';

export default DynamicFullCalendar;
