'use client';

import { FC, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { formatDate } from '@/utils/dateUtils';
import { MaterialIcon } from '@/components/ui/Icon';
import { CalendarHeatmap } from '@/components/ui/calendar-heatmap';
import { Event } from '@/types/events';

export interface QuickDatePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'month' | 'week' | 'day';
    isOpen: boolean;
    onClose: () => void;
    events?: Event[];
    // Range mode props
    mode?: 'single' | 'range';
    dateRange?: { start: Date | null; end: Date | null };
    onDateRangeChange?: (range: { start: Date | null; end: Date | null }) => void;
}

const QuickDatePicker: FC<QuickDatePickerProps> = ({
    currentDate,
    onDateChange,
    view,
    isOpen,
    onClose,
    events = [],
    mode = 'single',
    dateRange,
    onDateRangeChange
}) => {
    const [selectedDate, setSelectedDate] = useState(currentDate);
    const [isAnimating, setIsAnimating] = useState(false);
    const [direction, setDirection] = useState<'prev' | 'next' | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [inputValue, setInputValue] = useState('');
    const [parsedInputDate, setParsedInputDate] = useState<Date | null>(null);

    // Range mode state
    const [rangeStart, setRangeStart] = useState<Date | null>(dateRange?.start || null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(dateRange?.end || null);

    // Update selected date when currentDate changes
    useEffect(() => {
        setSelectedDate(currentDate);
    }, [currentDate]);

    // Update range state when dateRange prop changes
    useEffect(() => {
        if (mode === 'range' && dateRange) {
            setRangeStart(dateRange.start);
            setRangeEnd(dateRange.end);
        }
    }, [mode, dateRange]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    // Autofocus input when opened
    useEffect(() => {
        if (!isOpen) {
            if (focusTimeoutRef.current) {
                clearTimeout(focusTimeoutRef.current);
                focusTimeoutRef.current = null;
            }
            return;
        }

        focusTimeoutRef.current = setTimeout(() => inputRef.current?.focus(), 0);
        return () => {
            if (focusTimeoutRef.current) {
                clearTimeout(focusTimeoutRef.current);
                focusTimeoutRef.current = null;
            }
        };
    }, [isOpen]);

    // Parse manual input into a Date
    const parseQuickDate = useCallback((raw: string, base: Date): Date | null => {
        if (!raw) return null;
        const s = raw.trim().toLowerCase();
        if (!s) return null;

        const clone = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const today = clone(base);

        // YYYY-MM-DD
        const iso = s.match(/^\d{4}-\d{2}-\d{2}$/);
        if (iso) {
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        }

        // MM/DD[/YYYY]
        const mmdd = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (mmdd) {
            const m = parseInt(mmdd[1], 10) - 1;
            const day = parseInt(mmdd[2], 10);
            const y = mmdd[3] ? (mmdd[3].length === 2 ? 2000 + parseInt(mmdd[3], 10) : parseInt(mmdd[3], 10)) : today.getFullYear();
            const d = new Date(y, m, day);
            return isNaN(d.getTime()) ? null : d;
        }

        // Today / Tomorrow / Yesterday
        if (s === 'today') return today;
        if (s === 'tomorrow') { const d = clone(today); d.setDate(d.getDate() + 1); return d; }
        if (s === 'yesterday') { const d = clone(today); d.setDate(d.getDate() - 1); return d; }

        // In N days/weeks/months
        const inMatch = s.match(/^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/);
        if (inMatch) {
            const n = parseInt(inMatch[1], 10);
            const unit = inMatch[2];
            const d = clone(today);
            if (unit.startsWith('day')) d.setDate(d.getDate() + n);
            else if (unit.startsWith('week')) d.setDate(d.getDate() + n * 7);
            else if (unit.startsWith('month')) d.setMonth(d.getMonth() + n);
            return d;
        }

        // Next week / next month
        if (s === 'next week') { const d = clone(today); d.setDate(d.getDate() + 7); return d; }
        if (s === 'next month') { const d = clone(today); d.setMonth(d.getMonth() + 1); return d; }

        // Next <weekday>
        // weekdays map is inlined below to avoid unused var lint
        const nextWd = s.match(/^next\s+(sun|sunday|mon|monday|tue|tuesday|wed|wednesday|thu|thursday|fri|friday|sat|saturday)$/);
        if (nextWd) {
            const token = nextWd[1];
            const map: Record<string, number> = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
            const target = map[token];
            const d = clone(today);
            const diff = (7 + target - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + diff);
            return d;
        }

        // Month name patterns like "Sep 11 [2025]" or "11 Sep [2025]"
        const monthMap: Record<string, number> = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };
        const mdy = s.match(/^([a-zA-Z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
        if (mdy && monthMap[mdy[1].toLowerCase()] !== undefined) {
            const m = monthMap[mdy[1].toLowerCase()];
            const day = parseInt(mdy[2], 10);
            const y = mdy[3] ? parseInt(mdy[3], 10) : today.getFullYear();
            const d = new Date(y, m, day);
            return isNaN(d.getTime()) ? null : d;
        }
        const dmy = s.match(/^(\d{1,2})\s+([a-zA-Z]+)(?:,?\s*(\d{4}))?$/);
        if (dmy && monthMap[dmy[2].toLowerCase()] !== undefined) {
            const m = monthMap[dmy[2].toLowerCase()];
            const day = parseInt(dmy[1], 10);
            const y = dmy[3] ? parseInt(dmy[3], 10) : today.getFullYear();
            const d = new Date(y, m, day);
            return isNaN(d.getTime()) ? null : d;
        }

        // Fallback native parse
        const fallback = new Date(raw);
        return isNaN(fallback.getTime()) ? null : fallback;
    }, []);

    useEffect(() => {
        if (!inputValue) { setParsedInputDate(null); return; }
        const parsed = parseQuickDate(inputValue, new Date());
        setParsedInputDate(parsed);
    }, [inputValue, parseQuickDate]);

    const _navigateDate = useCallback((action: 'prev-day' | 'next-day' | 'prev-week' | 'next-week' | 'prev-month' | 'next-month') => {
        const newDate = new Date(selectedDate);

        switch (action) {
            case 'prev-day': newDate.setDate(newDate.getDate() - 1); break;
            case 'next-day': newDate.setDate(newDate.getDate() + 1); break;
            case 'prev-week': newDate.setDate(newDate.getDate() - 7); break;
            case 'next-week': newDate.setDate(newDate.getDate() + 7); break;
            case 'prev-month': newDate.setMonth(newDate.getMonth() - 1); break;
            case 'next-month': newDate.setMonth(newDate.getMonth() + 1); break;
        }

        setSelectedDate(newDate);
        // We do not set isAnimating/direction here to keep it snappy for keyboard users
        // setDirection(action.includes('prev') ? 'prev' : 'next');
    }, [selectedDate]);

    const handleDateSelect = useCallback((date: Date) => {
        if (mode === 'range') {
            // Range selection logic: first click sets start, second click sets end
            const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const normalizedStart = rangeStart ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()) : null;
            const normalizedEnd = rangeEnd ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate()) : null;

            if (!normalizedStart || (normalizedStart && normalizedEnd)) {
                // Start new range
                setRangeStart(normalizedDate);
                setRangeEnd(null);
            } else if (normalizedStart && !normalizedEnd) {
                // Set end date
                if (normalizedDate.getTime() === normalizedStart.getTime()) {
                    // Same date clicked - clear range
                    setRangeStart(null);
                    setRangeEnd(null);
                } else if (normalizedDate < normalizedStart) {
                    // If clicked date is before start, swap them
                    setRangeEnd(normalizedStart);
                    setRangeStart(normalizedDate);
                } else {
                    setRangeEnd(normalizedDate);
                }
            }
            setSelectedDate(date);
        } else {
            // Single date mode
            setSelectedDate(date);
            onDateChange(date);
            onClose();
        }
    }, [mode, rangeStart, rangeEnd, onDateChange, onClose]);

    // Handle keyboard navigation for dates
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Only capture navigation keys if we aren't typing in the input
            if (document.activeElement === inputRef.current) return;

            const shift = e.shiftKey;

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    _navigateDate('prev-day');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    _navigateDate('next-day');
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    _navigateDate('prev-week');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    _navigateDate('next-week');
                    break;
                case 'Enter':
                    e.preventDefault();
                    handleDateSelect(selectedDate);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, selectedDate, _navigateDate, handleDateSelect]);

    // Keep the original button handler for reference or update it if used by UI buttons
    const handleMonthNav = useCallback((dir: 'prev' | 'next') => {
        if (isAnimating) return;
        setDirection(dir);
        setIsAnimating(true);
        _navigateDate(dir === 'next' ? 'next-month' : 'prev-month');
        setTimeout(() => { setIsAnimating(false); setDirection(null); }, 300);
    }, [_navigateDate, isAnimating]);

    const _goToToday = useCallback(() => {
        const today = new Date();
        setSelectedDate(today);
    }, []);

    const _formatDateDisplay = (date: Date) => {
        switch (view) {
            case 'month':
                return date.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                });
            case 'week':
                const startOfWeek = new Date(date);
                const dayOfWeek = startOfWeek.getDay();
                const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                startOfWeek.setDate(startOfWeek.getDate() + daysToMonday);

                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);

                return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            case 'day':
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                });
            default:
                return date.toLocaleDateString('en-US');
        }
    };

    const _generateQuickDates = () => {
        const dates = [];
        const today = new Date();

        // Add today
        dates.push({ date: new Date(today), label: 'Today', isToday: true });

        // Add tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        dates.push({ date: tomorrow, label: 'Tomorrow', isToday: false });

        // Add next week
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        dates.push({ date: nextWeek, label: 'Next Week', isToday: false });

        // Add next month
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        dates.push({ date: nextMonth, label: 'Next Month', isToday: false });

        return { dates, today };
    };

    const eventsByDate = useMemo(() => {
        const dateMap = new Map<string, number>();

        events.forEach(event => {
            const eventDate = new Date(event.startTime);
            const dateKey = eventDate.toISOString().split('T')[0];
            const currentCount = dateMap.get(dateKey) || 0;
            dateMap.set(dateKey, currentCount + 1);
        });

        return Array.from(dateMap.entries()).map(([dateString, count]) => ({
            date: new Date(dateString),
            weight: count
        }));
    }, [events]);

    if (!isOpen) return null;

    const overlayContent = (
        <div className="quick-date-picker-overlay">
            <div
                ref={pickerRef}
                className={`quick-date-picker ${isAnimating ? 'animating' : ''} ${direction ? `slide-${direction}` : ''}`}
            >
                {/* Header */}
                <div className="quick-date-picker-header">
                    <h3 className="quick-date-picker-title">
                        {mode === 'range' ? 'Select Range' : 'Jump to...'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="quick-date-picker-close"
                        aria-label="Close date picker"
                    >
                        <MaterialIcon name="close" size={18} />
                    </button>
                    {/* Today pill removed to match mock */}
                </div>

                {/* Content: Presets (left) + Calendar (right) */}
                <div className="quick-date-content">
                    <div className="quick-date-left">
                        {/* Manual entry */}
                        <div className="quick-date-manual">
                            {/* Removed label for cleaner look, relying on placeholder */}
                            {mode === 'range' && (rangeStart || rangeEnd) && (
                                <div className="mb-2 p-2 rounded text-sm border" style={{
                                    backgroundColor: 'var(--qdp-hover-bg)',
                                    borderColor: 'var(--qdp-border)',
                                    color: 'var(--qdp-text-primary)'
                                }}>
                                    <div className="font-medium mb-1" style={{ fontSize: '0.75rem', opacity: 0.8 }}>SELECTED RANGE</div>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        {rangeStart && rangeEnd
                                            ? `${formatDate(rangeStart)} → ${formatDate(rangeEnd)}`
                                            : rangeStart
                                                ? `Start: ${formatDate(rangeStart)}`
                                                : rangeEnd
                                                    ? `End: ${formatDate(rangeEnd)}`
                                                    : ''}
                                    </div>
                                </div>
                            )}
                            <input
                                id="quick-date-input"
                                ref={inputRef}
                                type="text"
                                className="quick-date-input"
                                value={inputValue}
                                placeholder="Type a date..."
                                onChange={(e) => setInputValue(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && parsedInputDate) {
                                        handleDateSelect(parsedInputDate);
                                        e.stopPropagation(); // Prevent global Enter listener
                                    } else if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
                                        // Allow up/down to escape input and go to list or calendar? 
                                        // For now, let user tab out or click. Keyboard savvy users might expect down to go to calendar.
                                    }
                                }}
                                aria-describedby="quick-date-help"
                            />
                            <div id="quick-date-help" className={`quick-date-hint ${parsedInputDate ? 'valid' : (inputValue ? 'invalid' : '')}`}>
                                {parsedInputDate
                                    ? formatDate(parsedInputDate)
                                    : (inputValue ? 'Invalid date' : '')}
                            </div>
                        </div>

                        {/* Quick presets */}
                        <div className="quick-date-options">
                            <h4 className="quick-date-section-title">Quick Select</h4>
                            <div className="quick-date-list">
                                {(() => {
                                    if (mode === 'range') {
                                        const today = new Date();
                                        const clone = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                        const getWeekRange = (date: Date) => {
                                            const start = new Date(date);
                                            const dayOfWeek = start.getDay();
                                            const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                                            start.setDate(start.getDate() + daysToMonday);
                                            const end = new Date(start);
                                            end.setDate(start.getDate() + 6);
                                            return { start, end };
                                        };
                                        const getMonthRange = (date: Date) => {
                                            const start = new Date(date.getFullYear(), date.getMonth(), 1);
                                            const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
                                            return { start, end };
                                        };

                                        const rangePresets = [
                                            {
                                                label: 'This week',
                                                fn: () => {
                                                    const range = getWeekRange(today);
                                                    setRangeStart(range.start);
                                                    setRangeEnd(range.end);
                                                },
                                                key: 'this-week'
                                            },
                                            {
                                                label: 'Next week',
                                                fn: () => {
                                                    const nextWeek = new Date(today);
                                                    nextWeek.setDate(today.getDate() + 7);
                                                    const range = getWeekRange(nextWeek);
                                                    setRangeStart(range.start);
                                                    setRangeEnd(range.end);
                                                },
                                                key: 'next-week'
                                            },
                                            {
                                                label: 'Next month',
                                                fn: () => {
                                                    const nextMonth = new Date(today);
                                                    nextMonth.setMonth(today.getMonth() + 1);
                                                    const range = getMonthRange(nextMonth);
                                                    setRangeStart(range.start);
                                                    setRangeEnd(range.end);
                                                },
                                                key: 'next-month'
                                            },
                                            {
                                                label: 'Next 3 months',
                                                fn: () => {
                                                    setRangeStart(clone(today));
                                                    const end = clone(today);
                                                    end.setMonth(end.getMonth() + 3);
                                                    setRangeEnd(end);
                                                },
                                                key: 'next-3-months'
                                            },
                                            {
                                                label: 'This year',
                                                fn: () => {
                                                    setRangeStart(new Date(today.getFullYear(), 0, 1));
                                                    setRangeEnd(new Date(today.getFullYear(), 11, 31));
                                                },
                                                key: 'this-year'
                                            },
                                        ];

                                        return rangePresets.map((p) => (
                                            <button
                                                key={p.key}
                                                onClick={p.fn}
                                                className="quick-date-option"
                                            >
                                                <div className="quick-date-option-content">
                                                    <span className="quick-date-option-label">{p.label}</span>
                                                </div>
                                            </button>
                                        ));
                                    } else {
                                        const presets = [
                                            { label: 'Today', fn: () => new Date(), key: 'today' },
                                            { label: 'Tomorrow', fn: () => { const d = new Date(); d.setDate(d.getDate() + 1); return d; }, key: 'tomorrow' },
                                            { label: 'Next week', fn: () => { const d = new Date(); d.setDate(d.getDate() + 7); return d; }, key: 'next-week' },
                                            { label: 'Next month', fn: () => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d; }, key: 'next-month' },
                                            // { label: 'This week', fn: () => selectedDate, key: 'this-week' }, // Removed redundant/ambiguous single date
                                            { label: 'Yesterday', fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; }, key: 'yesterday' },
                                        ];
                                        return presets.map((p) => (
                                            <button
                                                key={p.key}
                                                onClick={() => handleDateSelect(p.fn())}
                                                className={`quick-date-option ${p.key === 'today' ? 'today' : ''}`}
                                            >
                                                <div className="quick-date-option-content">
                                                    <span className="quick-date-option-label">{p.label}</span>
                                                </div>
                                            </button>
                                        ));
                                    }
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="quick-date-right">
                        <CalendarHeatmap
                            variantClassnames={[]}
                            weightedDates={eventsByDate}
                            startDate={selectedDate}
                            endDate={selectedDate}
                            selectedDate={mode === 'range' ? undefined : selectedDate ?? undefined}
                            selectedRangeStart={mode === 'range' ? rangeStart ?? undefined : undefined}
                            selectedRangeEnd={mode === 'range' ? rangeEnd ?? undefined : undefined}
                            onDateSelect={(d) => handleDateSelect(d)}
                            onMonthChange={(d) => handleMonthNav(d < selectedDate ? 'prev' : 'next')}
                            className="quick-date-calendar"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="quick-date-picker-actions">
                    {mode === 'range' ? (
                        <>
                            {rangeStart || rangeEnd ? (
                                <button
                                    onClick={() => {
                                        setRangeStart(null);
                                        setRangeEnd(null);
                                        onDateRangeChange?.({ start: null, end: null });
                                    }}
                                    className="quick-date-picker-cancel"
                                    style={{ display: 'inline-block', background: 'transparent', border: 'none', color: 'var(--qdp-text-secondary)', marginRight: 'auto' }}
                                >
                                    Clear
                                </button>
                            ) : null}
                            <button
                                onClick={() => {
                                    if (onDateRangeChange) {
                                        onDateRangeChange({ start: rangeStart, end: rangeEnd });
                                    }
                                    onClose();
                                }}
                                className="quick-date-picker-confirm"
                            >
                                Apply Range
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Single mode: often clicking a date auto-closes, so we only need 'Go' if manual input is typed but not entered? 
                                Or we can keep it for explicit confirmation. 
                                User asked to make 'Apply' smaller or remove cancel. 
                                We removed cancel. We keep 'Go' as a small button. 
                            */}
                            <button
                                onClick={() => {
                                    const finalDate = parsedInputDate || selectedDate;
                                    onDateChange(finalDate);
                                    onClose();
                                }}
                                className="quick-date-picker-confirm"
                                disabled={!!inputValue && !parsedInputDate}
                            >
                                Done
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    // Use portal to render at document.body level to avoid stacking context issues
    if (typeof document !== 'undefined') {
        return createPortal(overlayContent, document.body);
    }

    return overlayContent;
};

export default QuickDatePicker;
