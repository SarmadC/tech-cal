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
import { TimelineAgendaItem } from './TimelineAgendaItem';

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
                {/* Month Events - Grouped by Day */}
                <div className={`month-events-discovery ${isCalendarCollapsed ? 'collapsed' : ''}`}>
                    {/* Month Header is redundant if we have sticky day headers, but keeping "January" context might be good. 
                        However, the design asks to remove "19 events" floating badge.
                        We'll remove the header entirely as per instructions to reduce noise. 
                    */}

                    <div className="events-list pb-20">
                        {monthEvents.length > 0 ? (
                            (() => {
                                // Group events by day string "YYYY-MM-DD"
                                const groupedEvents: Record<string, typeof monthEvents> = {};
                                monthEvents.forEach(event => {
                                    const dateKey = new Date(event.startTime).toDateString();
                                    if (!groupedEvents[dateKey]) {
                                        groupedEvents[dateKey] = [];
                                    }
                                    groupedEvents[dateKey].push(event);
                                });

                                // Sort dates
                                const sortedDates = Object.keys(groupedEvents).sort((a, b) =>
                                    new Date(a).getTime() - new Date(b).getTime()
                                );

                                return sortedDates.map(dateKey => {
                                    const dayEvents = groupedEvents[dateKey];
                                    const dateObj = new Date(dayEvents[0].startTime);

                                    // Header Date Formatting: "SUN 4"
                                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                                    const dayNum = dateObj.getDate();

                                    return (
                                        <div key={dateKey} className="flex relative group">
                                            {/* LEFT COLUMN: Date Sidebar - Transparent background, right-aligned */}
                                            <div className="w-[52px] flex-shrink-0 flex flex-col items-end pr-3 pt-3 pb-3 border-r mobile-calendar-date-divider">
                                                <div className="sticky top-4 flex flex-col items-end gap-0.5 z-10">
                                                    <span className="text-[10px] font-bold tracking-wider uppercase leading-none" style={{ color: 'var(--error)' }}>
                                                        {dayName}
                                                    </span>
                                                    <span className="text-[20px] font-light leading-tight" style={{ color: 'var(--foreground-primary)' }}>
                                                        {dayNum}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* RIGHT COLUMN: Event List Stack - Tighter padding */}
                                            <div className="flex-1 min-w-0 flex flex-col py-1 pl-3">
                                                {dayEvents.map((event, index) => (
                                                    <div key={`${event.id}-${index}`} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                                                        <TimelineAgendaItem
                                                            event={event}
                                                            onClick={(e) => {
                                                                const syntheticEvent = {
                                                                    preventDefault: () => { },
                                                                    stopPropagation: () => { },
                                                                    currentTarget: null,
                                                                    target: null
                                                                } as unknown as React.MouseEvent<HTMLDivElement>;
                                                                handleEventClick(e, syntheticEvent);
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                });
                            })()
                        ) : (
                            <div className="no-events-selected flex flex-col items-center justify-center py-12" style={{ color: 'var(--foreground-tertiary)' }}>
                                <MaterialIcon name="event_available" size={32} />
                                <span className="mt-2 text-sm">No events this month</span>
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