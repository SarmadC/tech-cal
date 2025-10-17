// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { MaterialIcon } from '@/components/ui/Icon';
import { Event, MultiDayEventInstance, isEventTracked } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { isEventLive, isEventPast } from '@/utils/dateUtils';
import { isMultiDayEvent, getMultiDayDuration, getCategoryColor } from '@/utils/eventUtils';
// Career impact components removed - using inline implementation
import { getPillColor } from '@/utils/pillColorUtils';

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

    // Get category color for this event
    const categoryColor = getCategoryColor(event);
    const titleColor = getPillColor(categoryColor, 0.5);

    // Get appropriate location icon based on venue type
    const getLocationIcon = (location: string) => {
        const loc = location.toLowerCase();
        const iconColor = titleColor; // Same as category title color

        // Virtual/Remote events
        if (loc.includes('remote') || loc.includes('virtual') || loc.includes('online')) {
            return <MaterialIcon name="devices" size={10} color={iconColor} />;
        }

        // VR/AR/Metaverse events
        if (loc.includes('vr') || loc.includes('ar') || loc.includes('metaverse') || loc.includes('virtual reality')) {
            return <MaterialIcon name="event" size={10} color={iconColor} />;
        }

        // Global/worldwide events (no specific location)
        if (loc.includes('worldwide') || loc.includes('global') || loc.includes('international')) {
            return <MaterialIcon name="location" size={10} color={iconColor} />;
        }

        // Default to map pin for all physical locations (including conference centers, venues, etc.)
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

    // Generate CSS classes for event state
    const cardClasses = [
        'event-card',
        'event-card-v8',
        viewType === 'week' ? 'week-view' : '',
        live ? 'live' : '',
        isPast ? 'past completed-event' : '',
        isEventTracked(event) ? 'tracked' : '',
        isOverlapping ? 'overlapping' : '',
        event.category?.name?.toLowerCase().replace(/\s+/g, '-') || 'default', // Add category class
        className
    ].filter(Boolean).join(' ');

    // Set up CSS variables for the new design
    const cardStyle: React.CSSProperties = {
        ...style,
        '--category-title-color': titleColor,
        '--text-on-pastel': titleColor,
        '--text-secondary-on-pastel': titleColor
    } as React.CSSProperties;


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
                                <div className="flex items-center gap-1">
                                    <div className={`
                                        w-2 h-2 rounded-full
                                        ${(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 80 ? 'bg-green-400' :
                                          (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 50 ? 'bg-blue-400' :
                                          (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 20 ? 'bg-yellow-400' : 'bg-gray-400'}
                                    `} />
                                    {cardSize >= 4 && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {Math.round((event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall)}%
                                        </span>
                                    )}
                                </div>
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
                                                        backgroundColor: getPillColor(categoryColor, 0.3),
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
                                                backgroundColor: getPillColor(categoryColor, 0.3),
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
                                        <MaterialIcon name="building" size={10} color={titleColor} />
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
                                            backgroundColor: getPillColor(categoryColor, 0.3),
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
                                        backgroundColor: getPillColor(categoryColor, 0.3),
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
                            <MaterialIcon name="building" size={10} color={titleColor} />
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
                                <div className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md">
                                    <div className={`
                                        w-2 h-2 rounded-full
                                        ${(event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 80 ? 'bg-green-400' :
                                          (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 50 ? 'bg-blue-400' :
                                          (event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall >= 20 ? 'bg-yellow-400' : 'bg-gray-400'}
                                    `} />
                                    <span className="text-xs font-medium">
                                        {Math.round((event as Event & { careerImpactLite?: CareerImpactScoreLite }).careerImpactLite!.overall)}% Match
                                    </span>
                                </div>
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