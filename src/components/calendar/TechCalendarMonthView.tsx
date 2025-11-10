'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { EventClickArg } from '@/types/fullcalendar';
import { FullCalendar } from '@/types/fullcalendar';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventPreviewCard from './EventPreviewCard';
import { MonthEventCard } from './MonthEventCard';
import MonthDayOverflowModal from './MonthDayOverflowModal';
import '@/app/styles/event-card.css';
import '@/app/styles/monthly-view.css';

const MAX_INLINE_EVENTS = 3;
const MAX_RIBBON_ROWS = 3;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DAY_HEADER_HEIGHT = 24;
const DAY_HEADER_GAP = 8;
const DAY_HEADER_EXTRA_GAP = 12;
const RIBBON_HEIGHT = 42;
const RIBBON_GAP = 6;
const RIBBON_TOP_OFFSET = DAY_HEADER_HEIGHT + DAY_HEADER_GAP + DAY_HEADER_EXTRA_GAP;

interface WeekSegment {
    id: string;
    cardEvent: Event | MultiDayEventInstance;
    startIndex: number;
    span: number;
    row: number;
}

interface DayData {
    date: Date;
    dateKey: string;
    inlineEvents: (Event | MultiDayEventInstance)[];
    overflowEvents: (Event | MultiDayEventInstance)[];
    modalEvents: (Event | MultiDayEventInstance)[];
    isCurrentMonth: boolean;
    isToday: boolean;
}

interface WeekData {
    days: DayData[];
    segments: WeekSegment[];
    rowsUsed: number;
    ribbonHeight: number;
}

interface SegmentInput {
    event: Event;
    segmentStart: Date;
    segmentEnd: Date;
    startIndex: number;
    span: number;
    totalDays: number;
    currentDay: number;
    isFirstSegment: boolean;
    isLastSegment: boolean;
    eventStart: Date;
    eventEnd: Date;
}

type OverflowDayState = {
    date: Date;
    events: (Event | MultiDayEventInstance)[];
};

const startOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const endOfDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

const diffInDays = (later: Date, earlier: Date) =>
    Math.round((later.getTime() - earlier.getTime()) / DAY_IN_MS);

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
    onEventSelect,
    onEventClick: _onEventClick,
    calendarRef,
    className = '',
}) => {
    const internalCalendarRef = React.useRef<FullCalendar | null>(null);
    const _activeCalendarRef = calendarRef || internalCalendarRef;
    const [_isMobile, setIsMobile] = useState(false);
    const { hidePreview, previewState, showPreview, cancelHide, forceHidePreview } = useEventPreview();
    const [overflowState, setOverflowState] = useState<OverflowDayState | null>(null);

    // Event click handler - force hide preview immediately to prevent double-click issue
    const handleEventClick = useCallback((event: Event | MultiDayEventInstance) => {
        forceHidePreview(); // Immediately hide preview to avoid click interference
        onEventSelect?.(event);
    }, [onEventSelect, forceHidePreview]);

    // Event hover handler
    const handleEventHover = useCallback((event: Event | MultiDayEventInstance, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const position = {
            x: rect.left + rect.width / 2,
            y: rect.top
        };
        showPreview(event as Event, position);
    }, [showPreview]);

    // Memoize the card style to prevent new object creation on every render
    const cardStyle = useMemo(() => ({
        height: 'auto',
        minHeight: '24px',
        fontSize: '0.75rem'
    }), []);

    const handleShowMore = useCallback(
        (day: Date, eventsForDay: (Event | MultiDayEventInstance)[]) => {
            forceHidePreview();
            setOverflowState({
                date: new Date(day),
                events: eventsForDay
            });
        },
        [forceHidePreview]
    );

    const handleCloseOverflow = useCallback(() => {
        setOverflowState(null);
    }, []);

    // Custom month grid component using computed weeks
    const CustomMonthGrid: React.FC = () => {
        return (
            <div className="custom-month-grid">
                {/* Header */}
                <div className="month-grid-header">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => (
                        <div 
                            key={dayName} 
                            className={`month-grid-day-header ${index === 0 || index === 6 ? 'weekend' : ''}`}
                        >
                            {dayName}
                        </div>
                    ))}
                </div>
                
                {/* Days grid */}
                <div className="month-grid-weeks">
                    {weeks.map((week, weekIndex) => (
                        <div key={`week-${weekIndex}`} className="month-week">
                            {week.rowsUsed > 0 && (
                                <div
                                    className="month-week-overlay"
                                    style={{
                                        height: week.ribbonHeight,
                                        top: RIBBON_TOP_OFFSET
                                    }}
                                >
                                    <div
                                        className="month-week-overlay-grid"
                                        style={{
                                            gridAutoRows: `${RIBBON_HEIGHT}px`,
                                            columnGap: `${RIBBON_GAP}px`,
                                            rowGap: `${RIBBON_GAP}px`
                                        }}
                                    >
                                        {week.segments.map((segment) => (
                                            <div
                                                key={segment.id}
                                                className="month-week-ribbon"
                                                style={{
                                                    gridColumn: `${segment.startIndex + 1} / span ${segment.span}`,
                                                    gridRow: segment.row + 1
                                                }}
                                            >
                                                <MonthEventCard
                                                    event={segment.cardEvent}
                                                    onClick={() => handleEventClick(segment.cardEvent)}
                                                    onHover={(e) => handleEventHover(segment.cardEvent, e)}
                                                    onLeave={hidePreview}
                                                    style={cardStyle}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="month-week-grid">
                                {week.days.map((dayData) => {
                                    const eventOffset =
                                        RIBBON_TOP_OFFSET +
                                        week.ribbonHeight +
                                        (week.ribbonHeight > 0 ? 12 : 8);

                                    return (
                                        <div
                                            key={dayData.dateKey}
                                            className={`month-grid-day ${dayData.isCurrentMonth ? 'current-month' : 'other-month'} ${dayData.isToday ? 'today' : ''}`}
                                        >
                                            <div className="month-grid-day-number">
                                                {dayData.date.getDate()}
                                            </div>

                                            <div
                                                className="month-grid-day-events"
                                                style={{ marginTop: eventOffset }}
                                            >
                                                {dayData.inlineEvents.map((event, eventIndex) => (
                                                    <div key={`${event.id}-${eventIndex}`} className="month-grid-event">
                                                        <MonthEventCard
                                                            event={event}
                                                            onClick={() => handleEventClick(event)}
                                                            onHover={(e) => handleEventHover(event, e)}
                                                            onLeave={hidePreview}
                                                            style={cardStyle}
                                                        />
                                                    </div>
                                                ))}

                                                {dayData.overflowEvents.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="month-grid-more-button"
                                                        onClick={() => handleShowMore(dayData.date, dayData.modalEvents)}
                                                        onMouseEnter={() => hidePreview()}
                                                        onFocus={() => hidePreview()}
                                                        aria-label={`Show ${dayData.overflowEvents.length} more events on ${dayData.date.toLocaleDateString(undefined, {
                                                            weekday: 'long',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}`}
                                                    >
                                                        +{dayData.overflowEvents.length} more
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Process events for multi-day support - create individual day instances
    const processedEvents = useMemo(() => {
        const processed: (Event | MultiDayEventInstance)[] = [];
        
        events.forEach(event => {
            // Check if this is a multi-day event (spans more than 1 day)
            const startDate = new Date(event.startTime);
            const endDate = event.endTime ? new Date(event.endTime) : new Date(event.startTime);
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 0) {
                // Create individual day instances for multi-day events
                for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset++) {
                    const dayDate = new Date(startDate);
                    dayDate.setDate(startDate.getDate() + dayOffset);
                    
                    const year = dayDate.getFullYear();
                    const month = String(dayDate.getMonth() + 1).padStart(2, '0');
                    const day = String(dayDate.getDate()).padStart(2, '0');
                    const dateStr = `${year}-${month}-${day}`;
                    
                    // Create day instance
                    const dayInstance: MultiDayEventInstance = {
                        ...event,
                        id: `${event.id}-day-${dayOffset + 1}`,
                        startTime: `${dateStr}T00:00:00`,
                        endTime: `${dateStr}T23:59:59`,
                        isInstance: true,
                        originalEventId: event.id,
                        instanceDate: dateStr,
                        dayInfo: {
                            currentDay: dayOffset + 1,
                            totalDays: daysDiff + 1,
                            isFirstDay: dayOffset === 0,
                            isLastDay: dayOffset === daysDiff,
                            continuationType: dayOffset === 0 ? 'start' : 
                                            dayOffset === daysDiff ? 'end' : 'middle'
                        }
                    };
                    
                    processed.push(dayInstance);
                }
            } else {
                // Single-day event - add as is
                processed.push(event);
            }
        });
        
        return processed;
    }, [events]);

    const processedEventsByDate = useMemo(() => {
        const grouped = new Map<string, (Event | MultiDayEventInstance)[]>();

        processedEvents.forEach((event) => {
            let dateKey: string;
            if ('isInstance' in event && event.isInstance) {
                dateKey = event.instanceDate;
            } else {
                const eventDate = new Date(event.startTime);
                dateKey = eventDate.toISOString().split('T')[0];
            }

            const bucket = grouped.get(dateKey);
            if (bucket) {
                bucket.push(event);
            } else {
                grouped.set(dateKey, [event]);
            }
        });

        grouped.forEach((bucket) => {
            bucket.sort((a, b) => {
                const aTime = new Date(a.startTime).getTime();
                const bTime = new Date(b.startTime).getTime();
                return aTime - bTime;
            });
        });

        return grouped;
    }, [processedEvents]);

    const monthDays = useMemo(() => {
        const monthStart = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
        const startDate = new Date(monthStart);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        const result: Date[] = [];
        const cursor = new Date(startDate);

        for (let i = 0; i < 42; i++) {
            result.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }

        return result;
    }, [initialDate]);

    const weeks = useMemo<WeekData[]>(() => {
        const weekDataList: WeekData[] = [];

        for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
            const weekDays = monthDays.slice(weekIndex * 7, weekIndex * 7 + 7);
            const weekStart = startOfDay(weekDays[0]);
            const weekEnd = endOfDay(weekDays[6]);

            const segmentsInput: SegmentInput[] = [];

            events.forEach((event) => {
                const eventStart = startOfDay(new Date(event.startTime));
                const rawEnd = event.endTime ? new Date(event.endTime) : new Date(event.startTime);
                const eventEnd = startOfDay(rawEnd);

                if (eventEnd < weekStart || eventStart > weekEnd) {
                    return;
                }

                const segmentStart = eventStart > weekStart ? eventStart : new Date(weekStart);
                const segmentEnd = eventEnd < weekEnd ? eventEnd : new Date(weekEnd);
                const startIndex = diffInDays(segmentStart, weekStart);
                const span = diffInDays(segmentEnd, segmentStart) + 1;
                if (span <= 0) {
                    return;
                }

                const totalDays = diffInDays(eventEnd, eventStart) + 1;
                const currentDay = diffInDays(segmentStart, eventStart) + 1;

                segmentsInput.push({
                    event,
                    segmentStart,
                    segmentEnd,
                    startIndex,
                    span,
                    totalDays,
                    currentDay,
                    isFirstSegment: segmentStart.getTime() === eventStart.getTime(),
                    isLastSegment: segmentEnd.getTime() === eventEnd.getTime(),
                    eventStart,
                    eventEnd
                });
            });

            segmentsInput.sort((a, b) => {
                const startDiff = a.segmentStart.getTime() - b.segmentStart.getTime();
                if (startDiff !== 0) return startDiff;
                const spanDiff = b.span - a.span;
                if (spanDiff !== 0) return spanDiff;
                return a.event.title.localeCompare(b.event.title);
            });

        const occupancy = Array.from({ length: MAX_RIBBON_ROWS }, () => new Array(7).fill(false));
        const segments: WeekSegment[] = [];
        let rowsUsed = 0;
        const overflowMultiDayMap = new Map<string, MultiDayEventInstance[]>();

        segmentsInput.forEach((segment) => {
            let placed = false;
            for (let row = 0; row < MAX_RIBBON_ROWS; row++) {
                let canPlace = true;
                for (let offset = 0; offset < segment.span; offset++) {
                    const dayIndex = segment.startIndex + offset;
                    if (dayIndex >= 7 || occupancy[row][dayIndex]) {
                        canPlace = false;
                        break;
                    }
                }

                if (!canPlace) {
                    continue;
                }

                for (let offset = 0; offset < segment.span; offset++) {
                    const dayIndex = segment.startIndex + offset;
                    if (dayIndex < 7) {
                        occupancy[row][dayIndex] = true;
                    }
                }

                const baseId = `${segment.event.id}-week${weekIndex}-row${row}-start${segment.startIndex}`;
                const continuationType = segment.isFirstSegment
                    ? 'start'
                    : segment.isLastSegment
                        ? 'end'
                        : 'middle';

                const cardEvent: MultiDayEventInstance = {
                    ...segment.event,
                    id: baseId,
                    isInstance: true,
                    originalEventId: segment.event.id,
                    instanceDate: segment.segmentStart.toISOString().split('T')[0],
                    dayInfo: {
                        currentDay: segment.currentDay,
                        totalDays: segment.totalDays,
                        isFirstDay: segment.isFirstSegment,
                        isLastDay: segment.isLastSegment,
                        continuationType
                    },
                    isMultiDay: true,
                    multiDaySpan: segment.totalDays,
                    multiDayStart: new Date(segment.eventStart),
                    multiDayEnd: new Date(segment.eventEnd)
                };

                segments.push({
                    id: cardEvent.id ?? baseId,
                    startIndex: segment.startIndex,
                    span: Math.min(segment.span, 7 - segment.startIndex),
                    row,
                    cardEvent
                });

                rowsUsed = Math.max(rowsUsed, row + 1);
                placed = true;
                break;
            }

            if (!placed) {
                for (let offset = 0; offset < segment.span; offset++) {
                    const dayIndex = segment.startIndex + offset;
                    if (dayIndex >= 7) continue;
                    const day = weekDays[dayIndex];
                    const dateKey = day.toISOString().split('T')[0];
                    const overflowList = overflowMultiDayMap.get(dateKey) ?? [];

                    const expectedDayNumber = segment.currentDay + offset;
                    const dayEvents = processedEventsByDate.get(dateKey) ?? [];
                    const targetInstance = dayEvents.find((evt) => {
                        if (!('isInstance' in evt) || !evt.isInstance) return false;
                        const instance = evt as MultiDayEventInstance;
                        if (instance.originalEventId !== segment.event.id) return false;
                        return instance.dayInfo?.currentDay === expectedDayNumber;
                    }) as MultiDayEventInstance | undefined;

                    if (targetInstance) {
                        overflowList.push(targetInstance);
                        overflowMultiDayMap.set(dateKey, overflowList);
                    }
                }
            }
            // Segments that cannot be placed within MAX_RIBBON_ROWS are redirected to overflow.
        });

            rowsUsed = Math.min(rowsUsed, MAX_RIBBON_ROWS);

            const ribbonHeight =
                rowsUsed > 0 ? rowsUsed * RIBBON_HEIGHT + (rowsUsed - 1) * RIBBON_GAP : 0;

            const daysData: DayData[] = weekDays.map((day) => {
                const dateKey = day.toISOString().split('T')[0];
                const allEvents = processedEventsByDate.get(dateKey) ?? [];
                const inlineCandidates = allEvents.filter(
                    (event) => !('dayInfo' in event && event.dayInfo)
                );
            const inlineEventsBase = inlineCandidates.slice(0, MAX_INLINE_EVENTS);
            const overflowEventsBase = inlineCandidates.slice(MAX_INLINE_EVENTS);
            const multiDayOverflow = overflowMultiDayMap.get(dateKey) ?? [];
            const remainingSlots = Math.max(0, MAX_INLINE_EVENTS - inlineEventsBase.length);
            const multiDayInline = multiDayOverflow.slice(0, remainingSlots);
            const inlineEvents = [...inlineEventsBase, ...multiDayInline];
            const overflowEvents = [
                ...overflowEventsBase,
                ...multiDayOverflow.slice(multiDayInline.length)
            ];

                return {
                    date: day,
                    dateKey,
                    inlineEvents,
                    overflowEvents,
                    modalEvents: allEvents,
                    isCurrentMonth: day.getMonth() === initialDate.getMonth(),
                    isToday: day.toDateString() === new Date().toDateString()
                };
            });

            weekDataList.push({
                days: daysData,
                segments,
                rowsUsed,
                ribbonHeight
            });
        }

        return weekDataList;
    }, [monthDays, events, processedEventsByDate, initialDate]);

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
            <CustomMonthGrid />

            {overflowState && (
                <MonthDayOverflowModal
                    date={overflowState.date}
                    events={overflowState.events}
                    onClose={handleCloseOverflow}
                    onSelectEvent={(event) => {
                        handleEventClick(event);
                        handleCloseOverflow();
                    }}
                />
            )}

            {/* Event Preview Card */}
            {previewState.event && (
                <EventPreviewCard
                    event={previewState.event}
                    isVisible={previewState.isVisible}
                    position={previewState.position}
                    onClose={hidePreview}
                    onHover={cancelHide}
                    onLeave={hidePreview}
                />
            )}
        </div>
    );
};

export default TechCalendarMonthView;
