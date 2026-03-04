'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { EventClickArg } from '@/types/fullcalendar';
import { FullCalendar } from '@/types/fullcalendar';
import { Event, EventType, AppProfile, MultiDayEvent, MultiDayEventInstance } from '@/types';
import { getEventAccentColor } from '@/utils/calendarColorUtils';
import { MonthEventCard } from './MonthEventCard';
import '@/app/styles/event-card.css';
import '@/app/styles/monthly-view.css';

const MAX_VISIBLE_EVENTS_PER_DAY = 2;
const MAX_RIBBON_ROWS = 2;
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
    ribbonsHeightOnDay: number;
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

// getInlineAccent removed in favor of getEventAccentColor from calendarColorUtils

const formatInlineMeta = (_event: InlineEvent) => {
    // Don't show any metadata - keep inline events clean with just title
    return '';
};

interface MonthInlineEventRowProps {
    event: InlineEvent;
    onSelect: (event: InlineEvent) => void;
    onHover: (event: InlineEvent, e: React.MouseEvent) => void;
    onLeave: () => void;
    style?: React.CSSProperties;
    compact?: boolean;
}

const MonthInlineEventRow: React.FC<MonthInlineEventRowProps> = ({
    event,
    onSelect,
    onHover,
    onLeave,
    style,
    compact = false
}) => {
    const handleClick = () => {
        onLeave();
        onSelect(event);
    };

    const classNames = ['month-inline-event-card'];
    if (compact) {
        classNames.push('month-event-card--quiet');
    }
    if (!('isInstance' in event && event.isInstance)) {
        classNames.push('month-event-card--span-single');
    }

    return (
        <MonthEventCard
            event={event}
            onClick={handleClick}
            onHover={(e) => onHover(event, e)}
            onLeave={onLeave}
            className={classNames.join(' ')}
            style={style}
        />
    );
};

const MonthOverflowDots: React.FC<{ events: InlineEvent[] }> = ({ events }) => (
    <span className="month-grid-more-dots" aria-hidden="true">
        {events.map((event, index) => (
            <span
                key={`${event.id}-${index}`}
                className="month-grid-more-dot"
                style={{ backgroundColor: getEventAccentColor(event) }}
            />
        ))}
    </span>
);

const makeEventBaseKey = (event: Event | MultiDayEvent) => {
    if (event.id) return event.id;
    const fallbackTitle = event.title ?? 'untitled';
    return `${fallbackTitle}-${event.startTime}-${event.endTime ?? 'no-end'}`;
};

const makePerDayInstanceKey = (event: Event | MultiDayEventInstance, dateKey: string) => {
    if ('isInstance' in event && event.isInstance) {
        const originId = event.originalEventId ?? event.id ?? 'unknown';
        const instanceDate = event.instanceDate ?? dateKey;
        return `${originId}::${instanceDate}`;
    }
    const baseId = event.id ?? `${event.title ?? 'untitled'}-${event.startTime}`;
    return `${baseId}::${dateKey}`;
};

const makeCellEventKey = (event: Event | MultiDayEventInstance, dateKey: string) => {
    if ('isInstance' in event && event.isInstance) {
        const originId = event.originalEventId ?? event.id ?? 'unknown';
        return `${originId}::${dateKey}`;
    }
    const baseId = event.id ?? `${event.title ?? 'untitled'}-${event.startTime}`;
    return `${baseId}::${dateKey}`;
};

const getOverflowIndicatorEvents = (events: InlineEvent[]) => {
    const indicatorEvents: InlineEvent[] = [];
    const seenEventKeys = new Set<string>();

    events.forEach((event) => {
        if ('isInstance' in event && event.isInstance) {
            const baseId = event.originalEventId ?? event.id ?? 'unknown';
            const isMultiDayContinuation =
                !!event.dayInfo &&
                event.dayInfo.totalDays > 1 &&
                !event.dayInfo.isFirstDay;

            if (isMultiDayContinuation) {
                return;
            }

            if (seenEventKeys.has(baseId)) {
                return;
            }

            seenEventKeys.add(baseId);
            indicatorEvents.push(event);
            return;
        }

        const baseId = event.id ?? `${event.title ?? 'untitled'}-${event.startTime}`;
        if (seenEventKeys.has(baseId)) {
            return;
        }

        seenEventKeys.add(baseId);
        indicatorEvents.push(event);
    });

    return indicatorEvents;
};

export const groupEventsByDate = (processedEvents: (Event | MultiDayEventInstance)[]) => {
    const grouped = new Map<string, (Event | MultiDayEventInstance)[]>();
    const seenByDate = new Map<string, Set<string>>();

    processedEvents.forEach((event) => {
        let dateKey: string;
        if ('isInstance' in event && event.isInstance) {
            dateKey = event.instanceDate;
        } else {
            const eventDate = new Date(event.startTime);
            dateKey = eventDate.toISOString().split('T')[0];
        }

        const dedupeKey = makePerDayInstanceKey(event as MultiDayEventInstance, dateKey);
        const seenForDate = seenByDate.get(dateKey) ?? new Set<string>();
        if (seenForDate.has(dedupeKey)) {
            return;
        }
        seenForDate.add(dedupeKey);
        seenByDate.set(dateKey, seenForDate);

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
    const noop = useCallback(() => { }, []);
    const [expandedDays, setExpandedDays] = useState<Record<string, true>>({});

    const handleEventClick = useCallback((event: Event | MultiDayEventInstance) => {
        onEventSelect?.(event);
    }, [onEventSelect]);

    const handleEventHover = useCallback((_event: Event | MultiDayEventInstance, _e: React.MouseEvent) => { }, []);
    const toggleExpandedDay = useCallback((dateKey: string) => {
        setExpandedDays((prev) => {
            if (prev[dateKey]) {
                const next = { ...prev };
                delete next[dateKey];
                return next;
            }

            return { ...prev, [dateKey]: true };
        });
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
                                                    onLeave={noop}
                                                    className="month-event-card--quiet"
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
                                        dayData.ribbonsHeightOnDay +
                                        (dayData.ribbonsHeightOnDay > 0 ? 12 : 8);
                                    const isExpanded = !!expandedDays[dayData.dateKey];
                                    const overflowIndicatorEvents = getOverflowIndicatorEvents(dayData.overflowEvents);
                                    const showOverflowControl = isExpanded
                                        ? dayData.overflowEvents.length > 0
                                        : overflowIndicatorEvents.length > 0;

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
                                                {dayData.inlineEvents.map((event, eventIndex) => (
                                                    <div key={`${event.id}-${eventIndex}`} className="month-grid-event">
                                                        <MonthInlineEventRow
                                                            event={event}
                                                            onSelect={handleEventClick}
                                                            onHover={handleEventHover}
                                                            onLeave={noop}
                                                            compact={false}
                                                        />
                                                    </div>
                                                ))}

                                                {isExpanded && dayData.overflowEvents.map((event, eventIndex) => (
                                                    <div key={`${event.id}-overflow-${eventIndex}`} className="month-grid-event">
                                                        <MonthInlineEventRow
                                                            event={event}
                                                            onSelect={handleEventClick}
                                                            onHover={handleEventHover}
                                                            onLeave={noop}
                                                            compact
                                                        />
                                                    </div>
                                                ))}

                                                {showOverflowControl && (
                                                    <button
                                                        type="button"
                                                        className="month-grid-more-button"
                                                        onClick={() => toggleExpandedDay(dayData.dateKey)}
                                                        onMouseEnter={noop}
                                                        onFocus={noop}
                                                        aria-expanded={isExpanded}
                                                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} events on ${dayData.date.toLocaleDateString(undefined, {
                                                            weekday: 'long',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}`}
                                                    >
                                                        {isExpanded ? (
                                                            <span className="month-grid-more-collapse-label">
                                                                Show less
                                                            </span>
                                                        ) : (
                                                            <MonthOverflowDots events={overflowIndicatorEvents} />
                                                        )}
                                                        <span className="sr-only">
                                                            {isExpanded
                                                                ? `Collapse ${dayData.overflowEvents.length} extra events`
                                                                : `Show ${overflowIndicatorEvents.length} extra events`}
                                                        </span>
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
        const seenBaseEvents = new Set<string>();

        events.forEach(event => {
            const baseKey = makeEventBaseKey(event);
            if (seenBaseEvents.has(baseKey)) {
                return;
            }
            seenBaseEvents.add(baseKey);
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

    const processedEventsByDate = useMemo(() => groupEventsByDate(processedEvents), [processedEvents]);

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

        // GLOBAL PASS: Identify multi-day events that will be visible in ribbons in ANY week
        // This ensures cross-week unification - if visible in one week, visible in all weeks
        const globallyVisibleMultiDayEvents = new Set<string>();

        // First, do a preliminary pass to see which multi-day events get ribbons in any week
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

            segmentsInput.forEach((segment) => {
                let placed = false;
                const preallocatedRow = multiDayAllocation.get(segment.event.id);

                if (preallocatedRow !== undefined) {
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
                        placed = true;
                    }
                }

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
                            placed = true;
                            break;
                        }
                    }
                }
            });

            // Mark multi-day events that are placed in ribbons in this week
            segments.forEach(seg => {
                if ('originalEventId' in seg.cardEvent && seg.cardEvent.originalEventId) {
                    globallyVisibleMultiDayEvents.add(seg.cardEvent.originalEventId);
                }
            });
        }

        // Now process each week with the global visibility information
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

                // CRITICAL: If this is a globally visible multi-day event, it MUST be placed in ribbons
                // Force placement even if it means displacing other events
                const isGloballyVisible = globallyVisibleMultiDayEvents.has(segment.event.id);

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
                    // CRITICAL: If this is a globally visible multi-day event, we MUST place it in ribbons
                    // Force placement even if it means displacing other events or using additional rows
                    if (isGloballyVisible) {
                        // Find any available row, or create space by displacing non-global events
                        let forcedRow = -1;

                        // First, try to find an empty row
                        for (let row = 0; row < MAX_RIBBON_ROWS; row++) {
                            let canPlace = true;
                            for (let offset = 0; offset < segment.span; offset++) {
                                const dayIndex = segment.startIndex + offset;
                                if (dayIndex >= 7) continue;
                                if (occupancy[row][dayIndex]) {
                                    // Check if the conflicting segment is also globally visible
                                    const conflictingSeg = segments.find(s =>
                                        s.row === row &&
                                        s.startIndex <= dayIndex &&
                                        dayIndex < s.startIndex + s.span
                                    );
                                    if (conflictingSeg && 'originalEventId' in conflictingSeg.cardEvent &&
                                        conflictingSeg.cardEvent.originalEventId &&
                                        globallyVisibleMultiDayEvents.has(conflictingSeg.cardEvent.originalEventId)) {
                                        canPlace = false;
                                        break;
                                    }
                                    // If conflicting segment is not globally visible, we can displace it
                                }
                            }
                            if (canPlace) {
                                // Remove any conflicting non-global segments
                                for (let offset = 0; offset < segment.span; offset++) {
                                    const dayIndex = segment.startIndex + offset;
                                    if (dayIndex >= 7) continue;
                                    const conflictingSegs = segments.filter(s =>
                                        s.row === row &&
                                        s.startIndex <= dayIndex &&
                                        dayIndex < s.startIndex + s.span
                                    );
                                    conflictingSegs.forEach(confSeg => {
                                        if ('originalEventId' in confSeg.cardEvent && confSeg.cardEvent.originalEventId) {
                                            if (!globallyVisibleMultiDayEvents.has(confSeg.cardEvent.originalEventId)) {
                                                // Remove this conflicting segment
                                                const index = segments.indexOf(confSeg);
                                                if (index > -1) {
                                                    segments.splice(index, 1);
                                                    // Clear its occupancy
                                                    for (let o = 0; o < confSeg.span; o++) {
                                                        const dIdx = confSeg.startIndex + o;
                                                        if (dIdx < 7) {
                                                            occupancy[confSeg.row][dIdx] = false;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    });
                                }
                                forcedRow = row;
                                break;
                            }
                        }

                        // If we found a row, place the segment
                        if (forcedRow >= 0) {
                            for (let offset = 0; offset < segment.span; offset++) {
                                const dayIndex = segment.startIndex + offset;
                                if (dayIndex < 7) {
                                    occupancy[forcedRow][dayIndex] = true;
                                }
                            }

                            const baseId = `${segment.event.id}-week${weekIndex}-row${forcedRow}-start${segment.startIndex}`;
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
                                row: forcedRow,
                                cardEvent
                            });

                            rowsUsed = Math.max(rowsUsed, forcedRow + 1);
                            placed = true;
                        }
                    }

                    // If still not placed, add to overflow (only for non-globally-visible events)
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
                }
                // Segments that cannot be placed within MAX_RIBBON_ROWS are redirected to overflow.
            });

            // CRITICAL: Post-placement collision detection and resolution
            // Check for any segments that overlap in the same grid position (same row, overlapping columns)
            const collisionResolvedIds = new Set<string>();
            const processedSegIds = new Set<string>();

            // For each segment, check if it overlaps with any other segment in the same row
            segments.forEach((seg, segIndex) => {
                if (processedSegIds.has(seg.id) || collisionResolvedIds.has(seg.id)) return;

                const segStart = seg.startIndex;
                const segEnd = seg.startIndex + seg.span - 1;

                // Find all other segments that overlap with this one in the same row
                const overlappingSegs: WeekSegment[] = [seg];

                segments.forEach((otherSeg, otherIndex) => {
                    if (segIndex === otherIndex) return;
                    if (processedSegIds.has(otherSeg.id) || collisionResolvedIds.has(otherSeg.id)) return;
                    if (seg.row !== otherSeg.row) return; // Different rows, no collision

                    const otherStart = otherSeg.startIndex;
                    const otherEnd = otherSeg.startIndex + otherSeg.span - 1;

                    // Check if column ranges overlap
                    const overlaps = !(segEnd < otherStart || segStart > otherEnd);

                    if (overlaps) {
                        overlappingSegs.push(otherSeg);
                    }
                });

                // If we found overlaps, resolve them
                if (overlappingSegs.length > 1) {
                    // Sort by priority:
                    // 1. Globally visible multi-day events (highest priority)
                    // 2. Longer spans (more days)
                    // 3. Earlier start index
                    overlappingSegs.sort((a, b) => {
                        const aIsGlobal = 'originalEventId' in a.cardEvent && a.cardEvent.originalEventId &&
                            globallyVisibleMultiDayEvents.has(a.cardEvent.originalEventId);
                        const bIsGlobal = 'originalEventId' in b.cardEvent && b.cardEvent.originalEventId &&
                            globallyVisibleMultiDayEvents.has(b.cardEvent.originalEventId);

                        if (aIsGlobal !== bIsGlobal) return aIsGlobal ? -1 : 1;

                        // If both are global or both are not, prefer longer spans
                        const spanDiff = b.span - a.span;
                        if (spanDiff !== 0) return spanDiff;

                        // Finally, prefer earlier start
                        return a.startIndex - b.startIndex;
                    });

                    // Keep the first (highest priority), mark the rest for removal
                    for (let i = 1; i < overlappingSegs.length; i++) {
                        collisionResolvedIds.add(overlappingSegs[i].id);
                        processedSegIds.add(overlappingSegs[i].id);
                    }
                }

                processedSegIds.add(seg.id);
            });

            // Remove colliding segments from the segments array and add to overflow
            if (collisionResolvedIds.size > 0) {
                for (let i = segments.length - 1; i >= 0; i--) {
                    if (collisionResolvedIds.has(segments[i].id)) {
                        const seg = segments[i];

                        // Clear occupancy for removed segment
                        for (let offset = 0; offset < seg.span; offset++) {
                            const dayIndex = seg.startIndex + offset;
                            if (dayIndex < 7) {
                                occupancy[seg.row][dayIndex] = false;
                            }
                        }

                        // Add removed segment to overflow for each day it spans
                        for (let offset = 0; offset < seg.span; offset++) {
                            const dayIndex = seg.startIndex + offset;
                            if (dayIndex >= 7) continue;
                            const day = weekDays[dayIndex];
                            const dateKey = day.toISOString().split('T')[0];
                            const overflowList = overflowMultiDayMap.get(dateKey) ?? [];

                            // Check if this is a multi-day event instance
                            if ('isInstance' in seg.cardEvent && seg.cardEvent.isInstance &&
                                'originalEventId' in seg.cardEvent && seg.cardEvent.originalEventId) {
                                const cardEventInstance = seg.cardEvent as MultiDayEventInstance;
                                const expectedDayNumber = cardEventInstance.dayInfo?.currentDay ?? (offset + 1);
                                const dayEvents = processedEventsByDate.get(dateKey) ?? [];
                                const targetInstance = dayEvents.find((evt) => {
                                    if (!('isInstance' in evt) || !evt.isInstance) return false;
                                    const instance = evt as MultiDayEventInstance;
                                    if (!instance.originalEventId || instance.originalEventId !== cardEventInstance.originalEventId) return false;
                                    return instance.dayInfo?.currentDay === expectedDayNumber;
                                }) as MultiDayEventInstance | undefined;

                                if (targetInstance && !overflowList.some(e =>
                                ('isInstance' in e && e.isInstance && 'originalEventId' in e &&
                                    e.originalEventId === targetInstance.originalEventId &&
                                    'instanceDate' in e && e.instanceDate === targetInstance.instanceDate)
                                )) {
                                    overflowList.push(targetInstance);
                                    overflowMultiDayMap.set(dateKey, overflowList);
                                }
                            } else {
                                // Single-day event - add the cardEvent itself (cast to MultiDayEventInstance for type compatibility)
                                const cardEventAsInstance = seg.cardEvent as unknown as MultiDayEventInstance;
                                if (!overflowList.some(e => e.id === seg.cardEvent.id)) {
                                    overflowList.push(cardEventAsInstance);
                                    overflowMultiDayMap.set(dateKey, overflowList);
                                }
                            }
                        }

                        segments.splice(i, 1);
                    }
                }
            }

            rowsUsed = Math.min(rowsUsed, MAX_RIBBON_ROWS);

            const ribbonHeight =
                rowsUsed > 0 ? rowsUsed * RIBBON_HEIGHT + (rowsUsed - 1) * RIBBON_GAP : 0;

            // Filter segments to exclude ones that are hidden due to per-day limits
            // First, identify all multi-day events by their originalEventId
            const multiDayEventIds = new Set<string>();
            segments.forEach(segment => {
                if ('originalEventId' in segment.cardEvent && segment.cardEvent.originalEventId) {
                    multiDayEventIds.add(segment.cardEvent.originalEventId);
                }
            });

            const hiddenSegmentIds = new Set<string>();

            // First pass: identify which multi-day events will be visible on at least one day
            // This ensures we keep them unified across all days
            // Start with globally visible events (from cross-week unification)
            const multiDayEventsVisibleOnAnyDay = new Set<string>(globallyVisibleMultiDayEvents);

            weekDays.forEach((day, dayIndexInWeek) => {
                const ribbonSegmentsOnDay = segments.filter(segment =>
                    segment.startIndex <= dayIndexInWeek && dayIndexInWeek < segment.startIndex + segment.span
                );
                const uniqueRibbonRows = new Set(ribbonSegmentsOnDay.map(s => s.row)).size;

                if (uniqueRibbonRows <= MAX_VISIBLE_EVENTS_PER_DAY) {
                    // All segments are visible on this day - mark multi-day events as visible
                    ribbonSegmentsOnDay.forEach(seg => {
                        if ('originalEventId' in seg.cardEvent && seg.cardEvent.originalEventId) {
                            multiDayEventsVisibleOnAnyDay.add(seg.cardEvent.originalEventId);
                        }
                    });
                } else {
                    // Some segments will be hidden - prioritize multi-day events up to limit
                    const sortedSegments = [...ribbonSegmentsOnDay].sort((a, b) => a.row - b.row);
                    const multiDaySegments = sortedSegments.filter(seg => {
                        if ('originalEventId' in seg.cardEvent && seg.cardEvent.originalEventId) {
                            return multiDayEventIds.has(seg.cardEvent.originalEventId);
                        }
                        return false;
                    });
                    const multiDayRows = new Set(multiDaySegments.map(s => s.row));
                    const allUniqueRows = [...new Set(sortedSegments.map(s => s.row))];

                    // Prioritize multi-day rows but enforce the 3-event limit
                    const prioritizedRows = new Set<number>();

                    // Add multi-day rows first, up to the limit
                    for (const row of multiDayRows) {
                        if (prioritizedRows.size < MAX_VISIBLE_EVENTS_PER_DAY) {
                            prioritizedRows.add(row);
                        } else {
                            break;
                        }
                    }

                    // Then add other rows up to the limit
                    for (const row of allUniqueRows) {
                        if (prioritizedRows.size >= MAX_VISIBLE_EVENTS_PER_DAY) break;
                        if (!prioritizedRows.has(row)) {
                            prioritizedRows.add(row);
                        }
                    }

                    // Mark multi-day events that will be visible on this day (only those in prioritized rows)
                    sortedSegments
                        .filter(s => prioritizedRows.has(s.row))
                        .forEach(seg => {
                            if ('originalEventId' in seg.cardEvent && seg.cardEvent.originalEventId) {
                                multiDayEventsVisibleOnAnyDay.add(seg.cardEvent.originalEventId);
                            }
                        });
                }
            });

            // Second pass: hide segments, but keep multi-day events unified
            weekDays.forEach((day, dayIndexInWeek) => {
                const ribbonSegmentsOnDay = segments.filter(segment =>
                    segment.startIndex <= dayIndexInWeek && dayIndexInWeek < segment.startIndex + segment.span
                );
                const uniqueRibbonRows = new Set(ribbonSegmentsOnDay.map(s => s.row)).size;

                // If too many ribbons on this day, mark the excess ones as hidden
                if (uniqueRibbonRows > MAX_VISIBLE_EVENTS_PER_DAY) {
                    // Sort segments by row to ensure consistent ordering
                    const sortedSegments = [...ribbonSegmentsOnDay].sort((a, b) => a.row - b.row);

                    // Get all unique rows
                    const allUniqueRows = [...new Set(sortedSegments.map(s => s.row))];

                    // CRITICAL: First, add ALL rows that contain segments of multi-day events
                    // that are visible on ANY day (including globally visible from other weeks).
                    // This ensures unification across all days AND across week boundaries.
                    // These rows MUST be visible, even if it means exceeding the daily limit.
                    const unifiedMultiDayRows = new Set<number>();
                    sortedSegments.forEach(seg => {
                        if ('originalEventId' in seg.cardEvent && seg.cardEvent.originalEventId) {
                            // Check both per-week visibility and global cross-week visibility
                            if (multiDayEventsVisibleOnAnyDay.has(seg.cardEvent.originalEventId) ||
                                globallyVisibleMultiDayEvents.has(seg.cardEvent.originalEventId)) {
                                unifiedMultiDayRows.add(seg.row);
                            }
                        }
                    });

                    // Build prioritized rows: unified multi-day events get priority but count toward limit
                    // All ribbons (multi-day + single-day) must respect the MAX_VISIBLE_EVENTS_PER_DAY limit
                    const prioritizedRows = new Set<number>();

                    // First, add unified multi-day event rows (they get priority)
                    let slotsUsed = 0;
                    for (const row of unifiedMultiDayRows) {
                        if (slotsUsed < MAX_VISIBLE_EVENTS_PER_DAY) {
                            prioritizedRows.add(row);
                            slotsUsed++;
                        } else {
                            break; // Stop adding once we hit the limit
                        }
                    }

                    // Then add other rows (non-unified) up to the remaining slots
                    const nonUnifiedRows = allUniqueRows.filter(row => !unifiedMultiDayRows.has(row));
                    const remainingSlots = MAX_VISIBLE_EVENTS_PER_DAY - slotsUsed;
                    for (let i = 0; i < remainingSlots && i < nonUnifiedRows.length; i++) {
                        prioritizedRows.add(nonUnifiedRows[i]);
                    }

                    const visibleRows = prioritizedRows;

                    // Hide segments on non-visible rows
                    // Multi-day events that are unified should never be hidden
                    const segmentsToHide = sortedSegments.filter(s => !visibleRows.has(s.row));

                    segmentsToHide.forEach(seg => {
                        // Never hide segments of unified multi-day events
                        // Check both per-week and global cross-week visibility
                        const isUnifiedMultiDay = 'originalEventId' in seg.cardEvent &&
                            seg.cardEvent.originalEventId &&
                            (multiDayEventsVisibleOnAnyDay.has(seg.cardEvent.originalEventId) ||
                                globallyVisibleMultiDayEvents.has(seg.cardEvent.originalEventId));

                        if (!isUnifiedMultiDay) {
                            hiddenSegmentIds.add(seg.id);
                        }
                    });
                }
            });

            const visibleSegments = segments.filter(seg => !hiddenSegmentIds.has(seg.id));

            const daysData: DayData[] = weekDays.map((day, dayIndexInWeek) => {
                const dateKey = day.toISOString().split('T')[0];
                const allEvents = processedEventsByDate.get(dateKey) ?? [];

                // Only treat the final visible ribbon segments as "already shown" on the grid.
                const ribbonEventIds = new Set<string>();
                visibleSegments.forEach(segment => {
                    if ('originalEventId' in segment.cardEvent && segment.cardEvent.originalEventId) {
                        ribbonEventIds.add(segment.cardEvent.originalEventId);
                    }
                });

                // Exclude events with dayInfo (multi-day instances) and events already in visible ribbons.
                const inlineCandidates = allEvents.filter((event) => {
                    if ('dayInfo' in event && event.dayInfo) {
                        return false;
                    }
                    if (ribbonEventIds.has(event.id)) {
                        return false;
                    }
                    if ('originalEventId' in event && event.originalEventId && ribbonEventIds.has(event.originalEventId)) {
                        return false;
                    }
                    if ('originalEventId' in event && event.originalEventId && globallyVisibleMultiDayEvents.has(event.originalEventId)) {
                        return false;
                    }
                    if (globallyVisibleMultiDayEvents.has(event.id)) {
                        return false;
                    }
                    return true;
                });

                const visibleRibbonSegmentsOnDay = visibleSegments.filter(segment =>
                    segment.startIndex <= dayIndexInWeek && dayIndexInWeek < segment.startIndex + segment.span
                );

                let maxRibbonRow = -1;
                visibleRibbonSegmentsOnDay.forEach(s => {
                    if (s.row > maxRibbonRow) maxRibbonRow = s.row;
                });
                const rowsUsedOnDay = maxRibbonRow + 1;
                const ribbonsHeightOnDay = rowsUsedOnDay > 0 ? rowsUsedOnDay * RIBBON_HEIGHT + (rowsUsedOnDay - 1) * RIBBON_GAP : 0;

                const uniqueRibbonRows = new Set(visibleRibbonSegmentsOnDay.map(s => s.row)).size;
                const availableInlineSlots = Math.max(0, MAX_VISIBLE_EVENTS_PER_DAY - uniqueRibbonRows);

                const inlineEvents = inlineCandidates.slice(0, availableInlineSlots);
                const overflowEventsBase = inlineCandidates.slice(availableInlineSlots);
                const multiDayOverflow = overflowMultiDayMap.get(dateKey) ?? [];

                const hiddenRibbonEvents = segments
                    .filter(segment =>
                        hiddenSegmentIds.has(segment.id) &&
                        segment.startIndex === dayIndexInWeek
                    )
                    .sort((a, b) => a.row - b.row)
                    .map(segment => segment.cardEvent);

                const visibleDayEventKeys = new Set<string>();
                inlineEvents.forEach((event) => {
                    visibleDayEventKeys.add(makeCellEventKey(event, dateKey));
                });
                visibleRibbonSegmentsOnDay.forEach((segment) => {
                    visibleDayEventKeys.add(makeCellEventKey(segment.cardEvent, dateKey));
                });

                const overflowEvents: (Event | MultiDayEventInstance)[] = [];
                const overflowEventKeys = new Set<string>();

                [...overflowEventsBase, ...multiDayOverflow, ...hiddenRibbonEvents].forEach((event) => {
                    if ('originalEventId' in event && event.originalEventId && typeof event.originalEventId === 'string') {
                        if (globallyVisibleMultiDayEvents.has(event.originalEventId) || ribbonEventIds.has(event.originalEventId)) {
                            return;
                        }
                    }
                    if (globallyVisibleMultiDayEvents.has(event.id) || ribbonEventIds.has(event.id)) {
                        return;
                    }

                    const eventKey = makeCellEventKey(event, dateKey);

                    if (visibleDayEventKeys.has(eventKey) || overflowEventKeys.has(eventKey)) {
                        return;
                    }

                    overflowEventKeys.add(eventKey);
                    overflowEvents.push(event);
                });

                return {
                    date: day,
                    dateKey,
                    inlineEvents,
                    overflowEvents,
                    isCurrentMonth: day.getMonth() === initialDate.getMonth(),
                    isToday: day.toDateString() === new Date().toDateString(),
                    ribbonsHeightOnDay
                };
            });

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
        </div>
    );
};

// Export helper components and functions for use in MonthDayPopover
export { MonthInlineEventRow, formatInlineMeta };
export type { InlineEvent };

export default TechCalendarMonthView;
