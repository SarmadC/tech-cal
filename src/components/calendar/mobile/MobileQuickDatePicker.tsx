'use client';

import { FC, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MaterialIcon } from '@/components/ui/Icon';
import { CalendarHeatmap } from '@/components/ui/calendar-heatmap';
import { Event } from '@/types/events';

export interface MobileQuickDatePickerProps {
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

const MobileQuickDatePicker: FC<MobileQuickDatePickerProps> = ({
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
                    <button
                        onClick={onClose}
                        className="quick-date-picker-close"
                        aria-label="Close date picker"
                    >
                        <MaterialIcon name="close" size={20} />
                    </button>
                    <h3 className="quick-date-picker-title">
                        {mode === 'range' ? 'Select Date Range' : 'Jump to Date'}
                    </h3>
                    {/* Today pill removed to match mock */}
                </div>

                {/* Content */}
                <div className="quick-date-content">
                    <div className="quick-date-right">
                        <CalendarHeatmap
                            variantClassnames={[
                                'bg-background-tertiary text-foreground-secondary hover:text-foreground-primary hover:bg-background-elevated',
                                'bg-background-tertiary text-foreground-secondary',
                                'bg-background-tertiary text-foreground-secondary',
                                'bg-background-tertiary text-foreground-secondary',
                                'bg-background-tertiary text-foreground-secondary'
                            ]}
                            weightedDates={eventsByDate}
                            startDate={selectedDate}
                            endDate={selectedDate}
                            selectedDate={mode === 'range' ? undefined : selectedDate ?? undefined}
                            selectedRangeStart={mode === 'range' ? rangeStart ?? undefined : undefined}
                            selectedRangeEnd={mode === 'range' ? rangeEnd ?? undefined : undefined}
                            onDateSelect={(d) => handleDateSelect(d)}
                            onMonthChange={(d) => setSelectedDate(d)}
                            className="quick-date-calendar"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="quick-date-picker-actions">
                    {mode === 'range' ? (
                        <>
                            <button
                                onClick={onClose}
                                className="quick-date-picker-cancel"
                            >
                                Cancel
                            </button>
                            {rangeStart || rangeEnd ? (
                                <button
                                    onClick={() => {
                                        setRangeStart(null);
                                        setRangeEnd(null);
                                        onDateRangeChange?.({ start: null, end: null });
                                    }}
                                    className="quick-date-picker-cancel"
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
                            <button
                                onClick={onClose}
                                className="quick-date-picker-cancel"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    onDateChange(selectedDate);
                                    onClose();
                                }}
                                className="quick-date-picker-confirm"
                            >
                                {`Go to ${view === 'month' ? 'Month' : view === 'week' ? 'Week' : 'Day'}`}
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

export default MobileQuickDatePicker;
