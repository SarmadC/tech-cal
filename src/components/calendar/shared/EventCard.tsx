// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { MaterialIcon } from '@/components/ui/Icon';
import { Event, MultiDayEventInstance, isEventTracked, AgendaItem } from '@/types';
import { isEventLive, getEventDuration } from '@/utils/dateUtils';
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
    agenda?: AgendaItem[];
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
    isOverlapping = false,
    agenda = []
}) => {
    const live = isEventLive(event.startTime, event.endTime);

    // Timeline/progress helpers
    const startDate = new Date(event.startTime);
    const assumedEndDate = event.endTime ? new Date(event.endTime) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
    const now = new Date();
    const totalMs = Math.max(assumedEndDate.getTime() - startDate.getTime(), 1);
    const elapsedMs = Math.min(Math.max(now.getTime() - startDate.getTime(), 0), totalMs);
    const progressPercent = Math.round((elapsedMs / totalMs) * 100);

    // Get appropriate location icon based on venue type
    const getLocationIcon = (location: string) => {
        const loc = location.toLowerCase();
        const iconColor = getPillColor(getCategoryColor(), 0.5); // Same as category title color
        
        // Virtual/Remote events
        if (loc.includes('remote') || loc.includes('virtual') || loc.includes('online')) {
            return <MaterialIcon name="devices" size={10} color={iconColor} />;
        }
        
        // VR/AR/Metaverse events
        if (loc.includes('vr') || loc.includes('ar') || loc.includes('metaverse') || loc.includes('virtual reality')) {
            return <MaterialIcon name="event" size={10} color={iconColor} />;
        }
        
        // Conference centers, convention halls, specific venues
        if (loc.includes('conference') || loc.includes('convention') || loc.includes('center') || loc.includes('hall') || loc.includes('expo')) {
            return <MaterialIcon name="event" size={10} color={iconColor} />;
        }
        
        // Global/worldwide events
        if (loc.includes('worldwide') || loc.includes('global') || loc.includes('international')) {
            return <MaterialIcon name="location" size={10} color={iconColor} />;
        }
        
        // Default to map pin for physical locations
        return <MaterialIcon name="location" size={10} color={iconColor} />;
    };

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

    // Helper function to create vibrant "pop" colors from pastel backgrounds
    const getPillColor = (color: string, _factor: number = 0.15) => {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const num = parseInt(hex, 16);
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            
            // Convert to HSL for better color manipulation
            const max = Math.max(r, g, b) / 255;
            const min = Math.min(r, g, b) / 255;
            const delta = max - min;
            
            let h = 0;
            if (delta !== 0) {
                if (max === r/255) h = ((g/255 - b/255) / delta) % 6;
                else if (max === g/255) h = (b/255 - r/255) / delta + 2;
                else h = (r/255 - g/255) / delta + 4;
            }
            h = Math.round(h * 60);
            if (h < 0) h += 360;
            
            const l = (max + min) / 2;
            const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
            
            // Create vibrant pop color: increase saturation dramatically and adjust lightness
            const newS = Math.min(0.45, s * 2.5); // Much higher saturation
            const newL = Math.max(0.10, Math.min(0.55, l * 0.5)); // Darker but not too dark
            
            // Convert back to RGB
            const c = (1 - Math.abs(2 * newL - 1)) * newS;
            const x = c * (1 - Math.abs((h / 60) % 2 - 1));
            const m = newL - c / 2;
            
            let rNew = 0, gNew = 0, bNew = 0;
            if (h >= 0 && h < 60) { rNew = c; gNew = x; bNew = 0; }
            else if (h >= 60 && h < 120) { rNew = x; gNew = c; bNew = 0; }
            else if (h >= 120 && h < 180) { rNew = 0; gNew = c; bNew = x; }
            else if (h >= 180 && h < 240) { rNew = 0; gNew = x; bNew = c; }
            else if (h >= 240 && h < 300) { rNew = x; gNew = 0; bNew = c; }
            else if (h >= 300 && h < 360) { rNew = c; gNew = 0; bNew = x; }
            
            const finalR = Math.round((rNew + m) * 255);
            const finalG = Math.round((gNew + m) * 255);
            const finalB = Math.round((bNew + m) * 255);
            
            return `#${finalR.toString(16).padStart(2, '0')}${finalG.toString(16).padStart(2, '0')}${finalB.toString(16).padStart(2, '0')}`;
        }
        // For other color formats, create a more vibrant version
        return `color-mix(in srgb, ${color} 40%, hsl(var(--hue, 220) 85% 45%))`;
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
        ['--category-title-color' as string]: getPillColor(getCategoryColor(), 0.5),    
        backgroundColor: getCategoryColor(),
        ...style
    };



    // Week view specific content display - DYNAMIC based on card size
    const cardSize = visualInfo?.span || 1;
    const isWeekView = viewType === 'week';
    const isDayView = viewType === 'day';
    const isCompact = isWeekView && cardSize <= 2;
    const isDense = isWeekView && cardSize <= 4;
    const isExtraLarge = cardSize > 8;

    const showTimelineRail = (isWeekView && cardSize >= 3) || (isDayView && cardSize >= 8);

    // Group agenda by day and get today's highlights
    const agendaByDay = agenda?.reduce((acc, item) => {
        const dayNum = item.dayNumber || 1; // Default to day 1 if not specified
        if (!acc[dayNum]) {
            acc[dayNum] = [];
        }
        acc[dayNum].push(item);
        return acc;
    }, {} as Record<number, typeof agenda>) || {};

    // Determine which day's agenda to show
    let currentDayNumber = 1; // Default to day 1
    
    // For multi-day event instances, use the actual day number
    if ('isInstance' in event && event.isInstance && event.dayInfo) {
        currentDayNumber = event.dayInfo.currentDay;
    }
    

    
    // Get the correct day's agenda items
    const todayAgenda = agendaByDay[currentDayNumber] || [];
    const keyAgendaItems = todayAgenda
        .filter(item => {
            // Show key agenda items: keynotes, sessions, workshops, panels, and major events
            const keyTypes = ['keynote', 'session', 'workshop', 'panel', 'entertainment', 'networking'];
            return item?.type && keyTypes.includes(item.type);
        })
        .sort((a, b) => {
            // Sort by start time
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        })
        .slice(0, 4); // Show top 4 items



    // Day view specific content display
    const showDayTime = isDayView;
    const showDayDuration = isDayView;
    const showDayLocation = isDayView && event.location;
    const showDayOrganizer = isDayView && event.organizer;
    const showDayDescription = isDayView && cardSize >= 6 && event.description; // Show description for medium+ day cards
    
    // Small cards: Basic info only
    // Show location for medium and larger cards (span > 4)
    const showWeekLocation = viewType === 'week' && cardSize > 4;
    const showWeekOrganizer = viewType === 'week' && cardSize >= 6;
    
    // Medium cards: Add progress indicators
    const showWeekProgress = viewType === 'week' && cardSize >= 3;
    
    // Large cards: Add description and tags (but not for multi-day events in week view)
    const showWeekDescription = viewType === 'week' && cardSize >= 8 && !('isMultiDay' in event && event.isMultiDay);

    return (
        <div
            style={cardStyle}
            className={`${cardClasses} ${isCompact ? 'compact' : ''} ${isDense ? 'dense' : ''}`}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            tabIndex={0}
            role="button"
            aria-label={`Event: ${event.title}${event.location ? ` at ${event.location}` : ''}${event.organizer ? ` by ${event.organizer}` : ''}`}
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
                        showForLargeEvents={true}
                    />
                </div>

                {/* Day view specific content - Time, Duration, Location */}
                {isDayView && (
                    <div className="event-day-meta">
                        {/* Event Tags - show only for medium+ cards (span 5+) in day view */}
                        {event.tags && event.tags.length > 0 && (
                            <div className="event-tags-section">
                                <div className="event-tags-row">
                                    {/* Deduplicate tags by name to avoid showing the same tag multiple times */}
                                    {event.tags
                                        .filter((tag, index, self) => 
                                            index === self.findIndex(t => t.name === tag.name)
                                        )
                                        .slice(0, 2) // Limit to 2 tags for day view
                                        .map((tag, index) => (
                                            <React.Fragment key={index}>
                                                {/* Tag Name */}
                                                <span 
                                                    className="event-session-type"
                                                    style={{ 
                                                        backgroundColor: getPillColor(getCategoryColor(), 0.3),
                                                        color: 'white'
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            </React.Fragment>
                                        ))}
                                    {/* Add +n indicator if there are more than 2 tags */}
                                    {event.tags.filter((tag, index, self) => 
                                        index === self.findIndex(t => t.name === tag.name)
                                    ).length > 2 && (
                                        <span 
                                            className="event-session-type"
                                            style={{ 
                                                backgroundColor: getPillColor(getCategoryColor(), 0.3),
                                                color: 'white'
                                            }}
                                        >
                                            +{event.tags.filter((tag, index, self) => 
                                                index === self.findIndex(t => t.name === tag.name)
                                            ).length - 2}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        
                                                 {/* Time and Duration */}
                         <div className="event-time-duration">
                             {showDayTime && (
                                 <span className="event-time">
                                     {new Date(event.startTime).toLocaleTimeString('en-US', { 
                                         hour: 'numeric', 
                                         minute: '2-digit', 
                                         hour12: true 
                                     })}
                                     {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString('en-US', { 
                                         hour: 'numeric', 
                                         minute: '2-digit', 
                                         hour12: true 
                                     })}`}
                                 </span>
                             )}
                            {showDayDuration && (
                                <span className="event-duration">
                                    • {getEventDuration(event.startTime, event.endTime)}
                                </span>
                            )}
                        </div>
                        
                        {/* Location and Organizer */}
                        {(showDayLocation || showDayOrganizer) && (
                            <div className="event-location-organizer">
                                {showDayLocation && (
                                    <span className="event-location">
                                        {getLocationIcon(event.location)}
                                        {event.location}
                                    </span>
                                )}
                                {showDayOrganizer && (
                                    <span className="event-organizer">
                                        <MaterialIcon name="building" size={10} color={getPillColor(getCategoryColor(), 0.5)} />
                                        {event.organizer}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Multi-day day indicator - subtle dots - only show for multi-day events */}
                {'dayInfo' in event && event.dayInfo && event.dayInfo.totalDays > 1 && (
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
                            width={18}
                            height={18}
                            className="organizer-logo-corner-image"
                            onError={(e) => {
                                // Silently handle logo loading errors without console spam
                                e.currentTarget.style.display = 'none';
                            }}
                            onLoad={(e) => {
                                // Ensure logo is visible when it loads successfully
                                e.currentTarget.style.display = 'block';
                            }}
                        />
                    </div>
                )}


                {/* Event Tags Display - only for week view */}
                {event.tags && event.tags.length > 0 && viewType === 'week' && (
                    <div className="event-tags-section">
                        <div className="event-tags-row">
                            {/* Deduplicate tags by name to avoid showing the same tag multiple times */}
                            {event.tags
                                .filter((tag, index, self) => 
                                    index === self.findIndex(t => t.name === tag.name)
                                )
                                .slice(0, 2)
                                .map((tag) => (
                                    <span 
                                        key={tag.id}
                                        className="event-session-type"
                                        style={{ 
                                            backgroundColor: getPillColor(getCategoryColor(), 0.3),
                                            color: 'white'
                                        }}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            {/* Add +n indicator if there are more than 2 tags */}
                            {event.tags.filter((tag, index, self) => 
                                index === self.findIndex(t => t.name === tag.name)
                            ).length > 2 && (
                                <span 
                                    className="event-session-type"
                                    style={{ 
                                        backgroundColor: getPillColor(getCategoryColor(), 0.3),
                                        color: 'white'
                                    }}
                                >
                                    +{event.tags.filter((tag, index, self) => 
                                        index === self.findIndex(t => t.name === tag.name)
                                    ).length - 2}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Event description - show for both week and day views when appropriate */}
                {(showWeekDescription || showDayDescription) && event.description && (
                    <div className="event-description">
                        <span>{event.description.length > 120 ? `${event.description.substring(0, 120)}...` : event.description}</span>
                    </div>
                )}

                {/* Rich agenda timeline for extra large cards (both day and week view) */}
                {isExtraLarge && (
                    <div className="event-agenda-timeline">
                        <div className="agenda-timeline-container">
                            {keyAgendaItems.length > 0 ? (
                               keyAgendaItems.map((item, index) => (
                                   <div key={item.id} className="agenda-timeline-item">
                                       <div className="timeline-time">
                                            {item.startTime}
                                       </div>
                                       <div className="timeline-connector">
                                           <div className="timeline-dot"></div>
                                           {index < keyAgendaItems.length - 1 && <div className="timeline-line"></div>}
                                       </div>
                                       <div className="timeline-content">
                                           <div className="timeline-title">{item.description || item.title}</div>
                                       </div>
                                   </div>
                               ))
                            ) : (
                                <div className="timeline-no-data">
                                    <div className="timeline-time">--:--</div>
                                    <div className="timeline-connector">
                                        <div className="timeline-dot"></div>
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-title">Agenda Loading...</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Basic location and organizer */}
                <div className="event-info">
                    {showWeekLocation && event.location && (
                        <span className="event-location-text">
                            {getLocationIcon(event.location)}
                            {event.location}
                        </span>
                    )}
                    {showWeekOrganizer && event.organizer && (
                        <span className="event-organizer-text">
                            <MaterialIcon name="building" size={10} color={getPillColor(getCategoryColor(), 0.5)} />
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


            {/* Day view content - time removed since calendar grid already shows time slots */}
            </div>
        </div>
    );
};