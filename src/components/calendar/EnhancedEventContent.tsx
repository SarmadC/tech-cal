// src/components/calendar/EnhancedEventContent.tsx
import { FC, useRef } from 'react';
import { EventContentArg } from '@fullcalendar/core';
import { AppEvent } from '@/types';
import { Badge } from '@/components/ui/badge';

interface EnhancedEventContentProps extends EventContentArg {
    onEventHover?: (event: AppEvent, mouseEvent: MouseEvent) => void;
    onEventLeave?: () => void;
}

const EnhancedEventContent: FC<EnhancedEventContentProps> = ({
    event,
    timeText,
    onEventHover,
    onEventLeave
}) => {
    const eventData = event.extendedProps as AppEvent;
    const eventRef = useRef<HTMLDivElement>(null);

    const handleMouseEnter = (e: React.MouseEvent) => {
        if (onEventHover && eventData) {
            onEventHover(eventData, e.nativeEvent);
        }
    };

    const handleMouseLeave = () => {
        if (onEventLeave) {
            onEventLeave();
        }
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
        return now >= start && (!end || now <= end);
    };

    const isUpcoming = () => {
        const now = new Date();
        const start = new Date(eventData.startTime);
        const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        return start <= hourFromNow && start > now;
    };

    return (
        <div
            ref={eventRef}
            className="h-full w-full p-1 relative group cursor-pointer transition-all duration-200 hover:shadow-md"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Live/Upcoming indicators */}
            <div className="absolute top-0 right-0 flex space-x-1 z-10">
                {isLive() && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                )}
                {isUpcoming() && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                )}
                {eventData.isTracked && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
            </div>

            {/* Event content */}
            <div className="h-full flex flex-col">
                <div className="font-medium text-xs mb-1 line-clamp-2 group-hover:font-semibold transition-all">
                    {event.title}
                </div>

                {timeText && (
                    <div className="text-xs opacity-75 mb-1">
                        {formatTime(eventData.startTime)}
                    </div>
                )}

                <div className="text-xs opacity-60 line-clamp-1">
                    {eventData.organizer}
                </div>

                {/* Format badge for larger events */}
                {event.extendedProps?.format && (
                    <div className="mt-auto">
                        <Badge
                            variant="outline"
                            className="text-xs px-1 py-0 h-4 opacity-80 group-hover:opacity-100"
                        >
                            {event.extendedProps.format === 'virtual' ? '🌐' : '📍'}
                        </Badge>
                    </div>
                )}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded pointer-events-none"></div>
        </div>
    );
};

export default EnhancedEventContent;