// src/components/calendar/EventContent.tsx
import { FC, useRef } from 'react';
import { EventContentArg } from '@fullcalendar/core';
import { Event } from '@/types';
import { formatTime } from '@/utils/dateUtils';

interface EventContentProps extends EventContentArg {
    onEventHover?: (event: Event, position: { x: number; y: number }) => void;
    onEventLeave?: () => void;
}

const EventContent: FC<EventContentProps> = ({
    event,
    timeText,
    onEventHover,
    onEventLeave
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const eventData = event.extendedProps as Event;
    
    // Get tracking status
    const isTracked = ('isTracked' in eventData) && eventData.isTracked;
    
    // Check if event is before today's date (completed)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const eventDate = new Date(eventData.startTime);
    eventDate.setHours(0, 0, 0, 0); // Start of event date
    const isCompleted = eventDate < today;
    
    const showStar = isTracked;
    const showCheckmark = isCompleted;

    const handleMouseEnter = (_e: React.MouseEvent) => {
        if (onEventHover && elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            onEventHover(eventData, {
                x: rect.left + rect.width / 2,
                y: rect.top
            });
        }
    };

    const handleMouseLeave = () => {
        onEventLeave?.();
    };
    return (
        <div
            ref={elementRef}
            className="fc-event-main-frame"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="fc-event-time">
                {/* 6. USE UTILITY: Call the imported `formatTime` utility. */}
                {timeText || formatTime(eventData.startTime, eventData.timezone)}
            </div>
            <div className="fc-event-title-container">
                <div className="fc-event-title fc-sticky">
                    {/* @ts-expect-error - event.title type issue with FullCalendar */}
                    {event.title as string}
                    {showStar && (
                        <>
                            <span className="ml-1 text-gray-300">★</span>
                            {showCheckmark && (
                                <span className="ml-1 text-green-500 font-bold">✓</span>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventContent;