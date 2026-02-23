'use client';

/**
 * DemoCalendarView — full-fidelity replica of the real calendar month view
 * for use on the landing page.
 *
 * Features:
 *  - CalendarHeader-style header: Today btn, ‹/› chevrons, month+year label,
 *    Month/Week/Day segmented switcher (Month always active, others tease real UX)
 *  - Multi-day ribbon overlays using the same MonthEventCard via CSS grid
 *    (identical to TechCalendarMonthView's week-level overlay)
 *  - Inline single-day event rows using MonthInlineEventRow styles
 *  - Weekend column tinting (bg-background-secondary/50)
 *  - Today cell highlight (blue ring + number badge)
 *  - +N more overflow popup (MonthDayPopover-style inline popover)
 *  - Organisation logo in ribbon chips
 *  - All CSS from @/app/styles/monthly-view.css reused
 */

import React, {
    useState,
    useMemo,
    useCallback,
    useRef,
    useEffect,
} from 'react';
import Image from 'next/image';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { Event } from '@/types';
import { MOCK_EVENTS } from './MockData';
import '@/app/styles/monthly-view.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

/** May 2026 has the most mock events and is a great first-impression month */
const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 4; // 0-indexed → May

/** Match TechCalendarMonthView constants exactly */
const MAX_VISIBLE_EVENTS_PER_DAY = 3;
const MAX_RIBBON_ROWS = 3;
const DAY_HEADER_HEIGHT = 24;
const DAY_HEADER_GAP = 8;
const MAX_VISIBLE_SLOTS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

type DemoEvent = Event & { careerImpact?: { overall?: number; rationale?: string } };

type ContinuationType = 'single' | 'start' | 'middle' | 'end';

type SlotItem = {
    type: 'event';
    event: DemoEvent;
    continuationType: ContinuationType;
} | {
    type: 'spacer';
};

interface DayData {
    date: Date;
    dateKey: string;
    slots: SlotItem[];
    overflowEvents: DemoEvent[];
    isCurrentMonth: boolean;
    isToday: boolean;
}

interface WeekData {
    days: DayData[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c;
};

const toDateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const diffDays = (later: Date, earlier: Date) =>
    Math.round((later.getTime() - earlier.getTime()) / 86_400_000);

/** Replicate getInlineAccent from TechCalendarMonthView exactly */
const getAccentColor = (event: DemoEvent): string => {
    const cat = event.category?.name?.toLowerCase();
    switch (cat) {
        case 'tech summit':
        case 'summit': return 'var(--color-category-summit, #3b82f6)';
        case 'workshop': return 'var(--color-category-workshop, #8b5cf6)';
        case 'networking': return 'var(--color-category-networking, #10b981)';
        case 'conference': return 'var(--color-category-conference, #0ea5e9)';
        case 'webinar': return 'var(--color-category-webinar, #f97316)';
        case 'startup': return 'var(--color-category-startup, #ec4899)';
        case 'trade show': return 'var(--color-category-trade-show, #6366f1)';
        case 'product launch':
        case 'product': return 'var(--color-category-product-launch, #10b981)';
        case 'training': return 'var(--color-category-training, #14b8a6)';
        default: break;
    }
    if (event.category?.color) return event.category.color;
    return 'var(--accent-primary)';
};



/** Build the 42-cell (6 × 7) day grid for a given year/month. */
const buildMonthDays = (year: number, month: number): Date[] => {
    const firstOfMonth = new Date(year, month, 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay()); // rewind to Sunday
    return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
};

/**
 * Compute all 6 WeekData objects for the displayed month.
 * Replicates the ribbon-allocation logic from TechCalendarMonthView.
 */
const computeWeeks = (monthDays: Date[], events: DemoEvent[], viewMonth: number): WeekData[] => {
    const weeks: WeekData[] = [];

    for (let w = 0; w < 6; w++) {
        const weekDays = monthDays.slice(w * 7, w * 7 + 7);
        const weekStart = weekDays[0];
        const weekEnd = weekDays[6];

        // 1. Gather all events overlapping this week
        const weekEvents: { event: DemoEvent; startIdx: number; endIdx: number; span: number }[] = [];
        for (const ev of events) {
            const evStart = startOfDay(new Date(ev.startTime));
            const evEnd = ev.endTime ? startOfDay(new Date(ev.endTime)) : evStart;
            if (evEnd < weekStart || evStart > weekEnd) continue;

            const segStart = evStart < weekStart ? weekStart : evStart;
            const segEnd = evEnd > weekEnd ? weekEnd : evEnd;

            const startIdx = weekDays.findIndex(d => toDateKey(d) === toDateKey(segStart));
            const endIndex = weekDays.findIndex(d => toDateKey(d) === toDateKey(segEnd));
            const endIdx = endIndex < 0 ? 6 : endIndex;
            const span = endIdx - startIdx + 1;

            weekEvents.push({ event: ev, startIdx, endIdx, span });
        }

        // Sort: longer spans first, earlier start second
        weekEvents.sort((a, b) => b.span !== a.span ? b.span - a.span : a.startIdx - b.startIdx);

        // 2. Assign strictly aligned slots
        const MAX_SLOTS = 15;
        const occupancy: boolean[][] = Array.from({ length: MAX_SLOTS }, () => new Array(7).fill(false));
        const eventSlots = new Map<DemoEvent, number>();

        for (const wev of weekEvents) {
            let placedSlot = 0;
            for (let row = 0; row < MAX_SLOTS; row++) {
                let canPlace = true;
                for (let col = wev.startIdx; col <= wev.endIdx; col++) {
                    if (occupancy[row][col]) {
                        canPlace = false;
                        break;
                    }
                }
                if (canPlace) {
                    placedSlot = row;
                    break;
                }
            }

            for (let col = wev.startIdx; col <= wev.endIdx; col++) {
                occupancy[placedSlot][col] = true;
            }
            eventSlots.set(wev.event, placedSlot);
        }

        // 3. Build DayData
        const daysData: DayData[] = weekDays.map((targetDate, colIdx) => {
            const isToday = toDateKey(targetDate) === toDateKey(startOfDay(new Date()));
            const isCurrentMonth = targetDate.getMonth() === viewMonth;

            const slots: SlotItem[] = [];
            const overflowEvents: DemoEvent[] = [];

            // Find events mapped to this day
            const dayEvents = weekEvents.filter(wev => wev.startIdx <= colIdx && wev.endIdx >= colIdx);

            const maxSlotForDay = Math.min(
                MAX_VISIBLE_SLOTS - 1,
                Math.max(-1, ...dayEvents.map(e => eventSlots.get(e.event)!).filter(s => s < MAX_VISIBLE_SLOTS))
            );

            // Populate slots with either the event or an invisible spacer to preserve alignment
            for (let i = 0; i <= maxSlotForDay; i++) {
                const wev = dayEvents.find(e => eventSlots.get(e.event) === i);
                if (wev) {
                    const evStart = startOfDay(new Date(wev.event.startTime));
                    const evEnd = wev.event.endTime ? startOfDay(new Date(wev.event.endTime)) : evStart;

                    const isActualStart = toDateKey(evStart) === toDateKey(targetDate);
                    const isActualEnd = toDateKey(evEnd) === toDateKey(targetDate);

                    let cType: ContinuationType;
                    if (isActualStart && isActualEnd) cType = 'single';
                    else if (isActualStart) cType = 'start';
                    else if (isActualEnd) cType = 'end';
                    else cType = 'middle';

                    slots.push({ type: 'event', event: wev.event, continuationType: cType });
                } else {
                    slots.push({ type: 'spacer' });
                }
            }

            // Populate overflow for any events assigned to slot index >= MAX_VISIBLE_SLOTS
            for (const wev of dayEvents) {
                if (eventSlots.get(wev.event)! >= MAX_VISIBLE_SLOTS) {
                    overflowEvents.push(wev.event);
                }
            }

            return {
                date: targetDate,
                dateKey: toDateKey(targetDate),
                slots,
                overflowEvents,
                isCurrentMonth,
                isToday,
            };
        });

        weeks.push({ days: daysData });
    }

    return weeks;
};



// ─── Sub-components ───────────────────────────────────────────────────────────

const CellSlot: React.FC<{
    item: SlotItem;
    onClick: (ev: DemoEvent) => void;
}> = ({ item, onClick }) => {
    if (item.type === 'spacer') {
        // Invisible spacer to maintain slot height and prevent "Tetris" misalignments
        return <div aria-hidden="true" style={{ height: '26px' }} />;
    }

    const { event, continuationType } = item;
    const accent = getAccentColor(event);

    const showContent = continuationType === 'start' || continuationType === 'single';

    return (
        <button
            type="button"
            className="month-event-card text-left focus:outline-none"
            data-continuation={continuationType}
            style={{
                ['--event-accent-color' as string]: accent,
            }}
            onClick={(e) => { e.stopPropagation(); onClick(event); }}
            title={event.title}
        >
            <span
                className="month-event-card-accent"
                style={{
                    backgroundColor: accent,
                    display: showContent ? 'block' : 'none'
                }}
                aria-hidden="true"
            />

            {showContent && event.organization?.logo && (
                <div className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded overflow-hidden bg-white/10" style={{ zIndex: 2 }}>
                    <Image
                        src={event.organization.logo}
                        alt=""
                        width={16}
                        height={16}
                        className="object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            )}

            {showContent && (
                <span className="month-event-card-label" style={{ zIndex: 2, paddingLeft: event.organization?.logo ? '0' : '2px' }}>
                    {event.title}
                </span>
            )}
        </button>
    );
};

/** Overflow popover — mirrors MonthDayPopover */
const OverflowPopover: React.FC<{
    date: Date;
    events: DemoEvent[];
    position: { x: number; y: number };
    onClose: () => void;
    onEventClick: (ev: DemoEvent) => void;
}> = ({ date, events, position, onClose, onEventClick }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ top: '0px', left: '0px' });

    useEffect(() => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        let top = position.y + 10;
        let left = position.x - rect.width / 2;
        if (left < 10) left = 10;
        if (left + rect.width > window.innerWidth - 10) left = window.innerWidth - rect.width - 10;
        if (top + rect.height > window.innerHeight - 10) top = position.y - rect.height - 10;
        setPos({ top: `${top}px`, left: `${left}px` });
    }, [position]);

    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handle);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handle);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    const dateStr = date.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
    });

    return (
        <div
            ref={ref}
            className="month-day-popover"
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 1000 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Events for ${dateStr}`}
        >
            <div className="month-day-popover-header">
                <h3 className="month-day-popover-title">{dateStr}</h3>
                <button className="month-day-popover-close" onClick={onClose} type="button" aria-label="Close">×</button>
            </div>
            <div className="month-day-popover-content">
                <div className="month-day-popover-events">
                    {events.map(ev => {
                        return (
                            <div key={ev.id} className="month-day-popover-event">
                                <button
                                    type="button"
                                    className="month-inline-event w-full"
                                    style={{ ['--event-accent-color' as string]: getAccentColor(ev) }}
                                    onClick={() => { onEventClick(ev); onClose(); }}
                                >
                                    <span
                                        className="month-inline-event-accent"
                                        style={{ backgroundColor: getAccentColor(ev) }}
                                        aria-hidden="true"
                                    />
                                    <span className="month-inline-event-content" style={{ flex: 1, minWidth: 0, gap: '4px' }}>
                                        {ev.organization?.logo && (
                                            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded overflow-hidden bg-white/10 flex-shrink-0">
                                                <Image src={ev.organization.logo} alt="" width={14} height={14} className="object-contain"
                                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                            </span>
                                        )}
                                        <span className="month-inline-event-title">{ev.title}</span>
                                    </span>
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface DemoCalendarViewProps {
    onEventSelect?: (event: Event) => void;
}

export default function DemoCalendarView({ onEventSelect }: DemoCalendarViewProps) {
    const [year, setYear] = useState(DEFAULT_YEAR);
    const [month, setMonth] = useState(DEFAULT_MONTH);

    const [popover, setPopover] = useState<{
        open: boolean;
        date: Date;
        events: DemoEvent[];
        pos: { x: number; y: number };
    }>({ open: false, date: new Date(), events: [], pos: { x: 0, y: 0 } });

    const goTo = useCallback((dir: 'prev' | 'next' | 'today') => {
        if (dir === 'today') {
            setYear(DEFAULT_YEAR);
            setMonth(DEFAULT_MONTH);
            return;
        }
        setMonth(m => {
            if (dir === 'prev') {
                if (m === 0) { setYear(y => y - 1); return 11; }
                return m - 1;
            } else {
                if (m === 11) { setYear(y => y + 1); return 0; }
                return m + 1;
            }
        });
    }, []);

    const monthDays = useMemo(() => buildMonthDays(year, month), [year, month]);
    const events = useMemo(() => MOCK_EVENTS as unknown as DemoEvent[], []);
    const weeks = useMemo(() => computeWeeks(monthDays, events, month), [monthDays, events, month]);

    const handleEventClick = useCallback((ev: DemoEvent) => {
        onEventSelect?.(ev as unknown as Event);
    }, [onEventSelect]);

    const handleMoreClick = useCallback((day: DayData, e: React.MouseEvent<HTMLButtonElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setPopover({
            open: true,
            date: day.date,
            events: day.overflowEvents,
            pos: { x: rect.left + rect.width / 2, y: rect.bottom },
        });
    }, []);

    const closePopover = useCallback(() => {
        setPopover(p => ({ ...p, open: false }));
    }, []);

    return (
        <div className="demo-calendar-view flex flex-col h-full min-h-0">

            {/* ── Header ────────────────────────────────────────────────── */}
            <header className="h-14 flex-shrink-0 px-4 flex items-center justify-between border-b border-border-subtle bg-background-secondary/50 backdrop-blur-sm z-50">

                {/* Left group: Today + nav + month label */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => goTo('today')}
                        className="text-xs font-medium text-foreground-secondary hover:text-foreground-primary px-3 py-1.5 rounded-md border border-border-subtle hover:bg-background-tertiary transition-colors shadow-xs"
                    >
                        Today
                    </button>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => goTo('prev')}
                            className="p-1 text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary rounded transition-colors"
                            aria-label="Previous month"
                        >
                            <CaretLeft size={18} weight="bold" />
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo('next')}
                            className="p-1 text-foreground-tertiary hover:text-foreground-primary hover:bg-background-tertiary rounded transition-colors"
                            aria-label="Next month"
                        >
                            <CaretRight size={18} weight="bold" />
                        </button>
                    </div>

                    {/* Month + year */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded hover:bg-background-tertiary transition-colors">
                        <span className="text-sm font-medium text-foreground-primary">
                            {MONTH_NAMES[month]} {year}
                        </span>
                        {/* Dropdown chevron — decorative only */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground-tertiary" aria-hidden="true">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>

                {/* Right group: filter icon + Month/Week/Day switcher */}
                <div className="flex items-center gap-3">


                    {/* Filter icon — decorative only in demo */}
                    <div className="flex items-center justify-center p-1.5 rounded-md text-foreground-tertiary" aria-hidden="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
                            <path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z" />
                        </svg>
                    </div>

                    <div className="h-4 w-[1px] bg-border-subtle mx-1" />

                    {/* View switcher — Month is always "active" in demo */}
                    <div className="flex items-center p-0.5 bg-background-tertiary rounded-lg border border-border-subtle/50">
                        {(['Month', 'Week', 'Day'] as const).map(v => (
                            <div
                                key={v}
                                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${v === 'Month'
                                    ? 'bg-white dark:bg-[#33353A] text-gray-900 dark:text-gray-100 font-bold shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                    : 'font-medium text-foreground-secondary hover:text-foreground-primary'
                                    }`}
                            >
                                {v}
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* ── Calendar grid ──────────────────────────────────────────── */}
            <div className="custom-month-grid flex-1 flex flex-col min-h-0">

                {/* Day-of-week header */}
                <div className="month-grid-header">
                    {DAY_NAMES.map((name, i) => (
                        <div
                            key={name}
                            className={`month-grid-day-header ${i === 0 || i === 6 ? 'weekend' : ''}`}
                        >
                            {name}
                        </div>
                    ))}
                </div>

                {/* Weeks */}
                <div className="month-grid-weeks flex-1 min-h-0">
                    {weeks.map((week, wi) => (
                        <div key={wi} className="month-week flex-1 flex flex-col">

                            {/* ── Day cells ──────────────────────────────── */}
                            <div className="month-week-grid flex-1">
                                {week.days.map((day, di) => {
                                    const isWeekend = di === 0 || di === 6;

                                    return (
                                        <div
                                            key={day.dateKey}
                                            className={[
                                                'month-grid-day flex flex-col',
                                                day.isCurrentMonth ? 'current-month' : 'other-month',
                                                day.isToday ? 'today' : '',
                                                isWeekend ? 'weekend-col' : '',
                                            ].filter(Boolean).join(' ')}
                                        >
                                            <div className="month-grid-day-number">
                                                {day.date.getDate()}
                                            </div>

                                            {/* Strictly Aligned Slots */}
                                            <div
                                                className="month-grid-day-events"
                                                style={{ marginTop: '0px', gap: '5px' }}
                                            >
                                                {day.slots.map((item, idx) => (
                                                    <div key={idx} className="month-grid-event">
                                                        <CellSlot item={item} onClick={handleEventClick} />
                                                    </div>
                                                ))}

                                                {/* +N more */}
                                                {day.overflowEvents.length > 0 && (
                                                    <button
                                                        type="button"
                                                        className="month-grid-more-button"
                                                        onClick={e => handleMoreClick(day, e)}
                                                    >
                                                        +{day.overflowEvents.length} more
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

            {/* ── Overflow Popover ──────────────────────────────────────── */}
            {popover.open && (
                <OverflowPopover
                    date={popover.date}
                    events={popover.events}
                    position={popover.pos}
                    onClose={closePopover}
                    onEventClick={handleEventClick}
                />
            )}
        </div>
    );
}
