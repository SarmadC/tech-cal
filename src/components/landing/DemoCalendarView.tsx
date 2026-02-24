'use client';

/**
 * DemoCalendarView — full-fidelity replica of the real calendar month view
 * for use on the landing page.
 *
 * Features:
 *  - CalendarHeader-style header: Today btn, ‹/› chevrons, month+year label,
 *    Month/Week/Day segmented switcher
 *  - Multi-day ribbon overlays in Month view
 *  - Week view via TechCalendarWeekView (production component)
 *  - Day view via TechCalendarDayView (production component)
 *  - Event filtering by title and organization (icon button + popover)
 *  - All CSS from production views reused where possible
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
const DEFAULT_DATE = new Date(2026, 4, 1);

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

const buildMonthDays = (baseDate: Date): Date[] => {
    const firstOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay()); // rewind to Sunday
    return Array.from({ length: 42 }, (_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return d;
    });
};

const computeMonthWeeks = (monthDays: Date[], events: DemoEvent[], viewDate: Date): WeekData[] => {
    const weeks: WeekData[] = [];
    const viewMonth = viewDate.getMonth();

    for (let w = 0; w < 6; w++) {
        const weekDays = monthDays.slice(w * 7, w * 7 + 7);
        const weekStart = weekDays[0];
        const weekEnd = weekDays[6];

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

        weekEvents.sort((a, b) => b.span !== a.span ? b.span - a.span : a.startIdx - b.startIdx);

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

        const daysData: DayData[] = weekDays.map((targetDate, colIdx) => {
            const isToday = toDateKey(targetDate) === toDateKey(startOfDay(new Date()));
            const isCurrentMonth = targetDate.getMonth() === viewMonth;

            const slots: SlotItem[] = [];
            const overflowEvents: DemoEvent[] = [];
            const dayEvents = weekEvents.filter(wev => wev.startIdx <= colIdx && wev.endIdx >= colIdx);

            const maxSlotForDay = Math.min(
                MAX_VISIBLE_SLOTS - 1,
                Math.max(-1, ...dayEvents.map(e => eventSlots.get(e.event)!).filter(s => s < MAX_VISIBLE_SLOTS))
            );

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
                        const accent = getAccentColor(ev);
                        return (
                            <div key={ev.id} className="month-day-popover-event">
                                <button
                                    type="button"
                                    className="month-inline-event w-full"
                                    style={{ ['--event-accent-color' as string]: accent }}
                                    onClick={() => { onEventClick(ev); onClose(); }}
                                >
                                    <span
                                        className="month-inline-event-accent"
                                        style={{ backgroundColor: accent }}
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

// ─── View Context Components ──────────────────────────────────────────────────

const MonthView = ({ weeks, handleEventClick, handleMoreClick }: {
    weeks: WeekData[];
    handleEventClick: (ev: DemoEvent) => void;
    handleMoreClick: (day: DayData, e: React.MouseEvent<HTMLButtonElement>) => void;
}) => (
    <div className="month-grid-weeks flex-1 min-h-0">
        {weeks.map((week, wi) => (
            <div key={wi} className="month-week flex-1 flex flex-col">
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
                                <div className="month-grid-day-number">{day.date.getDate()}</div>
                                <div className="month-grid-day-events" style={{ marginTop: '0px', gap: '5px' }}>
                                    {day.slots.map((item, idx) => (
                                        <div key={idx} className="month-grid-event">
                                            <CellSlot item={item} onClick={handleEventClick} />
                                        </div>
                                    ))}
                                    {day.overflowEvents.length > 0 && (
                                        <button type="button" className="month-grid-more-button" onClick={e => handleMoreClick(day, e)}>
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
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface DemoCalendarViewProps {
    onEventSelect?: (event: Event) => void;
}

export default function DemoCalendarView({ onEventSelect }: DemoCalendarViewProps) {
    const [viewDate, setViewDate] = useState(DEFAULT_DATE);

    const [popover, setPopover] = useState<{
        open: boolean;
        date: Date;
        events: DemoEvent[];
        pos: { x: number; y: number };
    }>({ open: false, date: new Date(), events: [], pos: { x: 0, y: 0 } });

    const goTo = useCallback((dir: 'prev' | 'next' | 'today') => {
        if (dir === 'today') {
            setViewDate(DEFAULT_DATE);
            return;
        }
        setViewDate(prev => {
            const next = new Date(prev);
            next.setMonth(prev.getMonth() + (dir === 'next' ? 1 : -1));
            return next;
        });
    }, []);

    const allEvents = useMemo(() => MOCK_EVENTS as unknown as DemoEvent[], []);

    const monthDays = useMemo(() => buildMonthDays(viewDate), [viewDate]);
    const monthWeeks = useMemo(() => computeMonthWeeks(monthDays, allEvents, viewDate), [monthDays, allEvents, viewDate]);

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
        <div className="demo-calendar-view flex flex-col h-full min-h-0 bg-background-main border border-border-subtle rounded-xl overflow-hidden shadow-2xl">

            {/* ── Header ────────────────────────────────────────────────── */}
            <header className="h-16 flex-shrink-0 px-6 flex items-center justify-between border-b border-border-subtle bg-background-secondary/30 backdrop-blur-xl z-50">

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => goTo('today')}
                        className="text-xs font-bold text-foreground-primary px-4 py-2 rounded-lg border border-border-subtle bg-background-main hover:bg-background-tertiary transition-all shadow-sm active:scale-95"
                    >
                        Today
                    </button>

                    <div className="flex items-center gap-1.5 p-1 bg-background-tertiary/50 rounded-lg">
                        <button
                            type="button"
                            onClick={() => goTo('prev')}
                            className="p-1.5 text-foreground-tertiary hover:text-foreground-primary hover:bg-background-main rounded-md transition-all active:scale-90"
                            aria-label="Previous"
                        >
                            <CaretLeft size={20} weight="bold" />
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo('next')}
                            className="p-1.5 text-foreground-tertiary hover:text-foreground-primary hover:bg-background-main rounded-md transition-all active:scale-90"
                            aria-label="Next"
                        >
                            <CaretRight size={20} weight="bold" />
                        </button>
                    </div>

                    <span className="text-lg font-black text-foreground-primary leading-tight">
                        {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
                    </span>
                </div>
            </header>

            {/* ── Content ────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="custom-month-grid flex-1 flex flex-col min-h-0">
                    <div className="month-grid-header">
                        {DAY_NAMES.map((name, i) => (
                            <div key={name} className={`month-grid-day-header ${i === 0 || i === 6 ? 'weekend' : ''}`}>
                                {name}
                            </div>
                        ))}
                    </div>
                    <MonthView
                        weeks={monthWeeks}
                        handleEventClick={handleEventClick}
                        handleMoreClick={handleMoreClick}
                    />
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
