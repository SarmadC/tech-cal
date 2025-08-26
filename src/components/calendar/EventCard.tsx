// src/components/calendar/shared/EventCard.tsx
'use client';

import React, { useMemo } from 'react';
import { Clock, Video, MapPin, Star } from 'lucide-react';
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
        dayNumber?: number;
        totalDays?: number;
    };
    className?: string;
    style?: React.CSSProperties;
}

export const EventCard: React.FC<EventCardProps> = ({ 
    event, 
    onClick, 
    onHover, 
    onLeave, 
    viewType = 'day',
    visualInfo,
    className = '',
    style = {}
}) => {
    // Determine event states
    const live = isEventLive(event.startTime, event.endTime);
    const tracked = isEventTracked(event);
    const isVirtual = event.location?.toLowerCase().includes('virtual') || 
                      event.location?.toLowerCase().includes('online') ||
                      !!event.livestreamUrl;
    
    // Check if this is a multi-day event
    const isMultiDay = visualInfo?.totalDays && visualInfo.totalDays > 1;
    const dayNumber = visualInfo?.dayNumber;
    
    // Calculate time progress for live events
    const timeProgress = useMemo(() => {
        if (!live || !event.endTime) return 0;
        
        const now = new Date().getTime();
        const start = new Date(event.startTime).getTime();
        const end = new Date(event.endTime).getTime();
        
        const progress = ((now - start) / (end - start)) * 100;
        return Math.min(100, Math.max(0, progress));
    }, [live, event.startTime, event.endTime]);
    
    // Generate CSS classes for event state
    const cardClasses = [
        'event-card',
        viewType,
        live ? 'live' : '',
        tracked ? 'tracked' : '',
        isVirtual ? 'virtual' : '',
        isMultiDay ? 'multi-day' : '',
        visualInfo?.isContinuingFromPreviousDay ? 'continuation-top' : '',
        visualInfo?.isContinuingToNextDay ? 'continuation-bottom' : '',
        dayNumber ? `day-${dayNumber}` : '',
        visualInfo?.span && visualInfo.span > 2 ? 'data-span-gt-2' : '',
        visualInfo?.span && visualInfo.span > 4 ? 'data-span-gt-4' : '',
        visualInfo?.span && visualInfo.span > 6 ? 'data-span-gt-6' : '',
        className
    ].filter(Boolean).join(' ');
    
    // Set up CSS variables for color and progress
    const cardStyle: React.CSSProperties = {
        ['--event-color' as string]: event.category?.color || event.color || '#6B7280',
        ['--progress' as string]: `${timeProgress}%`,
        ...style
    };
    
    // Format time display based on view type and continuation
    const getTimeDisplay = () => {
        if (viewType === 'day' && visualInfo?.isContinuingFromPreviousDay) {
            return "Continues";
        }
        return formatTime(event.startTime, event.timezone);
    };
    
    // Get organizer initial for avatar
    const getOrganizerInitial = () => {
        if (!event.organizer) return '?';
        return event.organizer.charAt(0).toUpperCase();
    };
    
    // Determine if organizer should be shown (for longer events)
    const showOrganizer = (viewType === 'day' && visualInfo?.span && visualInfo.span > 4) ||
                         (viewType === 'week' && visualInfo?.span && visualInfo.span > 6);
    
    // Show time based on view type and duration
    const showTime = viewType === 'day' || (viewType === 'week' && visualInfo?.span && visualInfo.span > 2);
    
    // Format duration if needed
    const getDuration = () => {
        if (!event.endTime || viewType !== 'week' || !visualInfo?.span || visualInfo.span < 4) return null;
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60));
        return hours > 0 ? `${hours}h` : null;
    };
    
    return (
        <div 
            style={cardStyle} 
            className={cardClasses} 
            onClick={onClick} 
            onMouseEnter={onHover} 
            onMouseLeave={onLeave}
            role="button"
            tabIndex={0}
            aria-label={`${event.title} event`}
            data-day={dayNumber && isMultiDay ? `${dayNumber}/${visualInfo?.totalDays}` : undefined}
            data-virtual={isVirtual ? "true" : undefined}
            data-initial={getOrganizerInitial()}
        >
            {/* Status indicators */}
            {live && <span className="status-indicator live-dot" aria-label="Live now" />}
            {tracked && <Star className="status-indicator tracked-icon" size={10} />}
            
            {/* Multi-day badge */}
            {dayNumber && isMultiDay && viewType === 'week' && (
                <span className="day-badge">
                    {dayNumber}/{visualInfo?.totalDays}
                </span>
            )}
            
            {/* Main content */}
            <div className="event-content">
                <div className="event-title" title={event.title}>
                    {event.title}
                </div>
                
                {showTime && (
                    <div className="event-time">
                        <Clock size={12} />
                        <span>{getTimeDisplay()}</span>
                        {getDuration() && (
                            <span className="duration">• {getDuration()}</span>
                        )}
                    </div>
                )}
                
                {showOrganizer && event.organizer && (
                    <div className="event-organizer">
                        <span className="organizer-avatar">{getOrganizerInitial()}</span>
                        <span className="organizer-name">{event.organizer}</span>
                    </div>
                )}
                
                {/* Location/Virtual for very long events */}
                {viewType === 'week' && visualInfo?.span && visualInfo.span > 8 && (
                    <div className="event-location">
                        {isVirtual ? (
                            <>
                                <Video size={10} />
                                <span>Virtual</span>
                            </>
                        ) : event.location ? (
                            <>
                                <MapPin size={10} />
                                <span>{event.location}</span>
                            </>
                        ) : null}
                    </div>
                )}
            </div>
            
            {/* Continuation indicators */}
            {visualInfo?.isContinuingFromPreviousDay && (
                <span className="continuation-indicator top">⋯</span>
            )}
            {visualInfo?.isContinuingToNextDay && (
                <span className="continuation-indicator bottom">⋯</span>
            )}
            
            {/* Progress bar for live events */}
            {live && <div className="progress-bar" />}
        </div>
    );
};