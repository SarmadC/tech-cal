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
    isStart,
    onEventHover,
    onEventLeave
}) => {
    // Hooks must be called at the top level before any conditional returns.
    const eventRef = useRef<HTMLDivElement>(null);

    // For multi-day events, only render the full content on the first day segment.
    // Subsequent segments will be blank, creating the "continuous pill" effect.
    if (!isStart) {
        return <div className="fc-event-title-blank">&nbsp;</div>;
    }

    const eventData = event.extendedProps as AppEvent;

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

    // Note: The isUpcoming and status indicators are now integrated into the main body
    // to allow for better layout control and hover effects if desired.

    return (
        <div
            ref={eventRef}
            // The `group` class enables `group-hover:` styles on child elements
            className="h-full w-full p-1.5 relative group cursor-pointer overflow-hidden"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* The fc-event-main-content class is for the global CSS to target */}
            <div className="fc-event-main-content h-full flex flex-col">
                {/* --- TOP ROW: Title and Live Indicator --- */}
                <div className="flex items-start justify-between">
                    {/* The `event-title` class receives styles from globals.css */}
                    <p className="event-title text-xs mb-1 line-clamp-1">
                        {event.title}
                    </p>
                    {isLive() && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0 ml-1"></div>
                    )}
                </div>


                {/* --- MIDDLE ROW: Time and Organizer (Revealed on Hover) --- */}
                {/* This whole block will fade in on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {timeText && (
                        /* The `event-time` class receives styles from globals.css */
                        <div className="event-time text-xs">
                            {formatTime(eventData.startTime)}
                        </div>
                    )}
                    {/* The `event-organizer` class receives styles from globals.css */}
                    <div className="event-organizer text-xs line-clamp-1">
                        {eventData.organizer}
                    </div>
                </div>


                {/* --- BOTTOM ROW (FOOTER): Tracked Icon and Format Badge (Revealed on Hover) --- */}
                <div className="mt-auto flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {eventData.isTracked ? (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    ) : <div></div> /* Empty div to maintain space-between alignment */}

                    {event.extendedProps?.format && (
                        <Badge
                            variant="outline"
                            className="text-xs px-1 py-0 h-4"
                        >
                            {event.extendedProps.format === 'virtual' ? '🌐' : '📍'}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnhancedEventContent;