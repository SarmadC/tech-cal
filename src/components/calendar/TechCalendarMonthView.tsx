'use client';

import React, { useState } from 'react';
import { EventClickArg } from '@fullcalendar/core';
import type FullCalendar from '@fullcalendar/react';
import DynamicFullCalendar from './DynamicFullCalendar';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventPreviewCard from './EventPreviewCard';
import '@/app/styles/event-card.css';
import '@/app/styles/monthly-view.css';

export interface TechCalendarMonthViewProps {
    events: (Event | MultiDayEvent)[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event | MultiDayEventInstance) => void;
    onEventClick?: (clickInfo: EventClickArg) => void;
    calendarRef?: React.RefObject<FullCalendar | null>;
    className?: string;
}

const TechCalendarMonthView: React.FC<TechCalendarMonthViewProps> = ({
    events,
    initialDate,
    categories: _categories,
    profile: _profile,
    onEventClick,
    calendarRef,
    className = '',
}) => {
    const internalCalendarRef = React.useRef<FullCalendar | null>(null);
    const activeCalendarRef = calendarRef || internalCalendarRef;
    const [isMobile, setIsMobile] = useState(false);
    const { hidePreview, previewState } = useEventPreview();

    // Mobile detection
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className={`tech-calendar-month-view ${className}`}>
            <DynamicFullCalendar
                ref={activeCalendarRef}
                events={events as Event[]}
                onEventClick={onEventClick}
                view="month"
                initialDate={initialDate}
                className=""
                initialView="dayGridMonth"
                headerToolbar={false}
                height="100%"
                moreLinkClick="popover"
                eventDisplay="block"
                displayEventTime={!isMobile}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                expandRows={true}
                stickyHeaderDates={true}
                nowIndicator={true}
                aspectRatio={isMobile ? 0.8 : undefined}
                scrollTime={isMobile ? "06:00:00" : "08:00:00"}
                scrollTimeReset={false}
                {...(isMobile && {
                    contentHeight: 'auto',
                    aspectRatio: undefined
                })}
            />

            {/* Event Preview Card */}
            {previewState.event && (
                <EventPreviewCard
                    event={previewState.event}
                    isVisible={previewState.isVisible}
                    position={previewState.position}
                    onClose={hidePreview}
                />
            )}
        </div>
    );
};

export default TechCalendarMonthView;