'use client';

import React from 'react';
import { Event } from '@/types';
import { MapPin } from '@phosphor-icons/react';
import { formatTime } from '@/utils/dateUtils';
import { useTimelineTheme } from '@/hooks/useTimelineTheme';
import { isEventFree } from '@/utils/filterCountUtils';

interface TimelineAgendaItemProps {
    event: Event;
    onClick?: (event: Event) => void;
    className?: string;
}

export const TimelineAgendaItem: React.FC<TimelineAgendaItemProps> = ({
    event,
    onClick,
    className = ''
}) => {
    const theme = useTimelineTheme();
    const startTimeResult = formatTime(event.startTime, event.timezone);
    const isFree = isEventFree(event);

    // Extract just the time part if possible, or use the whole string
    // formatTime usually returns "10:00 AM", which is what we want

    return (
        <div
            onClick={() => onClick?.(event)}
            className={`timeline-agenda-item flex py-2.5 pl-2 pr-3 cursor-pointer w-full ${className}`}
        >
            {/* Left Column: Time - Start Time Only */}
            <div className="w-[60px] flex-shrink-0 pr-4 text-right pt-[2px]">
                <span className="timeline-agenda-item-time">
                    {/* Only show HH:MM, strip AM/PM, strip Timezone usage if any */}
                    {startTimeResult.replace(/\s?[AP]M.*/i, '')}
                </span>
            </div>

            {/* Right Column: Content */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {/* Title - Allow wrapping */}
                <h4 className="timeline-agenda-item-title break-words line-clamp-2 pr-2">
                    {event.title}
                </h4>

                {/* Second Row: Location & Type */}
                <div className="timeline-agenda-item-meta flex items-center gap-2 overflow-hidden flex-wrap leading-tight">
                    {event.location && (
                        <div className="flex items-center gap-1 min-w-0 flex-shrink-1 truncate max-w-full">
                            {/* <MapPin size={12} className="flex-shrink-0" /> */}
                            <span className="truncate">{event.location}</span>
                        </div>
                    )}

                    {event.location && <span className="timeline-agenda-item-separator">•</span>}

                    {/* Price/Type Badge */}
                    <span className={`block flex-shrink-0 whitespace-nowrap ${isFree ? 'text-green-500/80' : 'timeline-agenda-item-paid-badge'}`}>
                        {isFree ? 'Free' : 'Paid'}
                    </span>
                </div>
            </div>
        </div>
    );
};
