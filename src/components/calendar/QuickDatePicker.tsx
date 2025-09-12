'use client';

import { FC, useState, useRef, useEffect, useCallback } from 'react';
import { formatDate } from '@/utils/dateUtils';
import { MaterialIcon } from '@/components/ui/Icon';
import { CalendarHeatmap } from '@/components/ui/calendar-heatmap';

export interface QuickDatePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    view: 'month' | 'week' | 'day';
    isOpen: boolean;
    onClose: () => void;
}

const QuickDatePicker: FC<QuickDatePickerProps> = ({
    currentDate,
    onDateChange,
    view,
    isOpen,
    onClose
}) => {
    const [selectedDate, setSelectedDate] = useState(currentDate);
    const [rangeStart, setRangeStart] = useState<Date | null>(null);
    const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [direction, setDirection] = useState<'prev' | 'next' | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [inputValue, setInputValue] = useState('');
    const [parsedInputDate, setParsedInputDate] = useState<Date | null>(null);

    // Update selected date when currentDate changes
    useEffect(() => {
        setSelectedDate(currentDate);
    }, [currentDate]);

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
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 0);
        }
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
            const map: Record<string, number> = { sun:0,sunday:0, mon:1,monday:1, tue:2,tuesday:2, wed:3,wednesday:3, thu:4,thursday:4, fri:5,friday:5, sat:6,saturday:6 };
            const target = map[token];
            const d = clone(today);
            const diff = (7 + target - d.getDay()) % 7 || 7;
            d.setDate(d.getDate() + diff);
            return d;
        }

        // Month name patterns like "Sep 11 [2025]" or "11 Sep [2025]"
        const monthMap: Record<string, number> = { jan:0,january:0, feb:1,february:1, mar:2,march:2, apr:3,april:3, may:4, jun:5,june:5, jul:6,july:6, aug:7,august:7, sep:8,sept:8,september:8, oct:9,october:9, nov:10,november:10, dec:11,december:11 };
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

    const _navigateDate = useCallback((direction: 'prev' | 'next') => {
        if (isAnimating) return;

        setDirection(direction);
        setIsAnimating(true);

        const newDate = new Date(selectedDate);
        
        switch (view) {
            case 'month':
                newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
                break;
            case 'week':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
                break;
            case 'day':
                newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
                break;
        }

        setSelectedDate(newDate);

        // Reset animation state after transition
        setTimeout(() => {
            setIsAnimating(false);
            setDirection(null);
        }, 300);
    }, [selectedDate, view, isAnimating]);

    const handleDateSelect = useCallback((date: Date) => {
        // Range selection logic: first click sets start, second sets end
        if (!rangeStart || (rangeStart && rangeEnd)) {
            setRangeStart(date);
            setRangeEnd(null);
            setSelectedDate(date);
            return;
        }
        if (rangeStart && !rangeEnd) {
            if (date < rangeStart) {
                setRangeEnd(rangeStart);
                setRangeStart(date);
                setSelectedDate(date);
            } else {
                setRangeEnd(date);
                setSelectedDate(date);
            }
            return;
        }
    }, [rangeStart, rangeEnd]);

    const _goToToday = useCallback(() => {
        const today = new Date();
        setSelectedDate(today);
        setRangeStart(today);
        setRangeEnd(today);
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

    if (!isOpen) return null;

    return (
        <div className="quick-date-picker-overlay">
            <div 
                ref={pickerRef}
                className={`quick-date-picker ${isAnimating ? 'animating' : ''} ${direction ? `slide-${direction}` : ''}`}
            >
                {/* Header */}
                <div className="quick-date-picker-header">
                    <button
                        onClick={onClose}
                        className="quick-date-picker-close"
                        aria-label="Close date picker"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                    <h3 className="quick-date-picker-title">Jump to Date</h3>
                    {/* Today pill removed to match mock */}
                </div>

                {/* Content: Presets (left) + Calendar (right) */}
                <div className="quick-date-content">
                    <div className="quick-date-left">
                        {/* Manual entry */}
                        <div className="quick-date-manual">
                            <label htmlFor="quick-date-input" className="quick-date-section-title">Type a date</label>
                            <input
                                id="quick-date-input"
                                ref={inputRef}
                                type="text"
                                className="quick-date-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && parsedInputDate) {
                                        handleDateSelect(parsedInputDate);
                                    }
                                }}
                                aria-describedby="quick-date-help"
                            />
                            <div id="quick-date-help" className={`quick-date-hint ${parsedInputDate ? 'valid' : (inputValue ? 'invalid' : '')}`}>
                                {parsedInputDate
                                    ? `Will go to ${formatDate(parsedInputDate)}`
                                    : (inputValue ? 'Unrecognized date. Try YYYY-MM-DD, "next Tue", or "in 2 weeks".' : 'Enter a date or phrase.')}
                            </div>
                        </div>

                        {/* Quick presets */}
                        <div className="quick-date-options">
                            <h4 className="quick-date-section-title">Quick Select</h4>
                            <div className="quick-date-list">
                                {(() => {
                                    const presets = [
                                        { label: 'Today', fn: () => new Date(), key: 'today' },
                                        { label: 'Yesterday', fn: () => { const d = new Date(); d.setDate(d.getDate() - 1); return d; }, key: 'yesterday' },
                                        { label: 'This week', fn: () => selectedDate, key: 'this-week' },
                                        { label: 'Last week', fn: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d; }, key: 'last-week' },
                                        { label: 'This month', fn: () => { const d = new Date(); d.setDate(1); return d; }, key: 'this-month' },
                                        { label: 'Last month', fn: () => { const d = new Date(); d.setMonth(d.getMonth() - 1, 1); return d; }, key: 'last-month' },
                                        { label: 'This year', fn: () => { const d = new Date(); d.setMonth(0, 1); return d; }, key: 'this-year' },
                                        { label: 'Last year', fn: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1, 0, 1); return d; }, key: 'last-year' },
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
                                            <MaterialIcon name="chevron_right" size={16} />
                                        </button>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>

                    <div className="quick-date-right">
                        <CalendarHeatmap
                            variantClassnames={[
                                'bg-background-tertiary text-foreground-secondary hover:text-foreground-primary hover:bg-background-elevated',
                                'bg-background-tertiary text-foreground-secondary',
                                'bg-background-tertiary text-foreground-secondary',
                                'bg-background-tertiary text-foreground-secondary',
                                'bg-background-tertiary text-foreground-secondary'
                            ]}
                            weightedDates={[]}
                            startDate={selectedDate}
                            endDate={selectedDate}
                            selectedDate={selectedDate}
                            selectedRangeStart={rangeStart ?? undefined}
                            selectedRangeEnd={rangeEnd ?? undefined}
                            onDateSelect={(d) => handleDateSelect(d)}
                            onMonthChange={(d) => setSelectedDate(d)}
                            className="quick-date-calendar"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="quick-date-picker-actions">
                    <button
                        onClick={onClose}
                        className="quick-date-picker-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            const next = parsedInputDate || (rangeStart && rangeEnd ? rangeStart : selectedDate);
                            const finalDate = next || selectedDate;
                            onDateChange(finalDate);
                            onClose();
                        }}
                        className="quick-date-picker-confirm"
                        disabled={(!!inputValue && !parsedInputDate) || (!!rangeStart && !rangeEnd && !parsedInputDate)}
                    >
                        {rangeStart && rangeEnd ? 'Go to Range' : `Go to ${view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickDatePicker;
