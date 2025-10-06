import { FC, useMemo, useRef, useEffect, useState } from 'react';
import { EventClickArg, FullCalendar } from '@/types/fullcalendar';
import DynamicFullCalendar from './DynamicFullCalendar';
import { Event } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventPreviewCard from './EventPreviewCard';

export interface CalendarWithPreviewProps {
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
    const activeCalendarRef = useRef<FullCalendar | null>(null);
    const { hidePreview, previewState } = useEventPreview();
    const [isMobile, setIsMobile] = useState(false);

    // Use the passed ref or the internal ref
    const calendarRefToUse = calendarRef || activeCalendarRef;

    // Mobile detection
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Determine the appropriate FullCalendar view
    const fullCalendarView = useMemo(() => {
        switch (view) {
            case 'week':
                return 'timeGridWeek';
            case 'day':
                return 'timeGridDay';
            case 'list':
                return 'listWeek';
            case 'month':
            default:
                return 'dayGridMonth';
        }
    }, [view]);

    return (
        <>
            <DynamicFullCalendar
                ref={calendarRefToUse}
                events={events}
                onEventClick={onEventClick}
                view={view}
                date={date}
                onDateChange={onDateChange}
                className={className}
                initialView={fullCalendarView}
                height="100%"
                headerToolbar={false}
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
                moreLinkContent={(arg: { num: number }) => {
                    return isMobile ? `+${arg.num}` : `+${arg.num} more`;
                }}
                aspectRatio={isMobile ? (fullCalendarView === 'dayGridMonth' ? 0.8 : undefined) : undefined}
                scrollTime={isMobile ? "06:00:00" : "08:00:00"}
                scrollTimeReset={false}
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
        </>
    );
};

export default CalendarWithPreview;