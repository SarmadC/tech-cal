'use client';

import React, { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import { EventClickArg, EventContentArg, EventMountArg, EventHoveringArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance, isTrackedEvent } from '@/types';
import { processEventsForWeekView } from '@/utils/multiDayEventUtils';
import { formatTimeRange } from '@/utils/dateUtils';
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
    onEventSelect: _onEventSelect,
    onEventClick,
    calendarRef,
    className = '',
}) => {
    const internalCalendarRef = React.useRef<FullCalendar | null>(null);
    const activeCalendarRef = calendarRef || internalCalendarRef;
    const [isMobile, setIsMobile] = useState(false);

    const {
        previewState,
        showPreview,
        hidePreview
    } = useEventPreview();

    // Check if mobile on mount and resize
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Get category-based colors (same as day/week views)
    const getCategoryColor = (event: Event | MultiDayEvent) => {
        if (event.category?.color) {
            return event.category.color;
        }
        
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

    // Helper function to create vibrant colors from pastel backgrounds
    const getPillColor = (color: string) => {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const num = parseInt(hex, 16);
            const r = (num >> 16) & 0xFF;
            const g = (num >> 8) & 0xFF;
            const b = num & 0xFF;
            
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
            
            const newS = Math.min(0.45, s * 2.5);
            const newL = Math.max(0.10, Math.min(0.55, l * 0.5));
            
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
        return `color-mix(in srgb, ${color} 40%, hsl(var(--hue, 220) 85% 45%))`;
    };

    // Preprocess events: split multi-day events into separate day instances (DRY with week view)
    const processedEvents = React.useMemo<(Event | MultiDayEvent)[]>(() => {
        return processEventsForWeekView(events) as unknown as (Event | MultiDayEvent)[];
    }, [events]);

    // Transform events for FullCalendar with dynamic colors
    const calendarEvents = React.useMemo(() => {
        return processedEvents.map(event => {
            const categoryColor = getCategoryColor(event);
            const titleColor = getPillColor(categoryColor);
            
            return {
                id: event.id,
                title: event.title,
                start: event.startTime,
                end: event.endTime || undefined,
                color: categoryColor,
                extendedProps: {
                    ...event,
                    isTracked: isTrackedEvent(event) ? event.isTracked : false,
                    categoryColor,
                    titleColor,
                }
            };
        });
    }, [processedEvents]);

    // Enhanced event content renderer
    const renderEventContent = useCallback((eventInfo: EventContentArg) => {
        // Keep DOM minimal: event-card (outer) + event-card-basic-info (inner)
        const start = eventInfo.event.start as Date;
        const end = eventInfo.event.end as Date | null;
        const ep = eventInfo.event.extendedProps as Record<string, unknown>;
        const tz = (ep && (ep['timezone'] as string | null | undefined)) ?? undefined;

        return (
            <div className="event-card-basic-info">
                <h3 className="event-title">{eventInfo.event.title}</h3>
                <span className="event-time">{formatTimeRange(start, end, tz)}</span>
            </div>
        );
    }, []);

    // Handle event clicks
    const handleEventClick = useCallback((clickInfo: EventClickArg) => {
        clickInfo.jsEvent.preventDefault();
        hidePreview();
        onEventClick?.(clickInfo);
    }, [onEventClick, hidePreview]);

    // Handle event mounting (for styling and dynamic sizing)
    const handleEventDidMount = useCallback((info: EventMountArg) => {
        const eventData = info.event.extendedProps as unknown as Event;
        if (isTrackedEvent(eventData) && eventData.isTracked) {
            info.el.classList.add('tracked-event');
        }
        
        // Apply base event-card classes to the FullCalendar event element
        info.el.classList.add('event-card', 'mini');

        // Set dynamic colors using CSS custom properties
        const categoryColor = (info.event.extendedProps as Record<string, unknown>)['categoryColor'] as string || '#f1f5f9';
        const titleColor = (info.event.extendedProps as Record<string, unknown>)['titleColor'] as string || '#1f2937';
        
        info.el.style.setProperty('--category-bg', categoryColor);
        info.el.style.setProperty('--category-title-color', titleColor);
        // Remove any inline/background from FullCalendar so base card shows
        (info.el as HTMLElement).style.background = 'transparent';
        (info.el as HTMLElement).style.borderWidth = '0';
        
        // Add dynamic sizing based on number of events in the day
        const dayEl = info.el.closest('.fc-daygrid-day');
        if (dayEl) {
            const eventsInDay = dayEl.querySelectorAll('.fc-daygrid-event').length;
            const moreLink = dayEl.querySelector('.fc-more-link');
            const visibleEvents = moreLink ? eventsInDay - 1 : eventsInDay;
            
            // Add class for dynamic sizing
            if (visibleEvents === 1) {
                info.el.classList.add('event-single');
                // Stretch to full cell
                (info.el as HTMLElement).style.width = '100%';
                (info.el as HTMLElement).style.height = '100%';
                (info.el as HTMLElement).style.margin = '0';
                // Ensure the harness container also expands
                const harness = info.el.parentElement as HTMLElement;
                if (harness && harness.classList.contains('fc-daygrid-event-harness')) {
                    harness.style.width = '100%';
                }
            } else if (visibleEvents === 2) {
                info.el.classList.add('event-half');
            } else if (visibleEvents === 3) {
                info.el.classList.add('event-third');
            } else if (visibleEvents >= 4) {
                info.el.classList.add('event-quarter');
            }
        }

        // Create/refresh multi-day dots directly on the card element
        const ep = (info.event.extendedProps || {}) as Record<string, unknown>;
        const dayInfo = ep['dayInfo'] as { currentDay: number; totalDays: number } | undefined;
        const titleCol = (ep['titleColor'] as string) || titleColor;
        // Remove any pre-existing dots (in case of rerender)
        const existing = info.el.querySelector('.event-day-dots');
        if (existing) existing.remove();

        if (dayInfo && dayInfo.totalDays > 1) {
            const dots = document.createElement('div');
            dots.className = 'event-day-dots';
            for (let i = 1; i <= dayInfo.totalDays; i++) {
                const dot = document.createElement('div');
                dot.className = 'day-dot' + (i === dayInfo.currentDay ? ' active' : '');
                (dot as HTMLElement).style.backgroundColor = titleCol;
                dots.appendChild(dot);
            }
            info.el.appendChild(dots);
        }
    }, []);

    const handleEventWillUnmount = useCallback((info: { el: Element }) => {
        const root = info.el as HTMLElement;
        const dots = root?.querySelector('.event-day-dots');
        if (dots) dots.remove();
    }, []);

    // Handle event mouse enter
    const handleEventMouseEnter = useCallback((info: EventHoveringArg) => {
        const event = info.event.extendedProps as Event;
        const rect = info.el.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.top
        };
        showPreview(event, position);
    }, [showPreview]);

    // Keep FullCalendar in sync with external date changes
    React.useEffect(() => {
        const calendarInstance = activeCalendarRef.current;
        if (!calendarInstance) return;
        const api = calendarInstance.getApi();
        if (!api) return;

        // Avoid redundant navigation if already on the same date
        const current = api.getDate?.();
        if (current && current.toDateString() === initialDate.toDateString()) return;

        const run = () => api.gotoDate(initialDate);
        if (typeof queueMicrotask === 'function') {
            queueMicrotask(run);
        } else if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
            requestAnimationFrame(run);
        } else {
            setTimeout(run, 0);
        }
    }, [initialDate, activeCalendarRef]);

    // Handle date changes (from calendar navigation)
    const handleDatesSet = useCallback((_dateInfo: { start: Date }) => {
        // Handle date changes if needed
    }, []);

    return (
        <div className={`tech-calendar-month-view ${className}`}>
            <FullCalendar
                ref={activeCalendarRef}
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                initialDate={initialDate}
                events={calendarEvents}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
                eventDidMount={handleEventDidMount}
                eventWillUnmount={handleEventWillUnmount}
                eventMouseEnter={handleEventMouseEnter}
                eventMouseLeave={hidePreview}
                datesSet={handleDatesSet}
                headerToolbar={false}
                height="100%"
                moreLinkClick="popover"
                eventDisplay="block"
                displayEventTime={!isMobile}
                allDaySlot={false}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                expandRows={true}
                stickyHeaderDates={true}
                nowIndicator={true}
                // Mobile viewport optimizations
                aspectRatio={isMobile ? 0.8 : undefined}
                // Mobile scrolling improvements
                scrollTime={isMobile ? "06:00:00" : "08:00:00"}
                scrollTimeReset={false}
                // Enhanced month view settings
                dayHeaderFormat={{ weekday: 'short' }}
                dayHeaderDidMount={(info) => {
                    info.el.classList.add('month-day-header');
                }}
                dayCellDidMount={(info) => {
                    info.el.classList.add('month-day-cell');
                    // Add weekend class
                    if (info.date.getDay() === 0 || info.date.getDay() === 6) {
                        info.el.classList.add('weekend-day');
                    }
                    // Add today class
                    const today = new Date();
                    if (info.date.toDateString() === today.toDateString()) {
                        info.el.classList.add('today-cell');
                    }
                }}
                // Disable default event limiting to show all events
                dayMaxEvents={false}
                // Custom more link handling
                moreLinkContent={(arg) => {
                    const totalEvents = arg.num;
                    if (totalEvents <= 3) return '';
                    return `+${totalEvents - 3} more`;
                }}
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
