// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Event, MultiDayEventInstance, isEventTracked } from '@/types';
import { isEventLive, formatTime } from '@/utils/dateUtils';

export interface EventCardProps {
    event: Event | MultiDayEventInstance;
    onClick: () => void;
    onHover: (e: React.MouseEvent) => void;
    onLeave: () => void;
    viewType?: 'day' | 'week';
    visualInfo?: {
        startRow?: number;
        endRow?: number;
        span?: number;
        isContinuingFromPreviousDay?: boolean;
        isContinuingToNextDay?: boolean;
    };
    className?: string;
    style?: React.CSSProperties;
    isOverlapping?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
    event,
    onClick,
    onHover,
    onLeave,
    viewType = 'day',
    visualInfo,
    className = '',
    style = {},
    isOverlapping = false
}) => {
    const live = isEventLive(event.startTime, event.endTime);

    // Generate CSS classes for event state
    const cardClasses = [
        'event-card',
        live ? 'live' : '',
        isEventTracked(event) ? 'tracked' : '',
        isOverlapping ? 'overlapping' : '',
        className
    ].filter(Boolean).join(' ');

    // Set up CSS variables for color
    const cardStyle: React.CSSProperties = {
        ['--event-color' as string]: event.category?.color || '#6B7280',
        ...style
    };

    // Format time display based on view type and continuation
    const getTimeDisplay = () => {
        if (viewType === 'day' && visualInfo?.isContinuingFromPreviousDay) {
            return "Continues";
        }

        const startTime = new Date(event.startTime);
        if (viewType === 'week') {
            return formatTime(event.startTime, event.timezone);
        }

        return startTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Determine if organizer should be shown (for longer events in day view)
    const showOrganizer = viewType === 'day' && visualInfo?.span && visualInfo.span > 4;

    return (
        <div
            style={cardStyle}
            className={cardClasses}
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <div className="event-title">{event.title}</div>

            <div className="event-time">
                <Clock size={12} />
                <span>{getTimeDisplay()}</span>
            </div>

            {showOrganizer && (
                <div className="event-organizer">{event.organizer}</div>
            )}
        </div>
    );
};