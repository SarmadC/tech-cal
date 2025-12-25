'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { EventClickArg } from '@/types/fullcalendar';
import './mobile-calendar.css';
import { Event, EventType, AppProfile, MultiDayEventInstance } from '@/types';
import { CareerImpactScoreLite } from '@/types/careerImpact';
import { MaterialIcon } from '@/components/ui/Icon';
// Career impact components removed - using inline implementation
import MobileEventDetailPanel from './MobileEventDetailPanel';
import { SkeletonLoader, MonthViewSkeleton } from '@/components/ui/SkeletonLoader';
import DiscoveryCard from './DiscoveryCard';

export interface MobileCalendarMonthViewProps {
    events: Event[];
    initialDate: Date;
    categories: EventType[];
    profile: AppProfile | null;
    onEventSelect?: (event: Event | MultiDayEventInstance) => void;
    onEventClick?: (clickInfo: EventClickArg) => void;
    onDateChange?: (date: Date) => void;
    onRefresh?: () => Promise<void>;
    isCalendarCollapsed?: boolean;
    className?: string;
    isIOS?: boolean;
    isAndroid?: boolean;
    isLoading?: boolean;
}

const MobileCalendarMonthView: React.FC<MobileCalendarMonthViewProps> = ({
    events,
    initialDate,
    categories,
    profile: _profile,
    onEventSelect,
    onEventClick: _onEventClick,
    onDateChange,
    onRefresh: _onRefresh,
    isCalendarCollapsed: propIsCalendarCollapsed = false,
    className = '',
    isIOS: _isIOS = false,
    isAndroid: _isAndroid = false,
    isLoading = false,
}) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [_isPreviewVisible, _setIsPreviewVisible] = useState(false);
    const isCalendarCollapsed = propIsCalendarCollapsed;


    // Get all events for the current month
    const monthEvents = useMemo(() => {
        const year = initialDate.getFullYear();
        const month = initialDate.getMonth();

        return events
            .filter(event => {
                const eventStart = new Date(event.startTime);
                return eventStart.getFullYear() === year && eventStart.getMonth() === month;
            })
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, initialDate]);


    // Event handlers
    const handleDateClick = useCallback((date: Date) => {
        setSelectedDate(date);
        onDateChange?.(date);
    }, [onDateChange]);

    // Sync selectedDate with initialDate changes
    React.useEffect(() => {
        setSelectedDate(initialDate);
    }, [initialDate]);

    const handleEventClick = useCallback((event: Event, e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewEvent(event);
        _setIsPreviewVisible(true);
        onEventSelect?.(event);
    }, [onEventSelect]);

    const _handleEventHover = useCallback((_event: Event, _mouseEvent: React.MouseEvent) => {
        // if (hideTimer) {
        //   clearTimeout(hideTimer);
        //   setHideTimer(null);
        // }

        // const rect = mouseEvent.currentTarget.getBoundingClientRect();
        // setPreviewEvent(event);
        // setPreviewPosition({ x: rect.right + 10, y: rect.top });
        // setIsPreviewVisible(true);
    }, []);

    const _handleEventLeave = useCallback(() => {
        // const timer = setTimeout(() => {
        //   setIsPreviewVisible(false);
        //   setPreviewEvent(null);
        // }, 300);
        // setHideTimer(timer);
    }, []);






    // Show loading state
    if (isLoading) {
        return (
            <div className={`mobile-calendar-month-view ${className} loading`}>
                <div className="mobile-month-header">
                    <SkeletonLoader className="skeleton-loader" width="200px" height="32px" />
                </div>
                <MonthViewSkeleton />
            </div>
        );
    }

    return (
        <div className={`mobile-calendar-month-view ${className}`}>
            {/* Main Content Container */}
            <div className="mobile-calendar-content-container">
                {/* Month Events Discovery - Always visible with different heights */}
                <div className={`month-events-discovery ${isCalendarCollapsed ? 'collapsed' : ''}`}>
                    <div className="events-header">
                        <div className="events-count">
                            {monthEvents.length} {monthEvents.length === 1 ? 'event' : 'events'}
                        </div>
                    </div>

                    <div className="events-list">
                        {monthEvents.length > 0 ? (
                            monthEvents.map((event, index) => (
                                <DiscoveryCard
                                    key={`${event.id}-${index}`}
                                    event={event as Event & { careerImpactLite?: CareerImpactScoreLite }}
                                    onClick={() => {
                                        const syntheticEvent = {
                                            preventDefault: () => { },
                                            stopPropagation: () => { },
                                            currentTarget: null,
                                            target: null
                                        } as unknown as React.MouseEvent<HTMLDivElement>;
                                        handleEventClick(event, syntheticEvent);
                                    }}
                                    onDetailsClick={() => {
                                        setPreviewEvent(event);
                                        _setIsPreviewVisible(true);
                                        onEventSelect?.(event);
                                    }}
                                    showCareerImpact={true}
                                    variant="compact"
                                    className="mb-3"
                                />
                            ))
                        ) : (
                            <div className="no-events-selected">
                                <MaterialIcon name="event_available" size={24} />
                                <span>No events this month</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Event Detail Panel */}
            {previewEvent && (
                <MobileEventDetailPanel
                    event={previewEvent}
                    onClose={() => {
                        _setIsPreviewVisible(false);
                        setPreviewEvent(null);
                    }}
                    categories={categories}
                />
            )}
        </div>
    );
};

export default MobileCalendarMonthView;