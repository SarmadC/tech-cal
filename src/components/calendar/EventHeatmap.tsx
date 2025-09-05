'use client';

import { FC, useMemo, memo } from 'react';
import { CalendarHeatmap } from '@/components/ui/calendar-heatmap';
// Types handled by context
import { useCalendar } from '@/contexts';

interface EventHeatmapProps {
    className?: string;
}

const EventHeatmap: FC<EventHeatmapProps> = memo(({ 
    className = '' 
}) => {
    // Get data from context, but use selectDate from context
    const { events, currentDate, selectedDate, selectDate } = useCalendar();

    // Process events into weighted dates - heavily optimized
    const weightedDates = useMemo(() => {
        if (!events.length) return [];
        
        const eventCounts = new Map<string, number>();
        const eventsLength = events.length;
        
        // Use for loop for better performance than forEach
        for (let i = 0; i < eventsLength; i++) {
            const event = events[i];
            const eventDate = new Date(event.startTime);
            const key = eventDate.toISOString().split('T')[0];
            eventCounts.set(key, (eventCounts.get(key) || 0) + 1);
        }

        // Pre-allocate array for better performance
        const entries = Array.from(eventCounts.entries());
        const result = new Array(entries.length);
        
        for (let i = 0; i < entries.length; i++) {
            const [dateStr, count] = entries[i];
            result[i] = {
                date: new Date(dateStr),
                weight: count
            };
        }
        
        return result;
    }, [events]);

    // Define color variants based on event density
    const variantClassnames = [
        // No events - gray background
        "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white",
        // 1 event - light blue
        "text-white hover:text-white bg-blue-300 hover:bg-blue-400",
        // 2 events - medium blue
        "text-white hover:text-white bg-blue-500 hover:bg-blue-600", 
        // 3-4 events - darker blue
        "text-white hover:text-white bg-blue-700 hover:bg-blue-800",
        // 5+ events - darkest blue
        "text-white hover:text-white bg-blue-900 hover:bg-blue-950",
    ];

    // Ultra-stable key that never changes to prevent component remounting
    const heatmapKey = useMemo(() => 'stable-heatmap', []);

    // Validate props - moved after all hooks
    if (!currentDate || !(currentDate instanceof Date)) {
        console.error('EventHeatmap: Invalid currentDate prop', currentDate);
        return (
            <div className={`event-heatmap ${className}`}>
                <div className="text-red-500 text-sm">Invalid date provided</div>
            </div>
        );
    }

    // Removed loading state - calendar renders immediately for better UX

    return (
        <div className={`event-heatmap ${className}`}>
            <CalendarHeatmap
                key={heatmapKey}
                variantClassnames={variantClassnames}
                weightedDates={weightedDates}
                startDate={currentDate}
                endDate={currentDate}
                selectedDate={selectedDate || undefined}
                onDateSelect={selectDate}
                onMonthChange={selectDate}
                className="w-full"
            />
        </div>
    );
});

EventHeatmap.displayName = 'EventHeatmap';

export default EventHeatmap;
