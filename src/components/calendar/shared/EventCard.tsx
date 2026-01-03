// src/components/calendar/shared/EventCard.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { MaterialIcon } from '@/components/ui/Icon';
import { Event, MultiDayEventInstance, isEventTracked } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { isEventLive, isEventPast, formatTime } from '@/utils/dateUtils';
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
    isCompressed?: boolean;
    isSummary?: boolean;
    /** Number of overlapping events in this time slot (for badge display) */
    overlapCount?: number;
    /** Hidden events for "+N more" badge display */
    hiddenEvents?: (Event | MultiDayEventInstance)[];
    /** Callback when badge is clicked */
    onBadgeClick?: (e: React.MouseEvent) => void;
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
    showCareerImpact = true,
    isCompressed = false,
    isSummary = false,
    overlapCount = 0,
    hiddenEvents = [],
    onBadgeClick
}) => {

    const live = isEventLive(event.startTime, event.endTime);
    const isPast = isEventPast(event.startTime, event.endTime);

    // Unified card size logic
    const cardSize = visualInfo?.span || 1;
    // We treat all views as "week view" style for consistency
    const isWeekView = true;
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

    // Helper to convert hex to rgba for the semi-transparent background
    // Uses color-mix for better compatibility with CSS variables
    const getTransparentColor = (color: string, opacity: number) => {
        if (!color) return 'rgba(59, 130, 246, 0.2)';

        // Use modern CSS color-mix
        const transparencyPercent = Math.round((1 - opacity) * 100);
        return `color-mix(in srgb, ${color}, transparent ${transparencyPercent}%)`;
    };

    const bgColor = getTransparentColor(categoryColor, 0.15); // 15% opacity for background

    // Get appropriate location icon based on venue type
    const getLocationIcon = (location: string) => {
        const loc = location.toLowerCase();
        const iconColor = titleColor; // Same as category title color

        // Virtual/Remote events
        if (loc.includes('remote') || loc.includes('virtual') || loc.includes('online')) {
            return <MaterialIcon name="devices" size={12} color={iconColor} />;
        }

        // VR/AR/Metaverse events
        if (loc.includes('vr') || loc.includes('ar') || loc.includes('metaverse') || loc.includes('virtual reality')) {
            return <MaterialIcon name="event" size={12} color={iconColor} />;
        }

        // Global/worldwide events (no specific location)
        if (loc.includes('worldwide') || loc.includes('global') || loc.includes('international')) {
            return <MaterialIcon name="location" size={12} color={iconColor} />;
        }

        // Default to map pin for all physical locations (including conference centers, venues, etc.)
        return <MaterialIcon name="location" size={12} color={iconColor} />;
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
        '--text-secondary-on-pastel': titleColor,
        '--category-bg': bgColor
    } as React.CSSProperties;


    const sizeBucket = getSizeBucket(cardSize);
    const isCompact = isWeekView && cardSize <= 2;
    const isDense = isWeekView && cardSize <= 4;
    const isExtraLarge = cardSize > 8;
    const isUltraLarge = cardSize > 12;

    // Layout mode for adaptive content
    const layoutMode = cardSize < 4 ? 'compact'
        : cardSize < 8 ? 'normal'
            : cardSize < 12 ? 'expanded'
                : 'full';

    const showTimelineRail = isDayView && cardSize >= 8;

    // Time displays - Linear/Notion style: remove redundant time text
    // Unified: grid position already communicates time, so hide time text completely generally
    // Only show for very specific large day contexts if absolutely needed, but for "Weekly UI" unification we hide it
    // to match the clean "Weekly" look.
    const isNarrowEvent = isCompressed || cardSize <= 2;
    const showStartTime = false; // Unified: reliance on grid position
    const showEndTime = false;
    const startTimeFormatted = '';
    const endTimeFormatted = '';




    // Day view specific content display
    // Hide duration for medium (5–6) and extra-large (>8) day cards to match CSS
    const _showDayDuration = isDayView && !((cardSize >= 5 && cardSize <= 6) || (cardSize > 8));
    const showDayLocation = isDayView && event.location && cardSize >= 5;
    const showDayOrganizer = isDayView && event.organizer && cardSize >= 6;
    const showDayDescription = isDayView && event.description && cardSize >= 10;

    // Unified content display - Progressive disclosure based on card size
    // Small cards (span 1-2): Title only
    // Medium cards (span 3-4): Title + Location
    // Large cards (span 5+): Title + Location + Organizer
    const showLocation = !isCompressed && cardSize > 2;
    const showOrganizer = !isCompressed && cardSize > 4;

    // Medium cards: Add progress indicators
    const showProgress = !isCompressed && cardSize >= 3;


    // Refined Linear/Notion-style background - prevent bleed-through with blur and opacity
    const glassBackground = 'rgba(30, 30, 30, 0.85)'; // Increased opacity to hide grid lines

    return (
        <div
            style={{
                ...cardStyle,
                background: glassBackground,
                backdropFilter: 'blur(4px)', // Blur grid lines behind card
                WebkitBackdropFilter: 'blur(4px)', // Safari support
                borderLeft: `2px solid ${categoryColor}`, // Elegant 2px accent border
                borderTop: '1px solid rgba(255,255,255,0.08)', // Base border (crisp definition)
                borderRight: '1px solid rgba(255,255,255,0.08)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)', // Subtle top highlight
                padding: '10px 12px', // Uniform padding
                borderRadius: '4px' // Tighter radius for technical feel
            }}
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

            {/* Left timeline rail - Removed for Weekly UI consistency as requested */}

            <div className="event-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start', alignItems: 'flex-start', position: 'relative' }}>



                {/* HEAD: Title & Badges */}
                <div className="event-head-section">
                    {/* Summary state (Collapsed stack item) */}
                    {isSummary ? (
                        <div className="event-card-summary">
                            {/* Simple minimal summary */}
                            <h3 className="event-title text-sm font-semibold truncate">{event.title}</h3>
                        </div>
                    ) : (
                        /* Normal Full State */
                        <div className="event-title-block">
                            {/* Primary Title - Scaled Up */}
                            {/* Primary Title Block with Icon Lockup - Pixel-Perfect Optical Alignment */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0px' }}>
                                {/* Organizer Logo - Perfectly aligned to text cap-height */}
                                {event.organization?.logo && (
                                    <div className="event-organizer-logo-lockup" style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '16px',
                                        height: '16px', // Match text cap-height exactly
                                        flexShrink: 0,
                                        lineHeight: 0 // Remove any line-height spacing
                                    }}>
                                        <Image
                                            src={event.organization.logo}
                                            alt={`${event.organization.name} logo`}
                                            width={16}
                                            height={16}
                                            className="organizer-logo-image rounded-sm"
                                            style={{ objectFit: 'contain', display: 'block' }}
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}

                                <h3 className="event-title" style={{
                                    fontSize: '14px',
                                    fontWeight: 500, // Medium weight for punchier feel
                                    lineHeight: '1.2',
                                    color: 'rgba(255, 255, 255, 0.95)', // Off-white to avoid bloom
                                    letterSpacing: '-0.01em', // Tighter tracking for professional look
                                    paddingTop: '1px', // Optical correction for icon alignment
                                    display: '-webkit-box',
                                    WebkitLineClamp: isCompact ? 1 : 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    margin: 0,
                                    paddingLeft: 0,
                                    paddingRight: 0,
                                    paddingBottom: 0,
                                    alignSelf: 'center' // Ensure perfect vertical alignment
                                }}>
                                    {event.title}
                                </h3>
                            </div>

                            {/* Metadata Zone: Essential Event Information */}
                            {/* Clear visual hierarchy: Location first, then Organizer */}
                            {/* Icons aligned: logo (16px) and location icon (12px) should be vertically aligned */}
                            {(showLocation || showOrganizer) && (
                                <div className="event-meta-block" style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: '3px',
                                    width: '100%',
                                    marginTop: '4px'
                                }}>
                                    {/* Location - Primary Metadata */}
                                    {showLocation && event.location && (
                                        <div className="meta-item meta-location" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            gap: '6px',
                                            fontSize: '12px',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            fontWeight: 400,
                                            textAlign: 'left',
                                            width: '100%',
                                            minWidth: 0,
                                            lineHeight: '1.2',
                                            paddingLeft: '0px' // Icons align, text will be offset
                                        }}>
                                            <span className="meta-icon-wrapper" style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                lineHeight: 0,
                                                verticalAlign: 'middle',
                                                width: '16px', // Match logo width for alignment
                                                height: '16px',
                                                marginLeft: '0px'
                                            }}>
                                                {getLocationIcon(event.location)}
                                            </span>
                                            <span className="truncate" style={{
                                                textAlign: 'left',
                                                display: 'inline-block',
                                                width: '100%',
                                                minWidth: 0,
                                                flex: '1 1 auto',
                                                lineHeight: '1.2',
                                                verticalAlign: 'middle'
                                            }}>{event.location}</span>
                                        </div>
                                    )}

                                    {/* Organizer - Secondary Metadata */}
                                    {showOrganizer && event.organizer && event.organizer !== 'Unknown' && (
                                        <div className="meta-item meta-organizer" style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            gap: '6px',
                                            fontSize: '12px',
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            fontWeight: 400,
                                            textAlign: 'left',
                                            width: '100%',
                                            minWidth: 0,
                                            lineHeight: '1.2',
                                            paddingLeft: '0px'
                                        }}>
                                            <span className="meta-icon-wrapper" style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                lineHeight: 0,
                                                verticalAlign: 'middle',
                                                width: '16px', // Match logo width for alignment
                                                height: '16px'
                                            }}>
                                                <MaterialIcon name="person" size={12} color="rgba(255, 255, 255, 0.5)" />
                                            </span>
                                            <span className="truncate" style={{
                                                textAlign: 'left',
                                                display: 'inline-block',
                                                width: '100%',
                                                minWidth: 0,
                                                flex: '1 1 auto',
                                                lineHeight: '1.2',
                                                verticalAlign: 'middle'
                                            }}>{event.organizer}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOT: Tags, Logos, or Extra Info (Fills the bottom vacuum) */}
                {!isSummary && !isCompact && cardSize > 3 && (
                    <div className="event-foot-section" style={{ marginTop: 'auto', paddingTop: '4px' }}>
                        {/* Optional tags can go here */}
                    </div>
                )}
            </div>

            {/* Multi-day dots */}
            {getMultiDayDots()}
        </div>
    );
};