// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import { Clock, MapPin } from 'lucide-react';
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

    // Get category-based background color from the event type
    const getCategoryColor = () => {
        // If we have a category with a color, use it directly
        if (event.category?.color) {
            return event.category.color;
        }
        
        // Fallback to category name matching if no color is set
        const categoryName = event.category?.name?.toLowerCase();
        switch (categoryName) {
            case 'tech summit':
            case 'summit':
                return '#bfdbfe'; // soft blue
            case 'workshop':
                return '#e9d7ff'; // soft lavender
            case 'networking':
                return '#b8ffcc'; // soft mint
            case 'conference':
                return '#a7f3d0'; // soft teal
            case 'webinar':
                return '#fed8ae'; // soft peach
            case 'startup':
                return '#fecaca'; // soft coral
            case 'trade show':
                return '#faf3dd'; // soft cream
            case 'product launch':
                return '#ffa69e'; // soft coral
            case 'training':
                return '#b8f2e6'; // soft mint
            default:
                return '#f1f5f9'; // light gray fallback
        }
    };

    // Generate CSS classes for event state
    const cardClasses = [
        'event-card',
        'event-card-v8', // New V8 styling class
        live ? 'live' : '',
        isEventTracked(event) ? 'tracked' : '',
        isOverlapping ? 'overlapping' : '',
        event.category?.name?.toLowerCase().replace(/\s+/g, '-') || 'default', // Add category class
        className
    ].filter(Boolean).join(' ');

    // Set up CSS variables for the new design
    const cardStyle: React.CSSProperties = {
        ['--event-color' as string]: event.category?.color || '#6B7280',
        ['--category-bg' as string]: getCategoryColor(),
        backgroundColor: getCategoryColor(),
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
    const showLocation = viewType === 'day' && visualInfo?.span && visualInfo.span > 6;
    const showCategory = viewType === 'week' || (viewType === 'day' && visualInfo?.span && visualInfo.span > 2);

    return (
        <div
            style={cardStyle}
            className={cardClasses}
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            {/* Header with category and live indicator */}
            {showCategory && (
                <div className="event-header">
                    <div className="event-badges">
                        {event.category?.name && (
                            <span className="event-category">{event.category.name}</span>
                        )}
                        {live && (
                            <span className="event-live-indicator">Live</span>
                        )}
                    </div>
                </div>
            )}

            {/* Event title */}
            <div className="event-title">{event.title}</div>

            {/* Event meta information */}
            <div className="event-meta">
                <div className="event-time">
                    <Clock size={14} />
                    <span>{getTimeDisplay()}</span>
                </div>

                {showLocation && event.location && (
                    <div className="event-location">
                        <MapPin size={14} />
                        <span>{event.location}</span>
                    </div>
                )}

                {showOrganizer && event.organizer && (
                    <div className="event-organizer">
                        <span>{event.organizer}</span>
                    </div>
                )}
            </div>
        </div>
    );
};