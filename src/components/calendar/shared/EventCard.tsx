// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Clock, MapPin, User } from 'lucide-react';
import { Event, MultiDayEventInstance, isEventTracked } from '@/types';
import { isEventLive, formatTime } from '@/utils/dateUtils';
import { LearnMoreButton } from './LearnMoreButton';

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

    // Timeline/progress helpers
    const startDate = new Date(event.startTime);
    const assumedEndDate = event.endTime ? new Date(event.endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const now = new Date();
    const totalMs = Math.max(assumedEndDate.getTime() - startDate.getTime(), 1);
    const elapsedMs = Math.min(Math.max(now.getTime() - startDate.getTime(), 0), totalMs);
    const progressPercent = Math.round((elapsedMs / totalMs) * 100);

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

    // Helper function to create a moderately darker shade of the event color for tags
    const getPillColor = (color: string, factor: number = 0.15) => {
        // Handle hex colors - make them slightly darker but not too dark
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const num = parseInt(hex, 16);
            const r = Math.floor((num >> 16) * (1 - factor));
            const g = Math.floor(((num >> 8) & 0x00FF) * (1 - factor));
            const b = Math.floor((num & 0x0000FF) * (1 - factor));
            return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
        }
        // For other color formats, use CSS color-mix to make slightly darker
        return `color-mix(in srgb, ${color} 85%, black)`;
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

    // Week view specific content display - DYNAMIC based on card size
    const cardSize = visualInfo?.span || 1;
    const isWeekView = viewType === 'week';
    const isCompact = isWeekView && cardSize <= 2;
    const isDense = isWeekView && cardSize <= 4;

    const showTimelineRail = isWeekView && cardSize >= 3;


    
    // Small cards: Basic info only
    const showWeekLocation = viewType === 'week' && cardSize >= 4;
    const showWeekOrganizer = viewType === 'week' && cardSize >= 6;
    
    // Medium cards: Add progress indicators
    const showWeekProgress = viewType === 'week' && cardSize >= 3;
    
    // Large cards: Add description and tags
    const showWeekDescription = viewType === 'week' && cardSize >= 8;

    return (
        <div
            style={cardStyle}
            className={`${cardClasses} ${isCompact ? 'compact' : ''} ${isDense ? 'dense' : ''}`}
            onClick={onClick}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            data-span={cardSize}
            data-span-gt-2={cardSize > 2 || undefined}
            data-span-gt-4={cardSize > 4 || undefined}
            data-span-gt-6={cardSize > 6 || undefined}
            data-span-gt-8={cardSize > 8 || undefined}
            data-span-gt-10={cardSize > 10 || undefined}
            data-span-gt-12={cardSize > 12 || undefined}
        >

            {/* Left timeline rail */}
            {showTimelineRail && (
                <div className={`event-left-rail ${live ? 'live' : ''}`} aria-hidden="true">
                    <div className="rail-track">
                        <div className="rail-fill" style={{ height: `${progressPercent}%` }} />
                        {live && <div className="rail-dot" style={{ bottom: `${100 - progressPercent}%` }} />}
                    </div>
                </div>
            )}

            <div className="event-content">
                {/* Enhanced Content Tiers */}
                            {/* Tier 1: Basic Info (Always Visible) */}
            <div className="event-card-basic-info">
                {/* Top section: No longer needed since logo moved to bottom-left corner */}

                {/* Main title section */}
                <div className="event-title-section">
                    <h3 className="event-title">{event.title}</h3>
                </div>
                
                {/* Arrow icon in top-right corner */}
                <div className="event-arrow-corner">
                    <LearnMoreButton 
                        onClick={onClick} 
                        showForLargeEvents={cardSize >= 4}
                    />
                </div>

                {/* Multi-day day indicator - subtle dots */}
                {'dayInfo' in event && event.dayInfo && (
                    <div className="event-day-dots">
                        {Array.from({ length: event.dayInfo.totalDays }, (_, i) => (
                            <div 
                                key={i}
                                className={`day-dot ${i + 1 === event.dayInfo!.currentDay ? 'active' : ''}`}
                                style={{ 
                                    backgroundColor: i + 1 === event.dayInfo!.currentDay 
                                        ? getPillColor(getCategoryColor(), 0.4)
                                        : getPillColor(getCategoryColor(), 0.15)
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Organizer logo in bottom-left corner */}
                {event.organization?.logo && (
                    <div className="event-organizer-logo-corner">
                        <Image
                            src={event.organization.logo}
                            alt={`${event.organization.name} logo`}
                            width={24}
                            height={24}
                            className="organizer-logo-corner-image"
                            onError={(e) => {
                                console.error('Failed to load organizer logo:', event.organization?.logo);
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    </div>
                )}


                {/* Tag Name and Category Display - show both on same line */}
                {event.tags && event.tags.length > 0 && (
                    <div className="event-tags-section">
                        <div className="event-tags-row">
                            {/* Deduplicate tags by name to avoid showing the same tag multiple times */}
                            {event.tags
                                .filter((tag, index, self) => 
                                    index === self.findIndex(t => t.name === tag.name)
                                )
                                .slice(0, 2)
                                .map((tag) => (
                                    <React.Fragment key={tag.id}>
                                        {/* Tag Name (Session Type) */}
                                        <span 
                                            className="event-session-type"
                                            style={{ 
                                                backgroundColor: getPillColor(getCategoryColor(), 0.3),
                                                color: 'white'
                                            }}
                                        >
                                            {tag.name}
                                        </span>
                                        {/* Category */}
                                        <span 
                                            className="event-category-pill"
                                            style={{ 
                                                backgroundColor: getPillColor(getCategoryColor(), 0.3),
                                                color: 'white'
                                            }}
                                        >
                                            {tag.category.toUpperCase()}
                                        </span>
                                    </React.Fragment>
                                ))}
                        </div>
                    </div>
                )}

                {/* Event description - moved to top for better hierarchy */}
                {showWeekDescription && event.description && (
                    <div className="event-description">
                        <span>{event.description.length > 80 ? `${event.description.substring(0, 80)}...` : event.description}</span>
                    </div>
                )}

                {/* Basic location and organizer */}
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
            </div>

            {/* Tier 2: Extended Info (2+ hour events) - Multi-day progress only */}
            <div className="event-card-extended-info">
                {showWeekProgress && ('isMultiDay' in event && event.isMultiDay && event.multiDaySpan && event.multiDaySpan > 1) && (
                    <div className="multi-day-progress">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '20%' }} />
                        </div>
                        <div className="day-counter">Day 1 of {event.multiDaySpan}</div>
                    </div>
                )}
            </div>

            {/* Tier 3: Rich Content (4+ hour events) */}
            <div className="event-card-rich-content">
                {/* Additional content for larger cards can go here */}
            </div>

            {/* Tier 4: Premium Content (6+ hour events) - only show if we have rich data */}
            <div className="event-card-premium-content">
                {/* Additional premium content can go here */}
            </div>

            {/* Removed duplicate bottom section - location and organizer already shown above */}

            {/* Removed redundant facts row - location and organizer already shown above */}

            {/* Additional content for larger cards - cleaned up */}

            {/* Day view content - only show time for day view */}
            {viewType === 'day' && (
                <div className="event-meta">
                    <div className="event-time">
                        <Clock size={14} />
                        <span>{getTimeDisplay()}</span>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};