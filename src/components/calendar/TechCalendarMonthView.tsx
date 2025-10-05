'use client';

import React, { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import { FullCalendarCSSLoader } from './FullCalendarCSSLoader';
import { EventClickArg, EventContentArg, EventMountArg, EventHoveringArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { getEventStatus } from '@/utils/eventStatusUtils';
import { useTrackedEventsUnified } from '@/hooks/useTrackedEventsUnified';
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
    const { trackedEventIds } = useTrackedEventsUnified();

    const {
        previewState,
        showPreview,
        hidePreview
    } = useEventPreview();

    // Add refs for debouncing hover events
    const showTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
    const hideTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

    // Track events per day for proportional height distribution
    const dayEventCounts = React.useRef<Map<string, number>>(new Map());
    const mountedEvents = React.useRef<Set<string>>(new Set());
    const totalExpectedEvents = React.useRef<number>(0);

    // Apply proportional heights to day cells based on event counts
    const applyProportionalHeights = React.useCallback(() => {
        // Use document.querySelector to find the calendar since FullCalendar API doesn't expose el
        const calendarEl = document.querySelector('.tech-calendar-month-view .fc');
        if (!calendarEl) return;

        // Find all day cells and apply event count as CSS custom property
        const dayCells = calendarEl.querySelectorAll('.fc-daygrid-day');
        dayCells.forEach((dayCell) => {
            const dayElement = dayCell as HTMLElement;
            const dateStr = dayElement.getAttribute('data-date');
            if (!dateStr) return;

            const eventCount = dayEventCounts.current.get(dateStr) || 0;
            // Set CSS custom property for event count
            dayElement.style.setProperty('--events-count', eventCount.toString());

            // Also set it on the day frame for easier CSS targeting
            const dayFrame = dayElement.querySelector('.fc-daygrid-day-frame');
            if (dayFrame) {
                (dayFrame as HTMLElement).style.setProperty('--events-count', eventCount.toString());
            }
        });
    }, []);

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

    // Month view: Process multi-day events to show individual day cards
    const processedEvents = React.useMemo<(Event | MultiDayEventInstance)[]>(() => {
        if (!events || events.length === 0) return [];
        
        const processedEvents: (Event | MultiDayEventInstance)[] = [];
        const currentMonth = new Date(initialDate);
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        // Process each event in the current month
        for (const event of events) {
            const startDate = new Date(event.startTime);
            const endDate = event.endTime ? new Date(event.endTime) : startDate;
            
            // Check if this is a multi-day event (either explicitly marked or spans multiple days)
            const eventStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            const eventEndDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            const daysDiff = Math.ceil((eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            
            const isMultiDay = ('isMultiDay' in event && event.isMultiDay) || daysDiff > 1;
            
            if (isMultiDay) {
                // Find the overlap between the event and the current month
                const overlapStart = new Date(Math.max(eventStartDate.getTime(), monthStart.getTime()));
                const overlapEnd = new Date(Math.min(eventEndDate.getTime(), monthEnd.getTime()));
                
                if (overlapStart <= overlapEnd) {
                    // Generate instances for each day in the overlap
                    const currentDay = new Date(overlapStart);
                    let dayNumber = 1;
                    
                    while (currentDay <= overlapEnd) {
                        const year = currentDay.getFullYear();
                        const month = String(currentDay.getMonth() + 1).padStart(2, '0');
                        const day = String(currentDay.getDate()).padStart(2, '0');
                        const dateStr = `${year}-${month}-${day}`;
                        
                        // Create day info
                        const dayInfo = {
                            currentDay: dayNumber,
                            totalDays: daysDiff,
                            isFirstDay: dayNumber === 1,
                            isLastDay: dayNumber === daysDiff,
                            continuationType: (dayNumber === 1 ? 'start' : dayNumber === daysDiff ? 'end' : 'middle') as 'start' | 'middle' | 'end'
                        };
                        
                        // Create the instance
                        const instance: MultiDayEventInstance = {
                            ...event,
                            id: `${event.id}-${dateStr}`,
                            startTime: `${dateStr}T00:00:00`,
                            endTime: `${dateStr}T23:59:59`,
                            isInstance: true,
                            originalEventId: event.id,
                            instanceDate: dateStr,
                            dayInfo,
                            isMultiDay: true
                        };
                        
                        processedEvents.push(instance);
                        
                        // Move to next day
                        currentDay.setDate(currentDay.getDate() + 1);
                        dayNumber++;
                    }
                }
            } else {
                // Single-day event - add as is
                processedEvents.push(event);
            }
        }
        
        return processedEvents;
    }, [events, initialDate]);

    // Transform events for FullCalendar with dynamic colors
    const calendarEvents = React.useMemo(() => {
        if (!processedEvents || processedEvents.length === 0) return [];
        
        // Reset tracking when events change
        dayEventCounts.current.clear();
        mountedEvents.current.clear();

        const fcEvents = processedEvents.map(event => {
            const categoryColor = getCategoryColor(event);
            const titleColor = getPillColor(categoryColor);

            // Count events per day for proportional heights
            const eventDate = new Date(event.startTime);
            const dateStr = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            dayEventCounts.current.set(dateStr, (dayEventCounts.current.get(dateStr) || 0) + 1);

            return {
                id: event.id,
                title: event.title,
                start: event.startTime,
                end: event.endTime || undefined,
                allDay: false, // All events are rendered as individual day cards
                color: categoryColor,
                extendedProps: {
                    ...event,
                    isTracked: trackedEventIds?.has(event.id) ?? false,
                    categoryColor,
                    titleColor,
                }
            };
        });

        // Track total expected events for mount completion detection
        totalExpectedEvents.current = fcEvents.length;

        return fcEvents;
    }, [processedEvents, trackedEventIds]);

    // Enhanced event content renderer
    const renderEventContent = useCallback((eventInfo: EventContentArg) => {
        console.log('Rendering event content:', {
            id: eventInfo.event.id,
            title: eventInfo.event.title,
            allDay: eventInfo.event.allDay,
            start: eventInfo.event.start,
            end: eventInfo.event.end
        });

        // Since we're now rendering individual day cards (allDay: false), 
        // we should show the event content for all events
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
        const { isTracked } = getEventStatus(eventData);

        // Debug: Log event classes and properties
        console.log('Event mounted:', {
            id: info.event.id,
            title: info.event.title,
            allDay: info.event.allDay,
            start: info.event.start,
            end: info.event.end,
            classes: info.el.className,
            isMultiDay: info.event.allDay && info.event.end
        });

        // Track mounted events for proportional height system
        mountedEvents.current.add(info.event.id);

        // Check if event is before today's date (completed)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const eventDate = new Date(eventData.startTime);
        eventDate.setHours(0, 0, 0, 0); // Start of event date
        const isCompleted = eventDate < today;
        
        if (isTracked) {
            info.el.classList.add('tracked-event');
        }
        if (isCompleted) {
            info.el.classList.add('completed-event');
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
        
        // Ensure hover detection works across entire element
        (info.el as HTMLElement).style.pointerEvents = 'all';
        (info.el as HTMLElement).style.cursor = 'pointer';

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

        // Apply proportional heights when all events have mounted
        if (mountedEvents.current.size === totalExpectedEvents.current && totalExpectedEvents.current > 0) {
            // Use setTimeout to ensure DOM is fully rendered
            setTimeout(() => {
                applyProportionalHeights();
            }, 10);
        }
    }, [applyProportionalHeights]);

    const handleEventWillUnmount = useCallback((info: { el: Element }) => {
        const root = info.el as HTMLElement;
        const dots = root?.querySelector('.event-day-dots');
        if (dots) dots.remove();
    }, []);

    // Handle event mouse enter with debouncing
    const handleEventMouseEnter = useCallback((info: EventHoveringArg) => {
        // Clear any pending hide timeout
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = undefined;
        }

        // Clear any existing show timeout
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
        }

        // Show preview after a short delay to prevent flicker
        showTimeoutRef.current = setTimeout(() => {
            const event = info.event.extendedProps as Event;
            const rect = info.el.getBoundingClientRect();
            
            // Smart positioning to avoid cursor interference and screen boundaries
            const cardWidth = 320;
            const cardHeight = 400;
            const bufferZone = 50; // Safe zone around cursor
            
            let x = rect.right + 20; // Start to the right of event
            let y = rect.top;
            
            // Check if preview would go off-screen on the right
            if (x + cardWidth > window.innerWidth - 20) {
                // Try positioning to the left of the event
                x = rect.left - cardWidth - 20;
                // If still off-screen, clamp to left edge
                if (x < 20) {
                    x = 20;
                    // Position well away from cursor path
                    y = rect.bottom + bufferZone;
                }
            }
            
            // Check if preview would go off-screen vertically
            if (y + cardHeight > window.innerHeight - 20) {
                y = window.innerHeight - cardHeight - 20;
            }
            
            // Ensure we're not too close to the cursor position
            if (y < 20) {
                y = 20;
            }
            
            const position = { x, y };
            showPreview(event, position);
        }, 100); // Reduced delay for better responsiveness
    }, [showPreview]);

    // Handle event mouse leave with debouncing
    const handleEventMouseLeave = useCallback(() => {
        // Clear any pending show timeout
        if (showTimeoutRef.current) {
            clearTimeout(showTimeoutRef.current);
            showTimeoutRef.current = undefined;
        }

        // Hide preview after a longer delay to allow moving to preview card
        hideTimeoutRef.current = setTimeout(() => {
            hidePreview();
        }, 300); // Increased delay to give user time to move to preview
    }, [hidePreview]);

    // Handle preview card hover (keep preview open)
    const handlePreviewHover = useCallback(() => {
        // Clear any pending hide timeout when hovering over preview
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = undefined;
        }
    }, []);

    // Handle preview card leave (hide preview)
    const handlePreviewLeave = useCallback(() => {
        // Hide preview immediately when leaving the preview card
        hideTimeoutRef.current = setTimeout(() => {
            hidePreview();
        }, 100);
    }, [hidePreview]);

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


    // Cleanup timeouts on unmount
    React.useEffect(() => {
        return () => {
            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
            }
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    // Handle date changes (from calendar navigation)
    const handleDatesSet = useCallback((_dateInfo: { start: Date }) => {
        // Handle date changes if needed
    }, []);

    return (
        <div className={`tech-calendar-month-view ${className}`}>
            <FullCalendarCSSLoader />
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
                eventMouseLeave={handleEventMouseLeave}
                datesSet={handleDatesSet}
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
                // Adaptive: Let cells expand based on event count
                dayMaxEvents={false}
                dayMaxEventRows={false}
                // Custom more link handling
                moreLinkContent={(arg) => {
                    const totalEvents = arg.num;
                    if (totalEvents <= 3) return '';
                    return `+${totalEvents - 3}`;
                }}
            />

            {/* Event Preview Card */}
            {previewState.event && (
                <EventPreviewCard
                    event={previewState.event}
                    isVisible={previewState.isVisible}
                    position={previewState.position}
                    onClose={hidePreview}
                    onHover={handlePreviewHover}
                    onLeave={handlePreviewLeave}
                />
            )}
        </div>
    );
};

export default TechCalendarMonthView;
