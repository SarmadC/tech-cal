// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { MaterialIcon } from '@/components/ui/Icon';
import { Event, MultiDayEventInstance, isEventTracked } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { isEventLive, isEventPast } from '@/utils/dateUtils';
import { isMultiDayEvent, getMultiDayDuration } from '@/utils/eventUtils';
import { CareerImpactIndicator } from '@/components/ui/career-impact-tooltip';
import { CareerImpactBadge } from '@/components/ui/career-impact-badge';

export interface EventCardProps {
    event: Event | MultiDayEventInstance | (Event & { careerImpactLite?: CareerImpactScoreLite });
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
    showCareerImpact?: boolean;
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
    showCareerImpact = true
}) => {

    const live = isEventLive(event.startTime, event.endTime);
    const isPast = isEventPast(event.startTime, event.endTime);

    // Week view specific content display - DYNAMIC based on card size
    const cardSize = visualInfo?.span || 1;
    const isWeekView = viewType === 'week';
    const isDayView = viewType === 'day';


    // Size bucket helper derived from span
    const getSizeBucket = (span: number) => {
        if (span <= 2) return 'compact' as const;
        if (span <= 4) return 'small' as const;
        if (span <= 6) return 'medium' as const;
        if (span <= 8) return 'large' as const;
        return 'xl' as const;
    };

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

    // Multi-day dots helper
    const getMultiDayDots = () => {
        // Check if this is a multi-day event instance
        if ('isInstance' in event && event.isInstance) {
            const instance = event as MultiDayEventInstance;
            if (instance.dayInfo) {
                const { currentDay, totalDays } = instance.dayInfo;
                const maxDots = Math.min(totalDays, 5); // Max 5 dots
                
                return (
                    <div className="multi-day-dots">
                        {Array.from({ length: maxDots }, (_, i) => (
                            <div 
                                key={i} 
                                className={`multi-day-dot ${i < currentDay ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                );
            }
        }
        
        // Fallback for regular multi-day events
        if (isMultiDayEvent(event)) {
            const totalDays = Math.min(getMultiDayDuration(event), 5); // Max 5 dots
            
            return (
                <div className="multi-day-dots">
                    {Array.from({ length: totalDays }, (_, i) => (
                        <div key={i} className="multi-day-dot" />
                    ))}
                </div>
            );
        }
        
        return null;
    };

    // Get category-based background color from the event type
    const getCategoryColor = () => {
        // First priority: Use the event type color from the database
        if (event.category?.color) {
            return event.category.color;
        }
        
        // Second priority: Use the direct color property (for backwards compatibility)
        if (event.color) {
            return event.color;
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
        'glass-card', // Add glass card effect
        viewType === 'week' ? 'week-view' : '', // Add week-view class for week view
        live ? 'live' : '',
        isPast ? 'past completed-event' : '',
        isEventTracked(event) ? 'tracked' : '',
        isOverlapping ? 'overlapping' : '',
        event.category?.name?.toLowerCase().replace(/\s+/g, '-') || 'default', // Add category class
        className
    ].filter(Boolean).join(' ');

    // Set up CSS variables for the new design
    const cardStyle: React.CSSProperties = {
        ...style
    };


    const sizeBucket = getSizeBucket(cardSize);
    const isCompact = isWeekView && cardSize <= 2;
    const isDense = isWeekView && cardSize <= 4;
    const isExtraLarge = cardSize > 8;

    const showTimelineRail = isDayView && cardSize >= 8;




    // Day view specific content display
    const showDayTime = isDayView;
    // Hide duration for medium (5–6) and extra-large (>8) day cards to match CSS
    const _showDayDuration = isDayView && !((cardSize >= 5 && cardSize <= 6) || (cardSize > 8));
    const showDayLocation = isDayView && event.location;
    const showDayOrganizer = isDayView && event.organizer;
    
    // Small cards: Basic info only
    // Show location for medium and larger cards (span > 4)
    const showWeekLocation = viewType === 'week' && cardSize > 4;
    const showWeekOrganizer = viewType === 'week' && cardSize >= 5;
    
    // Medium cards: Add progress indicators
    const showWeekProgress = viewType === 'week' && cardSize >= 3;
    

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
                    <div className="flex items-start justify-between">
                        <h3 className="event-title flex-1">{event.title}</h3>
                        {/* Career Impact Display */}
                        {showCareerImpact && (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite && (
                            <div className="flex-shrink-0 ml-2">
                                {cardSize >= 6 ? (
                                    <CareerImpactBadge 
                                        score={(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!}
                                        variant="compact"
                                        showTooltip={true}
                                        className="text-xs"
                                    />
                                ) : (
                                    <CareerImpactIndicator 
                                        score={(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall}
                                        size={viewType === 'week' ? 'sm' : 'md'}
                                        showValue={cardSize >= 4}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
                

                {/* Day view specific content - Time, Duration, Location */}
                {isDayView && (
                    <div className="event-day-meta">
                        {/* Event Tags - show only for medium+ cards (span 5+) in day view */}
                        {cardSize >= 5 && event.tags && event.tags.length > 0 && (
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
                                     }).toLowerCase()}
                                     {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString('en-US', { 
                                         hour: 'numeric', 
                                         minute: '2-digit', 
                                         hour12: true 
                                     }).toLowerCase()}`}
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
                {viewType === 'week' && cardSize >= 3 && event.tags && event.tags.length > 0 && (
                    <div className="event-tags-section">
                        <div className="event-tags-row">
                            {/* Deduplicate tags by name to avoid showing the same tag multiple times */}
                            {event.tags
                                .filter((tag, index, self) => 
                                    index === self.findIndex(t => t.name === tag.name)
                                )
                                .slice(0, (sizeBucket === 'small' ? 1 : 2))
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
                            {(() => {
                                const uniqueCount = event.tags.filter((tag, index, self) => index === self.findIndex(t => t.name === tag.name)).length;
                                const limit = sizeBucket === 'small' ? 1 : 2;
                                return uniqueCount > limit;
                            })() && (
                                <span 
                                    className="event-session-type"
                                    style={{ 
                                        backgroundColor: getPillColor(getCategoryColor(), 0.3),
                                        color: 'white'
                                    }}
                                >
                                    +{(() => {
                                        const uniqueCount = event.tags.filter((tag, index, self) => index === self.findIndex(t => t.name === tag.name)).length;
                                        const limit = sizeBucket === 'small' ? 1 : 2;
                                        return uniqueCount - limit;
                                    })()}
                                </span>
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
                    </div>
                )}
            </div>

            {/* Tier 3: Rich Content (4+ hour events) */}
            <div className="event-card-rich-content">
                {/* Career Impact Explanation for Extra Large Cards */}
                {showCareerImpact && isExtraLarge && (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite && (
                    <div className="career-impact-explanation">
                        <div className="flex items-center gap-2 mb-2">
                            <MaterialIcon name="trending-up" size={12} color="var(--foreground-secondary)" />
                            <span className="text-xs font-medium text-gray-600">Career Impact</span>
                        </div>
                        <div className="career-impact-details">
                            <div className="flex items-center justify-between mb-1">
                                <CareerImpactBadge 
                                    score={(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!}
                                    variant="detailed"
                                    className="text-xs"
                                />
                            </div>
                            <div className="career-impact-reasons text-xs text-gray-600 mt-1">
                                <div className="flex items-start gap-1">
                                    <span className="text-green-500 mt-0.5">•</span>
                                    <span>High relevance to your career goals</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tier 4: Premium Content (6+ hour events) - only show if we have rich data */}
            <div className="event-card-premium-content">
                {/* Additional premium content can go here */}
            </div>


            {/* Day view content - time removed since calendar grid already shows time slots */}
            </div>

            {/* Multi-day dots */}
            {getMultiDayDots()}
        </div>
    );
};