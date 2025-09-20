// src/components/calendar/EventContent.tsx
import { FC, useRef } from 'react';
import { EventContentArg } from '@fullcalendar/core';
import { Event, isTrackedEvent } from '@/types';
import { Badge } from '@/components/ui/badge';
import { formatTime, isEventLive } from '@/utils/dateUtils';

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
                    {event.title}
                    {/* 7. USE UTILITY: Call the imported `isEventLive` utility. */}
                    {isEventLive(eventData.startTime, eventData.endTime) && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                            LIVE
                        </Badge>
                    )}
                    {isTrackedEvent(eventData) && eventData.isTracked && (
                        <span className="ml-1 text-gray-300">★</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EventContent;