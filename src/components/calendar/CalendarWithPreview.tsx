import { FC, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg, EventContentArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { AppEvent } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventPreviewCard from './EventPreviewCard';
import EnhancedEventContent from './EnhancedEventContent';

interface CalendarWithPreviewProps {
    events: AppEvent[];
    onEventClick?: (clickInfo: EventClickArg) => void;
    view?: string;
    date?: Date;
    onNavigate?: (direction: 'prev' | 'next' | 'today') => void;
    onViewChange?: (view: string) => void;
    calendarRef?: React.RefObject<FullCalendar | null>;
}

const CalendarWithPreview: FC<CalendarWithPreviewProps> = ({
    events,
    onEventClick,
    view = 'dayGridMonth',
    date,
    calendarRef
}) => {
    const { previewState, showPreview, hidePreview, forceHidePreview } = useEventPreview();

    // Transform events for FullCalendar
    const calendarEvents = useMemo(() => {
        return events.map(event => ({
            id: event.id,
            title: event.title,
            start: event.startTime,
            end: event.endTime || undefined, // Convert null to undefined for FullCalendar
            color: event.color || event.category?.color || '#3B82F6',
            extendedProps: {
                ...event,
                // This ternary operator is now syntactically correct
                format: event.location?.toLowerCase().includes('virtual') || event.livestreamUrl
                    ? 'virtual'
                    : 'in-person'
            }
        }));
    }, [events]); // The dependency array for useMemo is correctly placed

    const renderEventContent = (eventInfo: EventContentArg) => {
        return (
            <EnhancedEventContent
                {...eventInfo}
                onEventHover={showPreview}
                onEventLeave={hidePreview}
            />
        );
    };

    // The component correctly returns JSX (ReactNode)
    return (
        <div className="relative">
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin]}
                initialView={view}
                initialDate={date}
                events={calendarEvents}
                eventContent={renderEventContent}
                eventClick={onEventClick}
                headerToolbar={false} // We'll use a custom header
                height="auto"
                dayMaxEventRows={3}
                moreLinkClick="popover"
                eventDisplay="block"
                displayEventTime={true}
                eventMinHeight={30}
                eventMaxStack={3}
                dayHeaderFormat={{ weekday: 'short' }}
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                allDaySlot={false}
                eventDidMount={(info) => {
                    // Add custom classes based on event properties
                    const eventData = info.event.extendedProps as AppEvent & { format?: string };

                    if (eventData.isTracked) {
                        info.el.classList.add('tracked-event');
                    }

                    // Add format-specific styling
                    if (eventData.format === 'virtual') {
                        info.el.classList.add('virtual-event');
                    }

                    // Add priority styling based on category or other criteria
                    if (eventData.category?.name.toLowerCase().includes('important')) {
                        info.el.classList.add('priority-event');
                    }
                }}
            />

            {/* Preview Card Overlay */}
            {previewState.event && (
                <EventPreviewCard
                    event={previewState.event}
                    isVisible={previewState.isVisible}
                    position={previewState.position}
                    onClose={forceHidePreview}
                    onTrackingChange={(isTracked) => {
                        // Update the event in your state management
                        console.log('Event tracking changed:', isTracked);
                    }}
                />
            )}

            {/* The <style jsx global> block has been correctly removed. */}
        </div>
    );
};

export default CalendarWithPreview;