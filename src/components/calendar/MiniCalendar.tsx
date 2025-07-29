// src/components/calendar/MiniCalendar.tsx
'use client';

import { FC, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppEvent } from '@/types';

// Props remain the same
interface MiniCalendarProps {
    date: Date;
    setDate: (d: Date) => void;
    events: AppEvent[];
    currentDate: Date;
}

const MiniCalendar: FC<MiniCalendarProps> = ({ date, setDate, events, currentDate }) => {
    // ... (All the code from the original MiniCalendar component)
    const monthNames = useMemo(() => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], []);
    const weekDays = useMemo(() => ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'], []);

    const eventCounts = useMemo(() => {
        const counts = new Map<number, number>();
        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();

        for (const event of events) {
            const eventDate = new Date(event.startTime);
            if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
                const day = eventDate.getDate();
                counts.set(day, (counts.get(day) || 0) + 1);
            }
        }
        return counts;
    }, [events, date]);

    const maxEvents = useMemo(() => Math.max(1, ...eventCounts.values()), [eventCounts]);

    const getHeatmapStyle = (count: number) => {
        if (count === 0) return {};
        const intensity = Math.min(count / maxEvents, 1);
        return { backgroundColor: `rgba(59, 130, 246, ${intensity * 0.8 + 0.1})` };
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
                    const textColor = count > (maxEvents / 2) ? 'text-white' : '';
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