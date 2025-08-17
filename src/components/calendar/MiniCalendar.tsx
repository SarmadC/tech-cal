'use client';

import { FC, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// The full AppEvent type is no longer needed here.

interface MiniCalendarProps {
    date: Date;
    setDate: (d: Date) => void;
    currentDate: Date;
    // We now accept the pre-computed map, which is much faster.
    monthlyEventCounts?: Map<string, Map<number, number>>;
}

const MiniCalendar: FC<MiniCalendarProps> = ({ date, setDate, currentDate, monthlyEventCounts }) => {
    const monthNames = useMemo(() => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);
    const weekDays = useMemo(() => ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], []);

    // This calculation is now extremely fast and timezone-correct.
    const eventCounts = useMemo(() => {
        if (!monthlyEventCounts) {
            return new Map<number, number>();
        }

        // Create the key for the currently displayed month (e.g., "2025-8" for September).
        // This uses the local month, matching how the map was created in the parent component.
        const year = date.getFullYear();
        const month = date.getMonth();
        const key = `${year}-${month}`;

        // Perform a lightning-fast lookup instead of a slow, error-prone loop.
        return monthlyEventCounts.get(key) || new Map<number, number>();
    }, [monthlyEventCounts, date]);

    const maxEvents = useMemo(() => Math.max(1, ...eventCounts.values()), [eventCounts]);

    const getHeatmapStyle = (count: number) => {
        if (count === 0) return {};
        const intensity = Math.min(count / maxEvents, 1);
        // Using a slightly more vibrant color for the heatmap
        return { backgroundColor: `rgba(59, 130, 246, ${intensity * 0.7 + 0.2})` };
    };

    const daysInMonth = useMemo(() => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonthCount = new Date(year, month + 1, 0).getDate();
        const days = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
        const blanks = Array(firstDay).fill(null);
        return [...blanks, ...days];
    }, [date]);

    const navigateMonth = (dir: number) => {
        setDate(new Date(date.getFullYear(), date.getMonth() + dir, 1));
    };

    return (
        <div className="p-1">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{monthNames[date.getMonth()]} {date.getFullYear()}</h3>
                <div className="flex space-x-1">
                    <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-gray-700 rounded"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-gray-700 rounded"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
                {weekDays.map(d => <div key={d}>{d}</div>)}
                {daysInMonth.map((day, i) => {
                    const count = day ? eventCounts.get(day) || 0 : 0;
                    const isSelected = day === currentDate.getDate() && date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear();
                    const heatmapStyle = getHeatmapStyle(count);
                    const textColor = count > (maxEvents / 2) ? 'text-white' : 'text-gray-300';
                    const hoverClass = count === 0 ? 'hover:bg-gray-700' : '';
                    const selectedClass = isSelected ? 'ring-2 ring-white' : '';

                    return (
                        <button
                            key={i}
                            disabled={!day}
                            onClick={() => day && setDate(new Date(date.getFullYear(), date.getMonth(), day))}
                            className={`w-8 h-8 rounded-lg transition-colors ${!day ? 'cursor-default' : ''} ${textColor} ${hoverClass} ${selectedClass}`}
                            style={heatmapStyle}
                        >
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};
export default MiniCalendar;