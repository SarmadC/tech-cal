'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { EventClickArg } from '@/types/fullcalendar';
import { FullCalendar } from '@/types/fullcalendar';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { useEventPreview } from '@/hooks/useEventPreview';
import EventPreviewCard from './EventPreviewCard';
import { MonthEventCard } from './MonthEventCard';
import MonthDayPopover from './MonthDayPopover';
import '@/app/styles/event-card.css';
import '@/app/styles/monthly-view.css';

const MAX_VISIBLE_EVENTS_PER_DAY = 3;
const MAX_RIBBON_ROWS = 10;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DAY_HEADER_HEIGHT = 24;
const DAY_HEADER_GAP = 8;
const DAY_HEADER_EXTRA_GAP = 8;
const RIBBON_HEIGHT = 28;
const RIBBON_GAP = 3;
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

type InlineEvent = Event | MultiDayEventInstance;

const getInlineAccent = (event: InlineEvent) => {
    if (event.category?.color) return event.category.color;
    if ('color' in event && event.color) return event.color;
    return 'var(--accent-primary)';
};

const formatInlineMeta = (_event: InlineEvent) => {
    // Don't show any metadata - keep inline events clean with just title
    return '';
};

interface MonthInlineEventRowProps {
    event: InlineEvent;
    onSelect: (event: InlineEvent) => void;
    onHover: (event: InlineEvent, e: React.MouseEvent<HTMLButtonElement>) => void;
    onLeave: () => void;
}

const MonthInlineEventRow: React.FC<MonthInlineEventRowProps> = ({
    event,
    onSelect,
    onHover,
    onLeave
}) => {
    const accent = getInlineAccent(event);
    const meta = formatInlineMeta(event);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        onLeave();
        onSelect(event);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onLeave();
            onSelect(event);
        }
    };

    return (
        <button
            type="button"
            className="month-inline-event"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={(e) => onHover(event, e)}
            onMouseLeave={onLeave}
        >
            <span
                className="month-inline-event-accent"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
            />

            <span className="month-inline-event-content">
                <span className="month-inline-event-title" title={event.title}>
                    {event.title}
                </span>
                {meta && <span className="month-inline-event-meta">{meta}</span>}
            </span>
        </button>
    );
};

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
    const [expandedDays, setExpandedDays] = useState<Record<string, true>>({});
    const [popoverState, setPopoverState] = useState<{
        isOpen: boolean;
        dateKey: string;
        date: Date;
        events: (Event | MultiDayEventInstance)[];
        position?: { x: number; y: number };
    }>({
        isOpen: false,
        dateKey: '',
        date: new Date(),
        events: []
    });

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

    const openOverflowPopover = useCallback((
        dateKey: string,
        date: Date,
        events: (Event | MultiDayEventInstance)[],
        e: React.MouseEvent<HTMLButtonElement>
    ) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopoverState({
            isOpen: true,
            dateKey,
            date,
            events,
            position: {
                x: rect.left + rect.width / 2,
                y: rect.bottom
            }
        });
        hidePreview();
    }, [hidePreview]);

    const closeOverflowPopover = useCallback(() => {
        setPopoverState((prev) => ({ ...prev, isOpen: false }));
    }, []);

    React.useEffect(() => {
        setExpandedDays({});
    }, [initialDate]);

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
                                    const isExpanded = !!expandedDays[dayData.dateKey];
                                    const visibleEvents = isExpanded
                                        ? [...dayData.inlineEvents, ...dayData.overflowEvents]
                                        : dayData.inlineEvents;

                                    return (
                                        <div
                                            key={dayData.dateKey}
                                            className={`month-grid-day ${dayData.isCurrentMonth ? 'current-month' : 'other-month'} ${dayData.isToday ? 'today' : ''} ${isExpanded ? 'expanded' : ''}`}
                                        >
                                            <div className="month-grid-day-number">
                                                {dayData.date.getDate()}
                                            </div>

                                            <div
                                                className="month-grid-day-events"
                                                style={{ marginTop: eventOffset }}
                                            >
                                                {visibleEvents.map((event, eventIndex) => (
                                                    <div key={`${event.id}-${eventIndex}`} className="month-grid-event">
                                                        <MonthInlineEventRow
                                                            event={event}
                                                            onSelect={handleEventClick}
                                                            onHover={handleEventHover}
                                                            onLeave={hidePreview}
                                                        />
                                                    </div>
                                                ))}

                                                {dayData.overflowEvents.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="month-grid-more-button"
                                                        onClick={(e) => openOverflowPopover(dayData.dateKey, dayData.date, dayData.overflowEvents, e)}
                                                        onMouseEnter={() => hidePreview()}
                                                        onFocus={() => hidePreview()}
                                                        aria-label={`Show ${dayData.overflowEvents.length} more events on ${dayData.date.toLocaleDateString(undefined, {
                                                            weekday: 'long',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}`}
                                                    >
                                                        {`+${dayData.overflowEvents.length} more`}
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
            const startDate = startOfDay(new Date(event.startTime));
            const endDate = startOfDay(event.endTime ? new Date(event.endTime) : new Date(event.startTime));
            const daysDiff = diffInDays(endDate, startDate);

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

        // Phase 1: Identify events that span 2 or more days (multi-day events)
        const multiDayEvents: Array<{
            event: Event;
            daySpan: number;
        }> = [];

        events.forEach((event) => {
            const eventStart = startOfDay(new Date(event.startTime));
            const rawEnd = event.endTime ? new Date(event.endTime) : new Date(event.startTime);
            const eventEnd = startOfDay(rawEnd);

            // Calculate how many days this event spans
            const daySpan = diffInDays(eventEnd, eventStart) + 1;

            // If event spans 2 or more days, add to multi-day list
            if (daySpan >= 2) {
                multiDayEvents.push({
                    event,
                    daySpan
                });
            }
        });

        // Phase 2: Allocate ribbon rows to multi-day events
        // Sort by: daySpan DESC (longer first), then start date ASC, then title ASC
        multiDayEvents.sort((a, b) => {
            if (a.daySpan !== b.daySpan) return b.daySpan - a.daySpan;
            const aStart = a.event.startTime;
            const bStart = b.event.startTime;
            if (aStart !== bStart) return aStart.localeCompare(bStart);
            return a.event.title.localeCompare(b.event.title);
        });

        const multiDayAllocation = new Map<string, number>(); // eventId → ribbonRow
        for (let i = 0; i < Math.min(multiDayEvents.length, MAX_RIBBON_ROWS); i++) {
            const event = multiDayEvents[i].event;
            multiDayAllocation.set(event.id, i);
        }

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

            // Check if this event has a pre-allocated row for multi-day events
            const preallocatedRow = multiDayAllocation.get(segment.event.id);

            if (preallocatedRow !== undefined) {
                // Try to place in pre-allocated row first
                const row = preallocatedRow;
                let canPlace = true;
                for (let offset = 0; offset < segment.span; offset++) {
                    const dayIndex = segment.startIndex + offset;
                    if (dayIndex >= 7 || occupancy[row][dayIndex]) {
                        canPlace = false;
                        break;
                    }
                }

                if (canPlace) {
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
                }
            }

            // If not pre-allocated or didn't fit, try other rows
            if (!placed) {
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

            const daysData: DayData[] = weekDays.map((day, dayIndexInWeek) => {
                const dateKey = day.toISOString().split('T')[0];
                const allEvents = processedEventsByDate.get(dateKey) ?? [];

                // Collect all original event IDs that are being rendered as ribbon segments
                const ribbonEventIds = new Set<string>();
                segments.forEach(segment => {
                    if ('originalEventId' in segment.cardEvent && segment.cardEvent.originalEventId) {
                        ribbonEventIds.add(segment.cardEvent.originalEventId);
                    }
                });

                // Exclude events with dayInfo (multi-day instances) and events already in ribbons
                const inlineCandidates = allEvents.filter(
                    (event) => {
                        // Exclude multi-day day instances (have dayInfo property)
                        if ('dayInfo' in event && event.dayInfo) {
                            return false;
                        }
                        // Exclude events that are already rendered as ribbon segments
                        // Check both the event's own ID and its originalEventId (if it's a segment instance)
                        if (ribbonEventIds.has(event.id)) {
                            return false;
                        }
                        if ('originalEventId' in event && event.originalEventId && ribbonEventIds.has(event.originalEventId)) {
                            return false;
                        }
                        return true;
                    }
                );

                // Count ribbon segments that appear on this day
                const ribbonSegmentsOnDay = segments.filter(segment =>
                    segment.startIndex <= dayIndexInWeek && dayIndexInWeek < segment.startIndex + segment.span
                );
                // Count unique ribbon rows (multiple segments on same row = 1 visual event)
                const uniqueRibbonRows = new Set(ribbonSegmentsOnDay.map(s => s.row)).size;

                // Calculate available inline slots based on ribbon count
                const availableInlineSlots = Math.max(0, MAX_VISIBLE_EVENTS_PER_DAY - uniqueRibbonRows);

                // Slice inline events to fit available slots
                const inlineEventsBase = inlineCandidates.slice(0, availableInlineSlots);
                const overflowEventsBase = inlineCandidates.slice(availableInlineSlots);

                const multiDayOverflow = overflowMultiDayMap.get(dateKey) ?? [];
                const remainingSlots = Math.max(0, availableInlineSlots - inlineEventsBase.length);
                const multiDayInline = multiDayOverflow.slice(0, remainingSlots);
                const inlineEvents = [...inlineEventsBase, ...multiDayInline];

                // If there are too many ribbons, hide the excess ones
                let hiddenRibbonEvents: (Event | MultiDayEventInstance)[] = [];
                if (uniqueRibbonRows > MAX_VISIBLE_EVENTS_PER_DAY) {
                    // We have more ribbons than allowed, hide the excess
                    const visibleRibbonRows = MAX_VISIBLE_EVENTS_PER_DAY;
                    const hiddenRibbonSegments = ribbonSegmentsOnDay.slice(visibleRibbonRows);
                    // Only add to overflow if this is the starting day of the event
                    // (don't show the same event in overflow on multiple days it spans)
                    const addedEventIds = new Set<string>();
                    hiddenRibbonEvents = hiddenRibbonSegments
                        .filter(seg => seg.startIndex === dayIndexInWeek)
                        .filter(seg => {
                            // Avoid adding the same event multiple times
                            if (addedEventIds.has(seg.cardEvent.id)) {
                                return false;
                            }
                            addedEventIds.add(seg.cardEvent.id);
                            return true;
                        })
                        .map(seg => seg.cardEvent);
                }

                const overflowEvents = [
                    ...overflowEventsBase,
                    ...multiDayOverflow.slice(multiDayInline.length),
                    ...hiddenRibbonEvents
                ];

                return {
                    date: day,
                    dateKey,
                    inlineEvents,
                    overflowEvents,
                    isCurrentMonth: day.getMonth() === initialDate.getMonth(),
                    isToday: day.toDateString() === new Date().toDateString()
                };
            });

            // Filter segments to exclude ones that are hidden due to per-day limits
            const hiddenSegmentIds = new Set<string>();

            weekDays.forEach((day, dayIndexInWeek) => {
                const ribbonSegmentsOnDay = segments.filter(segment =>
                    segment.startIndex <= dayIndexInWeek && dayIndexInWeek < segment.startIndex + segment.span
                );
                const uniqueRibbonRows = new Set(ribbonSegmentsOnDay.map(s => s.row)).size;

                // If too many ribbons on this day, mark the excess ones as hidden
                if (uniqueRibbonRows > MAX_VISIBLE_EVENTS_PER_DAY) {
                    // Sort segments by row to ensure consistent ordering
                    const sortedSegments = [...ribbonSegmentsOnDay].sort((a, b) => a.row - b.row);

                    // Get the first MAX_VISIBLE_EVENTS_PER_DAY unique rows
                    const visibleRows = new Set(
                        [...new Set(sortedSegments.map(s => s.row))]
                            .slice(0, MAX_VISIBLE_EVENTS_PER_DAY)
                    );

                    // Hide segments on non-visible rows
                    const hiddenSegments = sortedSegments.filter(s => !visibleRows.has(s.row));
                    hiddenSegments.forEach(seg => hiddenSegmentIds.add(seg.id));
                }
            });

            const visibleSegments = segments.filter(seg => !hiddenSegmentIds.has(seg.id));

            weekDataList.push({
                days: daysData,
                segments: visibleSegments,
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

            {/* Month Day Overflow Popover */}
            <MonthDayPopover
                events={popoverState.events}
                date={popoverState.date}
                isOpen={popoverState.isOpen}
                onClose={closeOverflowPopover}
                position={popoverState.position}
                onEventSelect={handleEventClick}
                onEventHover={handleEventHover}
                onEventLeave={hidePreview}
            />
        </div>
    );
};

// Export helper components and functions for use in MonthDayPopover
export { MonthInlineEventRow, getInlineAccent, formatInlineMeta };
export type { InlineEvent };

export default TechCalendarMonthView;
