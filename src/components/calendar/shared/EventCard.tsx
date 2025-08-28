// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import { Clock, MapPin, User } from 'lucide-react';
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

    // Determine what content to show based on view type and event span
    const showOrganizer = viewType === 'day' && visualInfo?.span && visualInfo.span > 4;
    const showLocation = viewType === 'day' && visualInfo?.span && visualInfo.span > 6;
    const showCategory = viewType === 'week' || (viewType === 'day' && visualInfo?.span && visualInfo.span > 2);
    
    // Week view specific content display - DYNAMIC based on card size
    const cardSize = visualInfo?.span || 1;
    
    // Small cards: Basic info only
    const showWeekTime = viewType === 'week' && cardSize >= 2;
    const showWeekLocation = viewType === 'week' && cardSize >= 4;
    const showWeekOrganizer = viewType === 'week' && cardSize >= 6;
    
    // Medium cards: Add progress indicators
    const showWeekProgress = viewType === 'week' && cardSize >= 3;
    
    // Large cards: Add description and tags
    const showWeekDescription = viewType === 'week' && cardSize >= 8;
    const showWeekTags = viewType === 'week' && cardSize >= 10;
    
    // Extra large cards: Show full event details
    const showWeekFullDetails = viewType === 'week' && cardSize >= 12;

    return (
        <div
            style={cardStyle}
            className={cardClasses}
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            {/* Top section: Category badge and time */}
            <div className="event-top-section">
                {showCategory && event.category?.name && (
                    <span className="event-category-badge">{event.category.name}</span>
                )}
                {showWeekTime && (
                    <span className="event-time-badge">{getTimeDisplay()}</span>
                )}
            </div>

            {/* Main title section */}
            <div className="event-title-section">
                <h3 className="event-title">{event.title}</h3>
                <div className="event-arrow" title="Learn More">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </div>
            </div>

            {/* Progress indicators for multi-day events */}
            {showWeekProgress && ('isMultiDay' in event && event.isMultiDay && event.multiDaySpan && event.multiDaySpan > 1) && (
                <div className="event-progress-dots">
                    {Array.from({ length: Math.min(event.multiDaySpan, 5) }, (_, i) => (
                        <span 
                            key={i} 
                            className={`progress-dot ${i === 0 ? 'active' : ''}`}
                            style={{ 
                                backgroundColor: i === 0 ? 'var(--text-on-pastel)' : 'rgba(255, 255, 255, 0.3)'
                            }}
                        />
                    ))}
                    {event.multiDaySpan > 5 && (
                        <span className="progress-dot-more">+{event.multiDaySpan - 5}</span>
                    )}
                </div>
            )}

            {/* Bottom section: Location, organizer, and logo */}
            <div className="event-bottom-section">
                <div className="event-info">
                    {showWeekLocation && event.location && (
                        <span className="event-location-text">
                            <MapPin size={10} />
                            {event.location}
                        </span>
                    )}
                    {showWeekOrganizer && event.organizer && (
                        <span className="event-organizer-text">
                            <User size={10} />
                            {event.organizer}
                        </span>
                    )}
                </div>
                
                {/* Organization logo */}
                {event.organization?.logo && (
                    <div className="event-organization-logo">
                        <img 
                            src={event.organization.logo} 
                            alt={event.organization.name || 'Organization'} 
                            className="org-logo"
                        />
                    </div>
                )}
            </div>

            {/* Additional content for larger cards */}
            {showWeekDescription && event.description && (
                <div className="event-description">
                    <span>{event.description.length > 80 ? `${event.description.substring(0, 80)}...` : event.description}</span>
                </div>
            )}

            {showWeekTags && event.tags && event.tags.length > 0 && (
                <div className="event-tags">
                    {event.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="event-tag">
                            {tag.name}
                        </span>
                    ))}
                    {event.tags.length > 2 && (
                        <span className="event-tag-more">+{event.tags.length - 2}</span>
                    )}
                </div>
            )}

            {showWeekFullDetails && (
                <div className="event-full-details">
                    {event.priceRange && (
                        <div className="event-price">
                            <span>💰 {event.priceRange}</span>
                        </div>
                    )}
                    {event.capacity && (
                        <div className="event-capacity">
                            <span>👥 {event.capacity}</span>
                        </div>
                    )}
                    {event.difficulty && (
                        <div className="event-difficulty">
                            <span>📚 {event.difficulty}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Day view content (existing logic) */}
            {viewType === 'day' && (
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
            )}
        </div>
    );
};