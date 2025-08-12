// src/components/calendar/CalendarWithPreview.tsx
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
                format: event.location?.toLowerCase().includes('virtual') || event.livestreamUrl
                    ? 'virtual'
                    : 'in-person'
            }
        }));
    }, [events]);

    const renderEventContent = (eventInfo: EventContentArg) => {
        return (
            <EnhancedEventContent
                {...eventInfo}
                onEventHover={showPreview}
                onEventLeave={hidePreview}
            />
        );
    };

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
                headerToolbar={false} // We'll use custom header
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

            {/* Custom CSS for event styling */}
            <style jsx global>{`
                .tracked-event {
                    border-left: 4px solid #10B981 !important;
                }
                
                .virtual-event {
                    border-right: 2px solid #8B5CF6 !important;
                }
                
                .priority-event {
                    box-shadow: 0 0 0 2px #F59E0B !important;
                }
                
                .fc-event:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                .fc-event {
                    border-radius: 6px;
                    border: none !important;
                    transition: all 0.2s ease;
                }
                
                .fc-daygrid-event {
                    margin: 1px;
                }
                
                .fc-event-main {
                    padding: 2px 4px;
                }
            `}</style>
        </div>
    );
};

export default CalendarWithPreview;