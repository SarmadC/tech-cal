'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import { Event, MultiDayEventInstance } from '@/types';

interface MonthEventCardProps {
    event: Event | MultiDayEventInstance;
    onClick: () => void;
    onHover: (e: React.MouseEvent) => void;
    onLeave: () => void;
    className?: string;
    style?: React.CSSProperties;
}

const MonthEventCardComponent: React.FC<MonthEventCardProps> = ({
    event,
    onClick,
    onHover,
    onLeave,
    className = '',
    style = {}
}) => {
    // Get category-based background color
    const getCategoryColor = () => {
        if (event.category?.color) return event.category.color;
        if (event.color) return event.color;
        
        const categoryName = event.category?.name?.toLowerCase();
        switch (categoryName) {
            case 'tech summit':
            case 'summit':
                return '#bfdbfe';
            case 'workshop':
                return '#e9d7ff';
            case 'networking':
                return '#b8ffcc';
            case 'conference':
                return '#a7f3d0';
            case 'webinar':
                return '#fed8ae';
            case 'startup':
                return '#fecaca';
            case 'trade show':
                return '#faf3dd';
            case 'product launch':
                return '#ffa69e';
            case 'training':
                return '#b8f2e6';
            default:
                return '#f1f5f9';
        }
    };

    // Generate vibrant color for text and elements
    const getVibrantColor = (baseColor: string) => {
        if (baseColor.startsWith('#')) {
            const hex = baseColor.slice(1);
            const num = parseInt(hex, 16);
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            
            // Create a darker, more vibrant version
            const newR = Math.max(0, Math.round(r * 0.6));
            const newG = Math.max(0, Math.round(g * 0.6));
            const newB = Math.max(0, Math.round(b * 0.6));
            
            return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
        }
        return '#374151'; // Fallback dark gray
    };

    const categoryColor = getCategoryColor();
    const textColor = getVibrantColor(categoryColor);

    // Get multi-day dots if applicable
    const getMultiDayDots = () => {
        if ('isInstance' in event && event.isInstance && event.dayInfo) {
            const { currentDay, totalDays } = event.dayInfo;
            const maxDots = Math.min(totalDays, 5);
            
            return (
                <div 
                    className="event-day-dots"
                    style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        zIndex: 10
                    }}
                >
                    {Array.from({ length: maxDots }, (_, i) => (
                        <div 
                            key={i} 
                            className={`day-dot ${i + 1 === currentDay ? 'active' : ''}`}
                            style={{ 
                                width: '3px',
                                height: '3px',
                                borderRadius: '0',
                                backgroundColor: i + 1 === currentDay ? textColor : `${textColor}80`
                            }}
                        />
                    ))}
                </div>
            );
        }
        return null;
    };

    const cardStyle: React.CSSProperties = {
        backgroundColor: categoryColor,
        padding: '12px',
        height: '120px',
        minHeight: '120px',
        position: 'relative',
        display: 'block',
        boxSizing: 'border-box',
        overflow: 'hidden',
        margin: 0,
        border: '2px solid white',
        borderRadius: '8px',
        cursor: 'pointer',
        // No transitions on the card itself - hover effects are instant
        // This prevents flickering and provides immediate visual feedback
        ...style
    };

    return (
        <div
            style={cardStyle}
            className={`event-card event-card-v8 ${className}`}
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
        >
            {/* Event name - top left */}
            <div 
                className="event-title" 
                style={{ 
                    color: textColor,
                    position: 'absolute',
                    top: '12px',
                    left: '8px',
                    right: '50px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    lineHeight: '1.2',
                    textAlign: 'left',
                    margin: 0,
                    padding: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
                {event.title}
            </div>
            
            {/* Time - below event name */}
            <div 
                className="event-time" 
                style={{ 
                    color: textColor,
                    position: 'absolute',
                    top: '34px',
                    left: '8px',
                    right: '50px',
                    fontSize: '0.7rem',
                    fontWeight: '500',
                    lineHeight: '1.2',
                    textAlign: 'left',
                    margin: 0,
                    padding: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}
            >
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
            </div>

            {/* Logo - top right (white-bordered square like mockup) */}
            {event.organization?.logo && (
                <div 
                    className="event-organizer-logo-corner"
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        // Explicitly unset inherited bottom/left from base styles
                        bottom: 'auto',
                        left: 'auto',
                        width: '32px',
                        height: '32px',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '2px',
                        boxSizing: 'border-box'
                    }}
                >
                    <Image
                        src={event.organization.logo}
                        alt={`${event.organization.name} logo`}
                        width={24}
                        height={24}
                        className="organizer-logo-corner-image"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            )}

            {/* Category pill - below time, left-aligned with title and time */}
            {event.category?.name && (
                <div
                    className="event-category-badge"
                    style={{
                        position: 'absolute',
                        left: '8px',
                        top: '58px',
                        zIndex: 30,
                        pointerEvents: 'none',
                        margin: 0,
                        padding: 0,
                        textAlign: 'left'
                    }}
                >
                    <span
                        className="event-category-pill"
                        style={{
                            backgroundColor: textColor,
                            color: categoryColor,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            lineHeight: 1.2,
                            letterSpacing: '0.02em',
                            border: '1px solid rgba(0,0,0,0.1)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                            display: 'inline-block',
                            maxWidth: '100%',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            textAlign: 'center',
                            margin: 0
                        }}
                    >
                        {event.category.name}
                    </span>
                </div>
            )}

            {/* Dots - bottom right */}
            {getMultiDayDots()}
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render if the event ID or handlers actually change
export const MonthEventCard = memo(MonthEventCardComponent, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
        prevProps.event.id === nextProps.event.id &&
        prevProps.event.title === nextProps.event.title &&
        prevProps.onClick === nextProps.onClick &&
        prevProps.onHover === nextProps.onHover &&
        prevProps.onLeave === nextProps.onLeave &&
        prevProps.className === nextProps.className
        // Note: We deliberately don't compare style as it's often a new object
    );
});

MonthEventCard.displayName = 'MonthEventCard';
