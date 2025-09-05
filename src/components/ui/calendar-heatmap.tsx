"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CalendarHeatmapProps {
  variantClassnames: string[];
  datesPerVariant?: Date[][];
  weightedDates?: { date: Date; weight: number }[];
  className?: string;
  startDate?: Date;
  endDate?: Date;
  selectedDate?: Date;
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
      <div className="flex items-center justify-between mb-3">
        <button 
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          onClick={handlePreviousMonth}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h3 className="text-white font-semibold text-sm">{monthYearHeader}</h3>
        
        <button 
          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
          onClick={handleNextMonth}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {baseCalendarData.map((day, _index) => {
          const isInRange = day.isInRange;
          const hasWeight = day.weight > 0;
          const variantIndex = Math.min(day.variant, variantClassnames.length - 1);
          const isSelected = selectedDateString ? day.date.toDateString() === selectedDateString : false;
          
          // Create descriptive text for accessibility
          const eventsText = day.weight === 1 ? 'event' : 'events';
          const selectedText = isSelected ? ' (Selected)' : '';
          const todayText = day.isToday ? ' (Today)' : '';
          // Use consistent date format to prevent hydration mismatch
          const dateString = day.date.toISOString().split('T')[0]; // YYYY-MM-DD format
          const ariaLabel = `${dateString}: ${day.weight} ${eventsText}${selectedText}${todayText}`;
          
          return (
            <button
              key={day.key}
              onClick={() => handleDateClick(day.date)}
              className={cn(
                "aspect-square rounded-md transition-all duration-200 cursor-pointer",
                "flex items-center justify-center text-xs font-medium",
                isInRange ? (
                  hasWeight ? 
                    `event-density-${variantIndex}` : 
                    "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
                ) : "bg-transparent text-gray-600 hover:text-gray-400",
                // Today's date: subtle blue ring
                day.isToday && !isSelected && "ring-1 ring-blue-400 ring-opacity-40",
                // Selected date: solid background with border
                isSelected && "bg-yellow-500/20 border-2 border-yellow-400 font-bold text-yellow-100",
                // Both today and selected: special treatment
                day.isToday && isSelected && "bg-yellow-500/30 border-2 border-yellow-400 ring-1 ring-blue-400 ring-opacity-60 font-bold text-yellow-100"
              )}
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
              {day.dayNumber}
            </button>
          );
        })}
      </div>
    </div>
  );
});