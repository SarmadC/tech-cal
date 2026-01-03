"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MaterialIcon } from '@/components/ui/Icon';

interface CalendarHeatmapProps {
    variantClassnames: string[];
    datesPerVariant?: Date[][];
    weightedDates?: { date: Date; weight: number }[];
    className?: string;
    startDate?: Date;
    endDate?: Date;
    selectedDate?: Date;
    selectedRangeStart?: Date;
    selectedRangeEnd?: Date;
    onDateSelect?: (date: Date) => void;
    onMonthChange?: (date: Date) => void;
}

export const CalendarHeatmap = React.memo(function CalendarHeatmap({
    variantClassnames,
    datesPerVariant = [],
    weightedDates = [],
    className,
    startDate,
    endDate,
    selectedDate,
    selectedRangeStart,
    selectedRangeEnd,
    onDateSelect,
    onMonthChange,
}: CalendarHeatmapProps) {
    // Removed isMounted ref - no longer needed for performance

    // Default to last 365 days if no dates provided
    const _defaultEndDate = endDate || new Date();

    const [currentMonth, setCurrentMonth] = React.useState(() => {
        // Use the startDate if provided, otherwise use current date
        return startDate || new Date();
    });

    // Sync internal month state with external startDate prop (only when startDate changes)
    const prevStartDateRef = React.useRef<Date | null>(null);
    React.useEffect(() => {
        if (startDate && (!prevStartDateRef.current || startDate.getTime() !== prevStartDateRef.current.getTime())) {
            const startDateMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            if (startDateMonth.getTime() !== currentMonthStart.getTime()) {
                setCurrentMonth(new Date(startDate));
            }
            prevStartDateRef.current = new Date(startDate);
        }
    }, [startDate, currentMonth]);

    // Navigation handlers - memoized for performance
    const handlePreviousMonth = React.useCallback(() => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() - 1);
        setCurrentMonth(newDate);
        onMonthChange?.(newDate);
    }, [currentMonth, onMonthChange]);

    const handleNextMonth = React.useCallback(() => {
        const newDate = new Date(currentMonth);
        newDate.setMonth(newDate.getMonth() + 1);
        setCurrentMonth(newDate);
        onMonthChange?.(newDate);
    }, [currentMonth, onMonthChange]);

    const handleDateClick = React.useCallback((date: Date) => {
        onDateSelect?.(date);
    }, [onDateSelect]);

    // Create a map of dates to their weights/variants
    const dateMap = React.useMemo(() => {
        const map = new Map<string, { weight: number; variant: number }>();

        // Process datesPerVariant
        datesPerVariant.forEach((dates, variantIndex) => {
            dates.forEach(date => {
                const key = date.toISOString().split('T')[0];
                map.set(key, { weight: 1, variant: variantIndex });
            });
        });

        // Process weightedDates
        weightedDates.forEach(({ date, weight }) => {
            const key = date.toISOString().split('T')[0];
            const existing = map.get(key);
            if (existing) {
                map.set(key, { weight: Math.max(existing.weight, weight), variant: existing.variant });
            } else {
                // Determine variant based on weight (event count)
                let variant = 0;
                if (weight >= 5) {
                    variant = 4; // Darkest blue
                } else if (weight >= 3) {
                    variant = 3; // Darker blue
                } else if (weight >= 2) {
                    variant = 2; // Medium blue
                } else if (weight >= 1) {
                    variant = 1; // Light blue
                } else {
                    variant = 0; // Gray (no events)
                }

                map.set(key, { weight, variant: Math.min(variant, variantClassnames.length - 1) });
            }
        });
        return map;
    }, [datesPerVariant, weightedDates, variantClassnames.length]);

    // Generate calendar grid - separate data from selection for performance
    const baseCalendarData = React.useMemo(() => {
        const data = [];
        const currentDate = new Date(currentMonth);
        const today = new Date();
        const todayString = today.toDateString();

        // Get the first day of the month and adjust to start on Sunday
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const startDay = firstDay.getDay();
        const adjustedStart = new Date(firstDay);
        adjustedStart.setDate(firstDay.getDate() - startDay);

        // Generate 6 weeks (42 days) for a complete calendar grid
        const totalDays = 42;

        for (let i = 0; i < totalDays; i++) {
            const date = new Date(adjustedStart);
            date.setDate(adjustedStart.getDate() + i);

            const key = date.toISOString().split('T')[0];
            const dateInfo = dateMap.get(key);
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const dateString = date.toDateString();

            data.push({
                date,
                key,
                weight: dateInfo?.weight || 0,
                variant: dateInfo?.variant || 0,
                isInRange: isCurrentMonth,
                isToday: dateString === todayString,
                dayNumber: date.getDate(),
            });
        }

        return data;
    }, [currentMonth, dateMap]); // Removed selectedDate dependency!

    // Only calculate selection state separately to avoid full re-render
    const selectedDateString = React.useMemo(() => selectedDate?.toDateString(), [selectedDate]);

    // Generate month/year header
    const monthYearHeader = React.useMemo(() => {
        return currentMonth.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
    }, [currentMonth]);

    // Remove loading state to prevent skeleton on month changes
    // The calendar data generation is now fast enough to render immediately

    return (
        <div className={cn("calendar-heatmap", className)}>
            {/* Month/Year Header */}
            {/* Month/Year Header */}
            <div className="flex items-center justify-center relative mb-5"> {/* Increased margin bottom (~20px) */}
                <button
                    onClick={() => onMonthChange?.(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-background-tertiary text-foreground-tertiary transition-colors absolute left-0"
                >
                    <MaterialIcon name="chevron_left" size={18} />
                </button>

                <h2 className="text-sm font-semibold text-foreground-primary tracking-wide uppercase">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>

                <button
                    onClick={() => onMonthChange?.(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-background-tertiary text-foreground-tertiary transition-colors absolute right-0"
                >
                    <MaterialIcon name="chevron_right" size={18} />
                </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-0 mb-3"> {/* Increased margin bottom (~12px) */}
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-[10px] font-medium text-foreground-tertiary opacity-60 uppercase tracking-wider h-6 flex items-center justify-center">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0" style={{ rowGap: '2px' }}>
                {baseCalendarData.map((day, _index) => {
                    const isInRange = day.isInRange;
                    const hasWeight = day.weight > 0;
                    // const variantIndex = Math.min(day.variant, variantClassnames.length - 1);
                    const isSelected = selectedDateString ? day.date.toDateString() === selectedDateString : false;
                    const isRangeStart = selectedRangeStart ? day.date.toDateString() === selectedRangeStart.toDateString() : false;
                    const isRangeEnd = selectedRangeEnd ? day.date.toDateString() === selectedRangeEnd.toDateString() : false;
                    const inRange = selectedRangeStart && selectedRangeEnd
                        ? (() => {
                            const start = new Date(selectedRangeStart.getFullYear(), selectedRangeStart.getMonth(), selectedRangeStart.getDate());
                            const end = new Date(selectedRangeEnd.getFullYear(), selectedRangeEnd.getMonth(), selectedRangeEnd.getDate());
                            const dayDate = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate());
                            return dayDate > start && dayDate < end; // Strictly between
                        })()
                        : false;

                    // Create descriptive text for accessibility
                    const eventsText = day.weight === 1 ? 'event' : 'events';
                    const selectedText = isSelected || isRangeStart || isRangeEnd ? ' (Selected)' : '';
                    const todayText = day.isToday ? ' (Today)' : '';
                    // Use consistent date format to prevent hydration mismatch
                    const dateString = day.date.toISOString().split('T')[0]; // YYYY-MM-DD format
                    const ariaLabel = `${dateString}: ${day.weight} ${eventsText}${selectedText}${todayText}`;

                    return (
                        <button
                            key={day.key}
                            onClick={() => handleDateClick(day.date)}
                            className={cn(
                                "relative w-full aspect-square transition-all duration-200 cursor-pointer",
                                "flex items-center justify-center text-[13px] font-normal", // Smaller, cleaner font
                                // Base text color
                                isInRange ? "text-foreground-secondary" : "text-foreground-tertiary opacity-40",
                                // Hover effect (only if not selected/range)
                                !isSelected && !isRangeStart && !isRangeEnd && !inRange && "hover:bg-background-tertiary hover:text-foreground-primary rounded-full",
                                // Selection shapes
                                (isSelected || isRangeStart || isRangeEnd) && "rounded-full z-10",
                                // In-range shape
                                inRange && "rounded-none"
                            )}
                            style={{
                                // Range highlight (intermediate days)
                                ...(inRange && {
                                    backgroundColor: 'rgba(94, 106, 210, 0.15)',
                                    color: '#EEEEEE',
                                }),
                                // Start/End or Single Selection
                                ...((isSelected || isRangeStart || isRangeEnd) && {
                                    backgroundColor: '#5E6AD2',
                                    color: '#FFFFFF',
                                    fontWeight: 500,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                }),
                                // Today indicator (small dot below if not selected) -- changed from border
                                ...(day.isToday && !isSelected && !isRangeStart && !isRangeEnd && {
                                    color: '#5E6AD2',
                                    fontWeight: 600
                                })
                            }}
                            aria-label={ariaLabel}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleDateClick(day.date);
                                }
                            }}
                            title={ariaLabel}
                        >
                            <span>{day.dayNumber}</span>

                            {/* Event indicator dots */}
                            {hasWeight && !isSelected && !isRangeStart && !isRangeEnd && (
                                <span
                                    className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full w-1 h-1"
                                    style={{
                                        backgroundColor: day.weight >= 4
                                            ? '#5E6AD2'
                                            : 'var(--foreground-tertiary)',
                                        opacity: 0.5
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});