import { FC, useMemo, useRef, useCallback, useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg, EventContentArg, EventMountArg, EventHoveringArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
// 1. UPDATE IMPORTS: Use the new `Event` type and the `isTrackedEvent` type guard.
import { Event, isTrackedEvent } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventPreviewCard from './EventPreviewCard';
import EventContent from './EventContent';

export interface CalendarWithPreviewProps {
    // 2. UPDATE PROPS: The component now accepts an array of the base `Event` type.
    events: Event[];
    onEventClick?: (clickInfo: EventClickArg) => void;
    view?: string;
    date?: Date;
    onNavigate?: (direction: 'prev' | 'next' | 'today') => void;
    onViewChange?: (view: string) => void;
    onDateChange?: (date: Date) => void;
    calendarRef?: React.RefObject<FullCalendar | null>;
    className?: string;
}

const CalendarWithPreview: FC<CalendarWithPreviewProps> = ({
    events,
    onEventClick,
    view = 'dayGridMonth',
    date,
    onDateChange,
    calendarRef,
    className = '',
}) => {
    const internalCalendarRef = useRef<FullCalendar | null>(null);
    const activeCalendarRef = calendarRef || internalCalendarRef;
    const [isMobile, setIsMobile] = useState(false);

    const {
        previewState,
        showPreview,
        hidePreview
    } = useEventPreview();

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const fullCalendarView = useMemo(() => {
        switch (view) {
            case 'week':
                return 'timeGridWeek';
            case 'month':
            default:
                return 'dayGridMonth';
        }
    }, [view]);

    useEffect(() => {
        const calendarApi = calendarRef?.current?.getApi();
        if (calendarApi && calendarApi.view.type !== fullCalendarView) {
            setTimeout(() => {
                calendarApi.changeView(fullCalendarView);
            }, 0);
        }
    }, [fullCalendarView, calendarRef]);

    // Transform events for FullCalendar
    const calendarEvents = useMemo(() => {
        return events.map(event => ({
            id: event.id,
            title: event.title,
            start: event.startTime,
            end: event.endTime || undefined,
            color: event.color || '#3b82f6',
            extendedProps: {
                ...event,
                // 3. SAFELY check for `isTracked` using the type guard.
                isTracked: isTrackedEvent(event) ? event.isTracked : false,
            }
        }));
    }, [events]);

    // Enhanced event content renderer
    const renderEventContent = useCallback((eventInfo: EventContentArg) => {
        return (
            <EventContent
                {...eventInfo}
                onEventHover={(event, position) => {
                    // Note: The `event` here comes from extendedProps, which is already `Event`
                    showPreview(event, position);
                }}
                onEventLeave={hidePreview}
            />
        );
    }, [showPreview, hidePreview]);

    // Handle event clicks
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        clickInfo.jsEvent.preventDefault();
        hidePreview();
        onEventClick?.(clickInfo);
    }, [onEventClick, hidePreview]);

    // Handle event mounting (for styling)
    const handleEventDidMount = useCallback((info: EventMountArg) => {
        // 4. UPDATE TYPE CAST: Use the new `Event` type.
        const eventData = info.event.extendedProps as Event;
        // 5. SAFELY check for `isTracked` before adding the class.
        if (isTrackedEvent(eventData) && eventData.isTracked) {
            info.el.classList.add('tracked-event');
        }
    }, []);

    // Handle event mouse enter
    const handleEventMouseEnter = useCallback((info: EventHoveringArg) => {
        // 6. UPDATE TYPE CAST: Use the new `Event` type.
        const event = info.event.extendedProps as Event;
        const rect = info.el.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.top
        };
        showPreview(event, position);
    }, [showPreview]);

    // Handle date changes (from calendar navigation)
    const handleDatesSet = useCallback((dateInfo: { start: Date }) => {
        onDateChange?.(dateInfo.start);
    }, [onDateChange]);

    return (
        <div className={`calendar-container relative h-full ${className}`}>
            <FullCalendar
                ref={activeCalendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
                initialView={fullCalendarView}
                initialDate={date}
                events={calendarEvents}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
                eventDidMount={handleEventDidMount}
                eventMouseEnter={handleEventMouseEnter}
                eventMouseLeave={hidePreview}
                datesSet={handleDatesSet}
                headerToolbar={false}
                height="100%"
                dayMaxEvents={isMobile ? 1 : 3}
                moreLinkClick="popover"
                eventDisplay="block"
                displayEventTime={!isMobile}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                expandRows={true}
                stickyHeaderDates={true}
                nowIndicator={true}
                dayMaxEventRows={isMobile ? 1 : 3}
                moreLinkContent={(arg) => {
                    return isMobile ? `+${arg.num}` : `+${arg.num} more`;
                }}
                // Mobile viewport optimizations - remove restrictive aspectRatio
                aspectRatio={isMobile ? (fullCalendarView === 'dayGridMonth' ? 0.8 : undefined) : undefined}
                // Mobile scrolling improvements
                scrollTime={isMobile ? "06:00:00" : "08:00:00"}
                scrollTimeReset={false}
                // Enable horizontal scrolling for mobile week/day views
                {...(isMobile && fullCalendarView !== 'dayGridMonth' && {
                    contentHeight: 'auto',
                    aspectRatio: undefined
                })}
            />

            {/* Event Preview Card */}
            {previewState.event && (
                <EventPreviewCard
                    event={previewState.event}
                    isVisible={previewState.isVisible}
                    position={previewState.position}
                    onClose={hidePreview}
                />
            )}
        </div>
    );
};

export default CalendarWithPreview;