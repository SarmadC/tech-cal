'use client';

import { FC, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
    view: _view,
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

                {/* Content */}
                <div className="quick-date-content">
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
                        <button
                            onClick={() => {
                                onDateChange(selectedDate);
                                onClose();
                            }}
                            className="quick-date-picker-confirm"
                        >
                            Done
                        </button>
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
