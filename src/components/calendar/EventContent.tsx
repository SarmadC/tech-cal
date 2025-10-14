// src/components/calendar/EventContent.tsx
import { FC, useRef } from 'react';
import { EventContentArg } from '@/types/fullcalendar';
import { Event, MultiDayEventInstance } from '@/types';
import { formatTime } from '@/utils/dateUtils';
import { getCategoryColor, isMultiDayEvent, getMultiDayDuration } from '@/utils/eventUtils';
import { getPillColor } from '@/utils/pillColorUtils';
import Image from 'next/image';

interface EventContentProps extends EventContentArg {
    onEventHover?: (event: Event, position: { x: number; y: number }) => void;
    onEventLeave?: () => void;
}

const EventContent: FC<EventContentProps> = ({
    event,
    timeText,
    onEventHover,
    onEventLeave
}) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const eventData = event.extendedProps as Event;
    
    // Get tracking status
    const isTracked = ('isTracked' in eventData) && eventData.isTracked;
    
    // Check if event is before today's date (completed)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(eventData.startTime);
    eventDate.setHours(0, 0, 0, 0);
    const isCompleted = eventDate < today;
    
    const showStar = isTracked;
    const showCheckmark = isCompleted;

    // Get multi-day dots - handle both regular multi-day events and instances
    const getMultiDayDots = () => {
        // Check if this is a multi-day event instance
        if ('isInstance' in eventData && eventData.isInstance) {
            const instance = eventData as MultiDayEventInstance;
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
        if (isMultiDayEvent(eventData)) {
            const totalDays = Math.min(getMultiDayDuration(eventData), 5); // Max 5 dots
            
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

    const handleMouseEnter = (_e: React.MouseEvent) => {
        if (onEventHover && elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            onEventHover(eventData, {
                x: rect.left + rect.width / 2,
                y: rect.top
            });
        }
    };

    const handleMouseLeave = () => {
        onEventLeave?.();
    };

    const categoryColor = getCategoryColor(eventData);

    return (
        <div
            ref={elementRef}
            className="event-card mini"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
                '--category-bg': categoryColor,
                '--category-title-color': getPillColor(categoryColor, 0.5),
                '--text-on-pastel': getPillColor(categoryColor, 0.5)
            } as React.CSSProperties}
        >
            {/* Event Logo */}
            {eventData.organization?.logo && (
                <div className="event-logo">
                    <Image
                        src={eventData.organization.logo}
                        alt={eventData.organization.name || 'Event logo'}
                        width={16}
                        height={16}
                        className="logo-image"
                    />
                </div>
            )}
            
            {/* Event Content */}
            <div className="event-content">
                <div className="event-time">
                    {timeText || formatTime(eventData.startTime, eventData.timezone)}
                </div>
                <div className="event-card-basic-info">
                    <div className="event-title">
                        {/* @ts-expect-error - event.title type issue with FullCalendar */}
                        {event.title as string}
                        {showStar && (
                            <>
                                <span className="ml-1 text-gray-300">★</span>
                                {showCheckmark && (
                                    <span className="ml-1 text-green-500 font-bold">✓</span>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Multi-day dots */}
            {getMultiDayDots()}
        </div>
    );
};

export default EventContent;