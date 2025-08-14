// src/components/calendar/EnhancedEventContent.tsx
import { FC, useRef } from 'react';
import { EventContentArg } from '@fullcalendar/core';
import { AppEvent } from '@/types';
import { Badge } from '@/components/ui/badge';

interface EnhancedEventContentProps extends EventContentArg {
    onEventHover?: (event: AppEvent, position: { x: number; y: number }) => void;
    onEventLeave?: () => void;
}

const EnhancedEventContent: FC<EnhancedEventContentProps> = ({
    event,
    timeText,
    onEventHover,
    onEventLeave
}) => {
    const elementRef = useRef<HTMLDivElement>(null);

    const eventData = event.extendedProps as AppEvent;

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

    const formatTime = (time: string) => {
        return new Date(time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const isLive = () => {
        const now = new Date();
        const start = new Date(eventData.startTime);
        const end = eventData.endTime ? new Date(eventData.endTime) : null;
        return start <= now && (!end || now <= end);
    };

    return (
        <div
            ref={elementRef}
            className="fc-event-main-frame"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="fc-event-time">
                {timeText || formatTime(eventData.startTime)}
            </div>
            <div className="fc-event-title-container">
                <div className="fc-event-title fc-sticky">
                    {event.title}
                    {isLive() && (
                        <Badge variant="destructive" className="ml-1 text-xs">
                            LIVE
                        </Badge>
                    )}
                    {eventData.isTracked && (
                        <span className="ml-1 text-yellow-500">★</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnhancedEventContent;